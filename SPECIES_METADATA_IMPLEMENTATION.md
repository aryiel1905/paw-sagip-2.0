# Species Metadata Implementation Plan (App + Admin + DB)

## Goal
Replace hardcoded species logic with a database-driven system so:
- Public website uses consistent species classification
- Admin site manages species centrally
- Database is the single source of truth

This supports `Find My Match`, Adoption, and Report flows with the same rules.

## 1) Database Design

### 1.1 Create canonical species table
```sql
create table if not exists public.animal_species (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,          -- e.g. "Dog", "Cat", "Rabbit"
  normalized_name text not null unique,         -- e.g. "dog", "cat", "rabbit"
  is_domestic_adoptable boolean not null default true,
  care_profile text not null default 'standard', -- optional: low|standard|high
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 1.2 Create aliases table (for flexible user input)
```sql
create table if not exists public.animal_species_aliases (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.animal_species(id) on delete cascade,
  alias text not null,
  alias_normalized text not null,
  unique (alias_normalized)
);
```

### 1.3 Link adoption pets to canonical species
```sql
alter table public.adoption_pets
add column if not exists species_id uuid null references public.animal_species(id);

create index if not exists idx_adoption_pets_species_id
  on public.adoption_pets(species_id);
```

### 1.4 (Optional but recommended) Link reports to canonical species
```sql
alter table public.reports
add column if not exists species_id uuid null references public.animal_species(id);

create index if not exists idx_reports_species_id
  on public.reports(species_id);
```

### 1.5 Trigger for `updated_at`
```sql
drop trigger if exists trg_animal_species_updated_at on public.animal_species;
create trigger trg_animal_species_updated_at
before update on public.animal_species
for each row execute function public.fn_set_updated_at();
```

Note: Your current schema already has `public.fn_set_updated_at()`. Reuse it to avoid duplicate utility functions.

### 1.6 RLS and policies for new tables
```sql
alter table public.animal_species enable row level security;
alter table public.animal_species_aliases enable row level security;

-- Public read for active species directory
drop policy if exists animal_species_public_read on public.animal_species;
create policy animal_species_public_read
on public.animal_species
for select
using (active = true);

drop policy if exists animal_species_aliases_public_read on public.animal_species_aliases;
create policy animal_species_aliases_public_read
on public.animal_species_aliases
for select
using (true);
```

Admin CUD policies should match your existing role model (`super-admin` / `barangay-admin`) and be added before shipping admin UI.

## 2) Seed and Backfill

### 2.1 Seed initial canonical species
```sql
insert into public.animal_species (canonical_name, normalized_name, is_domestic_adoptable, sort_order)
values
('Dog', 'dog', true, 1),
('Cat', 'cat', true, 2),
('Bird', 'bird', true, 3),
('Rabbit', 'rabbit', true, 4),
('Hamster', 'hamster', true, 5),
('Guinea Pig', 'guinea pig', true, 6),
('Fish', 'fish', true, 7),
('Turtle', 'turtle', true, 8),
('Snake', 'snake', false, 9),
('Lizard', 'lizard', false, 10),
('Other', 'other', false, 999)
on conflict (normalized_name) do nothing;
```

### 2.2 Seed aliases
```sql
-- Example aliases (add local terms used by your users/admins)
insert into public.animal_species_aliases (species_id, alias, alias_normalized)
select s.id, a.alias, a.alias_normalized
from (
  values
  ('dog', 'Aspin', 'aspin'),
  ('cat', 'Puspin', 'puspin'),
  ('dog', 'Dog', 'dog'),
  ('cat', 'Cat', 'cat')
) as a(norm, alias, alias_normalized)
join public.animal_species s on s.normalized_name = a.norm
on conflict (alias_normalized) do nothing;
```

### 2.3 Backfill adoption_pets.species_id from existing text
```sql
update public.adoption_pets p
set species_id = s.id
from public.animal_species s
where p.species_id is null
  and lower(trim(coalesce(p.species, ''))) = s.normalized_name;
```

Then run a second pass with alias mapping:
```sql
update public.adoption_pets p
set species_id = a.species_id
from public.animal_species_aliases a
where p.species_id is null
  and lower(trim(coalesce(p.species, ''))) = a.alias_normalized;
```

Recommended third pass for patterns like `others;rabbit`:
```sql
update public.adoption_pets p
set species_id = s.id
from public.animal_species s
where p.species_id is null
  and lower(trim(split_part(coalesce(p.species,''), ';', 2))) = s.normalized_name;
```

Apply the same backfill sequence to `public.reports.species_id` if you add that column.

## 3) API Changes

## 3.1 Add species directory endpoint(s)
- `GET /api/species` => returns active species + domestic flags + sort order
- `POST /api/species` (admin only)
- `PATCH /api/species/:id` (admin only)
- `POST /api/species/:id/aliases` (admin only)
- `DELETE /api/species-aliases/:id` (admin only)

## 3.2 Update adoption endpoints

In `src/app/api/adoptions/available/route.ts`:
- join `adoption_pets.species_id -> animal_species`
- return:
  - `species_id`
  - `species` (display/canonical)
  - `is_domestic_adoptable`

Also update trigger/function paths that create adoption rows from reports so `species_id` is copied/resolved:
- `public.fn_reports_auto_promote_before_update()`
- any admin "promote to adoption" API route

## 3.3 Add species resolution utility on server
Create `src/lib/speciesResolver.ts`:
- input: raw species string
- normalize + lookup alias table
- output: `species_id` (or null + reason)

Use this utility in:
- adoption promotion endpoint
- report creation/update endpoint

## 4) Admin Website Workflow

## 4.1 Add “Species Directory” page
Admin features:
- Create/Edit canonical species
- Toggle `is_domestic_adoptable`
- Toggle `active`
- Manage aliases
- Sort order

## 4.1.1 Admin permissions needed
For Species Directory and mapping actions, admin needs:
- `SELECT/INSERT/UPDATE/DELETE` on `animal_species`
- `SELECT/INSERT/UPDATE/DELETE` on `animal_species_aliases`
- `SELECT/UPDATE` on `reports` and `adoption_pets` (`species_id` field)

If admin APIs use service role on server, client-side RLS writes are not required.
If admin writes directly with anon/auth keys, add RLS CUD policies for admin roles.

## 4.2 Add “Unmapped Species Queue”
Show records where:
- `species_id is null`
Allow admin to:
- map to existing canonical species
- or create new species + alias

### 4.2.1 SQL to add queue view
```sql
create or replace view public.v_unmapped_species as
select
  'reports'::text as source_table,
  r.id as source_id,
  r.species as raw_species,
  r.created_at
from public.reports r
where r.species_id is null

union all

select
  'adoption_pets'::text as source_table,
  p.id as source_id,
  p.species as raw_species,
  p.created_at
from public.adoption_pets p
where p.species_id is null;
```

### 4.2.2 Admin queue actions (must implement)
For each row in `v_unmapped_species`, admin UI should provide:
- `Map to existing species`:
  - choose canonical species
  - optional checkbox: `Save "<raw value>" as alias for this species`
- `Create new canonical species`:
  - fields: canonical name, normalized name, domestic toggle, active, sort order
  - optional: create alias from raw value immediately
- `Skip for now` (no write)

### 4.2.3 Admin write behavior
When admin clicks **Map**:
1. Update source row:
   - if `source_table = reports` -> `update reports set species_id = :id where id = :source_id`
   - if `source_table = adoption_pets` -> `update adoption_pets set species_id = :id where id = :source_id`
2. If “Save as alias” checked:
   - insert into `animal_species_aliases(species_id, alias, alias_normalized)`
3. Return refreshed unmapped count.

### 4.2.4 Suggested API endpoints for admin queue
- `GET /api/admin/species/unmapped`
  - returns rows from `v_unmapped_species` + pagination
- `POST /api/admin/species/map`
  - payload: `{ sourceTable, sourceId, speciesId, saveAlias, rawSpecies }`
- `POST /api/admin/species/create-and-map`
  - payload: `{ sourceTable, sourceId, canonicalName, normalizedName, isDomesticAdoptable, saveAlias, rawSpecies }`

## 4.3 Make species required where needed
In adoption promotion flow:
- require `species_id` before moving report -> adoption
- if unresolved, block with clear message

Also add to admin promote form:
- If raw species is unknown, force resolver selection before submit.
- Show warning badge: `Unmapped species` until `species_id` is set.

## 5) Public Website Changes

## 5.1 Report Section
- Use `GET /api/species` for dropdown options (instead of local constants)
- still allow “Other”, but map through alias resolver when possible

## 5.2 Find My Match
- Read `species_id/species` from adoption API
- if policy is “domestic only”, filter with `is_domestic_adoptable = true`
- no hardcoded animal list in frontend

## 5.3 Adoption Browse / Details
- display canonical species label
- keep fallback behavior for legacy rows during migration window

## 6) Validation and Guardrails

- Server-side validation is mandatory:
  - admin routes: role-protected
  - adoption promotion: reject if invalid `species_id`
  - species alias unique on `alias_normalized`
- Keep `species` text for backward compatibility, but treat `species_id` as source of truth.

## 7) Rollout Plan

1. Ship DB tables + seed + backfill
2. Add RLS + SELECT policies for new tables
3. Ship read-only `GET /api/species`
4. Create `v_unmapped_species` view
5. Ship admin Species Directory CRUD + admin CUD policies
6. Ship admin Unmapped Queue + Map actions
7. Update promotion triggers/routes to write `species_id`
8. Update Report + Find My Match to consume API species list
9. Enforce required `species_id` in promote flow
10. Clean legacy rows (target unmapped count = 0)
11. Remove old hardcoded lists after full migration

## 8) Definition of Done

- Species options are managed only in admin, not hardcoded in frontend
- New adoption entries always have valid `species_id`
- Find My Match and Report use same species source
- Admin can resolve unknown species via mapping UI
- Legacy records either mapped or visible in unmapped queue
