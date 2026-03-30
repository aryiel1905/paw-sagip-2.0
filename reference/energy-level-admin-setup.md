# Energy Level Admin Setup

## Purpose

This document defines how `energy_level` should be handled between the main PawSagip app and the admin side.

The goal is to make energy level:

- editable by admins
- stored in a consistent format
- easy to use in `Find My Match`
- easy to display in admin tables and pet detail views

This should be treated as the implementation contract for both sides.

## Recommended Approach

Do not infer energy only from public user input.

Instead:

- admins set the pet's energy level manually
- the value is saved in the database
- the matching flow reads that saved value directly

This is more reliable because admins or shelter/barangay staff can judge actual behavior better than automatic guesses.

## Recommended Database Field

Use a dedicated field on `public.adoption_pets`:

```sql
alter table public.adoption_pets
add column if not exists energy_level smallint;
```

## Value Contract

The stored values should be:

- `1` = Low
- `2` = Medium
- `3` = High

This numeric format is recommended because it makes scoring easier later.

## Optional Constraint

To keep bad values out of the table:

```sql
alter table public.adoption_pets
add constraint adoption_pets_energy_level_check
check (energy_level in (1, 2, 3));
```

If the constraint already exists or your migration flow is strict, use your normal safe migration pattern.

## Admin Side Write Contract

The admin side should allow staff to set:

- `Low`
- `Medium`
- `High`

But it should save numeric values:

- `Low` -> `1`
- `Medium` -> `2`
- `High` -> `3`

## Admin Form UI

### Recommended Field Label

```text
Energy Level
```

### Recommended Input Type

Use a select/dropdown or segmented control with exactly these choices:

- `Low`
- `Medium`
- `High`

### Recommended Helper Text

Use the following guidance so admins choose consistently:

- `Low`: calm, relaxed, short walks/play are usually enough
- `Medium`: balanced activity, regular play and daily exercise
- `High`: very active, needs frequent exercise and stimulation

## Admin API / Payload Contract

When the admin side creates or updates an adoption pet, it should send:

```json
{
  "energy_level": 1
}
```

or

```json
{
  "energy_level": 2
}
```

or

```json
{
  "energy_level": 3
}
```

## Read Contract

Any admin list, pet editor, or pet detail view that reads adoption pets should include:

```sql
select
  id,
  pet_name,
  species,
  age_size,
  features,
  status,
  energy_level
from public.adoption_pets;
```

## Display Rules

### Admin Display Labels

When reading from the DB:

- `1` -> show `Low`
- `2` -> show `Medium`
- `3` -> show `High`
- `null` -> show `Not set`

### Optional Badge Colors

Recommended only if the admin site uses badges:

- `Low` -> soft green
- `Medium` -> amber / yellow
- `High` -> orange or red

## Main App Read Contract

The main app should also read `energy_level` from `adoption_pets`.

This field should be available to:

- adoption pet detail pages
- adoption cards if needed
- `Find My Match`

## Find My Match User Input Contract

The user-facing match modal should ask for lifestyle energy using the same 3-level scale:

- `Low`
- `Medium`
- `High`

The app should map that answer to:

- `Low` -> `1`
- `Medium` -> `2`
- `High` -> `3`

## Matching Rule

The simplest recommended scoring rule is distance-based:

```text
exact match = best
one level apart = acceptable
two levels apart = weakest
```

### Example

If:

- user energy = `2`
- pet energy = `2`

then this is the strongest match.

If:

- user energy = `2`
- pet energy = `1` or `3`

then this is still acceptable but lower score.

If:

- user energy = `1`
- pet energy = `3`

then this is a weak match.

## Recommended Matching Formula

Example numeric scoring:

```ts
function scoreEnergy(userEnergy: number | null, petEnergy: number | null) {
  if (!userEnergy || !petEnergy) return 0;
  const distance = Math.abs(userEnergy - petEnergy);
  if (distance === 0) return 20;
  if (distance === 1) return 10;
  return 0;
}
```

This is simple, predictable, and easy to debug.

## Backward Compatibility

Older pets may not have `energy_level` yet.

If `energy_level` is `null`:

- admin side should show `Not set`
- matching logic should not fail
- the app can either:
  - give `0` score for energy, or
  - exclude energy from scoring for that pet

Recommended:

- do not block the pet from appearing
- just reduce ranking confidence

## Suggested Admin Rollout

### Phase 1

- add the DB column
- expose the field in admin create/edit form
- allow manual setting for new pets

### Phase 2

- backfill old pets manually in admin
- display energy level in admin list/detail views

### Phase 3

- use `energy_level` in `Find My Match` scoring

## Exact Things The Admin Side Should Do

1. Add `energy_level` field to `adoption_pets` create/edit forms.
2. Save only numeric values `1`, `2`, or `3`.
3. Show readable labels `Low`, `Medium`, `High`.
4. Return `energy_level` in adoption pet API responses.
5. Allow older rows with `null` safely.

## Exact Things The Main App Should Do

1. Read `energy_level` from adoption pet records.
2. Ask the user for preferred energy using the same 3-level scale.
3. Convert the user answer to `1`, `2`, or `3`.
4. Score compatibility using numeric distance.
5. Handle `null` energy levels safely.

## Example Record

```json
{
  "id": "pet-uuid",
  "pet_name": "Max",
  "species": "Dog",
  "status": "available",
  "energy_level": 3
}
```

Meaning:

- this pet is `High` energy
- the best user match is also `High`

## Summary

The clean contract is:

- admin sets `energy_level`
- DB stores it as `1 | 2 | 3`
- main app reads it
- `Find My Match` compares user energy to pet energy using the same scale

This keeps the admin side and user side aligned and avoids ambiguous text matching.
