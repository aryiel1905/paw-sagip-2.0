<div align="center">

# PawSagip 2.0 — Community Pet Rescue

Report lost or found pets, receive nearby alerts, browse adoptions, and coordinate safe rescues with a mobile‑first experience.

</div>

## Overview

PawSagip is a community pet rescue and adoption web app built with Next.js and Supabase. Neighbors and barangay partners can:

- File lost/found/cruelty/adoption reports with optional photos
- See a real‑time alert feed from the community
- Browse adoptable pets with simple filtering and sorting
- Preview a QR/microchip‑backed pet registry flow (mock UI)

The UI is responsive, touch‑friendly, and optimized for quick actions on mobile.

## PawSagip: Community Pet Rescue and Adoption Platform

(Prototype with live test data: https://paw-sagip-20.vercel.app)

### Problem Statement

Lost pets and strays often go unreported or untracked due to reliance on scattered FB posts, barangay boards, or word of mouth. Shelters overflow, rescues are delayed, and citizens lack a reliable channel to coordinate.

Communities need a central, live system to:

- Report and find lost/found pets quickly
- Track alerts by location and time
- Register pets for fast identification
- Promote responsible adoption
- Escalate cruelty cases safely

### Solution: PawSagip Web App

A community‑driven platform connecting barangays, shelters, and citizens.

When real data flows into PawSagip, the system shows immediate value:

- Owners can search a location like “La Paz” and instantly see all related reports.
- Alerts populate with lost/found/adoption posts including photos, timestamps, and (when coordinates are provided) distances.
- Google Maps links let rescuers navigate directly to cases.
- Adoption cards show live rescued animals ready for homes.

### Core Functions (with Data Context)

🔔 Nearby Alerts

- Live feed of recent reports (e.g., FOUND — La Paz, 2 days ago).
- Displays distance such as “34.9 km away” when both the user’s and report’s coordinates are available.
- One‑click Google Maps link when a report has coordinates.
  ➡️ With data, this becomes a real‑time rescue radar.

🔎 Search (Global Search Bar)

- Located on the Home page hero.
- Searches across alerts and adoption posts by keyword with debounced requests.
- Alerts are matched by title, area, and type (lost/found/cruelty/adoption). Adoptions are matched by name, location, note, age, and kind (dog/cat).
- Results are grouped by category (Alerts / Adoption) and ranked for best matches; items include titles, areas/locations, and quick “View” actions.
- Press Enter or click Search to refresh results; clicking a result opens a details modal (alerts) or navigates to the adoption page.
  ➡️ With data, Search works like a barangay‑level pet search engine.

📍 Alerts Section

- Scrollable feed with filters: All, Lost, Found, Cruelty, Adoption.
- Shows mixed cases (e.g., ADOPTION in La Paz, LOST in San Pascual) with photos or emoji, locations, and “time ago.”
- Each card offers “More Details,” opening a modal with:
  - Pet photo or emoji (supports multiple landmark photos when provided)
  - Status (Lost/Found/Adoption/Cruelty)
  - Location and time
  - Buttons: Contact Reporter, Emergency Hotline, Open in Google Maps (when coordinates exist)
    ➡️ With data, this becomes a trusted source for barangay‑level animal alerts.

🪪 Pet Registry

- Mock scan reveals a sample pet profile (e.g., Max, Aspin, 2 years, Vaccinated).
- Registry ID + owner contact info shown.
- In production: Barangays can build official pet registries.
  ➡️ With data, this functions as a barangay “pet census.”

❤️ Adoption Center

- Grid of adoptable pets with filters (Dog/Cat/All) and sorting (Nearest/Newest).
- Clicking Adopt opens the Adoption Application flow:
  - Shows vaccination, spay/neuter, deworming status
  - Applicant acknowledges info before continuing
  - Multi‑step application form aligned with PAWS PH practices
    ➡️ With data, this becomes a live adoption directory.

🚨 Cruelty Reporting

- Available as a report type.
- Reporters can upload photos, describe incidents, and pin precise locations.
- Anonymous reporting is supported (no login required).
  ➡️ With data, barangays can monitor cruelty cases alongside rescues.

⚠️ Safety & Emergency Tools

- Emergency Hotline button for quick access in the alert details modal.
- Planned: Guidance for aggressive vs. friendly behavior to discourage risky approaches.
- Planned: Rescue Timer (ETA) after report submission.
  ➡️ Current app supports hotline access; additional safety tools are planned.

### Benefits of Having Data

- Transparency: Citizens verify if a case is already reported.
- Efficiency: Rescuers use photos + maps to act quickly.
- Trust: Timestamps + locations validate authenticity.
- Community engagement: Adoption updates motivate locals.
- Scalability: Every new report strengthens the barangay pet database.

### Feature Origins

- Lost/Found reporting → PetFinder.my, Pet911.sg
- Nearby Alerts → Pet911.sg
- Search → Inspired by PetFinder.my browse/search, adapted for barangays
- Pet Registry → PetFinder.my, Petotum (PVC card adaptation for PH)
- Adoption Center → PetRescue AU, PAWS PH standards
- Cruelty Reporting → AKF PH, ASPCA
- Safety and hotline concepts → PawSagip project notes

## Features

- Real‑time Alerts: Streams new alerts as they’re inserted (Supabase Realtime)
- Report Lost/Found/Cruelty/Adoption: Upload a photo to Storage and submit details
- Adoption Center: Filter by species (dog/cat) and sort by newest/nearest
- Pet Registry (Mock): Simulates a QR/microchip scan to show a sample pet profile
- Mobile UX: Fixed bottom nav, smooth in‑page navigation, and accessible controls

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 for styling
- Supabase (Postgres, Storage, Realtime)
- Icons/Anim: `lucide-react`, `lord-icon-element` / `lottie-web`

## Quick Start

Prerequisites:

- Node.js 18.18+ (or 20+)
- An existing Supabase project

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` with your Supabase credentials

```bash
# Browser (public)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server (secret – do NOT expose to the client)
SUPABASE_URL=your-supabase-url               # optional; falls back to NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

## Supabase Setup

Storage

- Create a public bucket named `pet-media` (used for report photos).
- Ensure your Storage policies allow anonymous `insert` for uploads to the desired folder (e.g., `reports/*`) and public `read` for viewing images.

Database (minimum columns used by the app)

- `alerts`
  - `id` (uuid or text), `title` (text), `area` (text), `type` (text: one of `lost|found|cruelty|adoption`), `created_at` (timestamptz, default now()), `photo_path` (text, nullable)
- `adoption_pets`
  - `id` (uuid or text), `kind` (text: `dog|cat`), `name` (text), `age` (text, nullable), `note` (text, nullable), `location` (text, nullable), `emoji_code` (text, nullable), `status` (text, e.g. `available`), `created_at` (timestamptz)
- `reports`
  - `id` (uuid or text), `report_type` (text: `lost|found|cruelty|adoption`), `description` (text, nullable), `condition` (text, nullable), `location` (text, nullable), `photo_path` (text, nullable), `created_at` (timestamptz)

Realtime

- Enable PostgreSQL Changes for `public.alerts` (INSERT) so the alert feed updates live.

## How It Works

- Client reads alerts and adoptions via the Supabase browser client (`NEXT_PUBLIC_*`).
- Report flow uploads an optional photo to `pet-media`, then POSTs to `POST /api/reports`.
- The API route (`src/app/api/reports/route.ts`) uses a Supabase server client with the Service Role key to insert into `reports` securely.
- The alert feed listens to Realtime `INSERT` events on `public.alerts` and updates the UI.

## Scripts

- `npm run dev` – Start the Next.js dev server (Turbopack)
- `npm run build` – Build for production
- `npm run start` – Start the production server
- `npm run lint` – Lint the codebase

## Code Map

- `src/app/layout.tsx` – Root layout, global styles, metadata, and Navbar
- `src/app/page.tsx` – Main page: hero, Alerts, Report, Registry, Adoption, Cruelty
- `src/app/api/reports/route.ts` – API route to save incoming reports (Node.js runtime)
- `src/components/*` – UI sections (AlertsSection, ReportSection, RegistrySection, AdoptionSection, CrueltySection, Navbar)
- `src/lib/supabaseClient.ts` – Browser Supabase client (anon key)
- `src/lib/supabaseServer.ts` – Server Supabase client (service role)
- `src/types/app.ts` – Shared types for UI and data mapping
- `src/app/globals.css` – Theme variables and utility classes

## Deployment

- Vercel is recommended for Next.js. Add the same env vars in the project settings.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server‑only. Never expose it in client bundles.
- The reports API route is explicitly set to `runtime = "nodejs"` for compatibility.

## Notes & Next Steps

- The “Nearest” adoption sort is currently a placeholder. Add geolocation/radius search if needed.
- Consider more granular Storage policies (path‑scoped inserts) and RLS for tables.
- Add authentication (e.g., Supabase Auth) for user‑scoped actions.
