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
