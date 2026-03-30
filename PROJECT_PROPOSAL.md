# PawSagip 2.0 — Project Proposal

## Overview

**PawSagip 2.0** is a community-driven pet rescue and adoption web platform designed for the Philippines. It connects citizens, barangay rescue teams, and animal shelters through real-time alerts, a centralized adoption center, and a structured reporting system for lost, found, and cruelty cases.

The platform consists of two applications sharing a single backend:

- **Main App** — citizen-facing: report pets, browse alerts, and apply for adoption
- **Admin App** — operations-facing: barangay staff, rescuers, and shelters manage cases and workflows

---

## Problem Statement

Lost and found pets in the Philippines are reported through fragmented channels — Facebook groups, barangay bulletin boards, and word of mouth. This leads to:

- Delayed rescues due to lack of real-time coordination
- No centralized pet registry or microchip tracking system
- Inefficient shelter adoption processes
- Cruelty cases that go untracked and unreported
- Citizens with no reliable platform for community-level coordination

---

## Proposed Solution

A centralized, mobile-first web platform that:

- Enables citizens to report lost/found pets and cruelty cases with photos, video, and map-pinned locations
- Broadcasts real-time community alerts to nearby users
- Provides a live adoption directory with structured application workflows
- Gives barangay administrators and rescue teams operational dashboards to manage cases
- Supports a QR/microchip-based pet registry for fast identification

---

## Architecture

The system is split into two Next.js applications backed by a shared Supabase instance:

| Application       | Audience         | Description                                      |
| ----------------- | ---------------- | ------------------------------------------------ |
| `paw-sagip_2.0`   | Citizens         | Report, browse alerts, adopt pets                |
| `paw-sagip_admin` | Staff & Shelters | Manage operations, teams, and adoption workflows |

---

## Tech Stack

### Frontend

| Technology              | Purpose                              |
| ----------------------- | ------------------------------------ |
| Next.js 15 (App Router) | Full-stack React framework           |
| React 19                | UI library                           |
| TypeScript 5            | Type-safe development                |
| Tailwind CSS 4          | Utility-first styling                |
| Radix UI                | Accessible UI primitives             |
| Lucide React            | Icon library                         |
| LordIcon / Lottie Web   | Animated icons and illustrations     |
| MapLibre GL             | Interactive map for location picking |

### Backend & Database

| Technology                   | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| Next.js API Routes (Node.js) | Server-side API endpoints                         |
| Supabase (PostgreSQL)        | Primary relational database                       |
| Supabase Auth                | JWT-based authentication with RBAC                |
| Supabase Realtime            | Live alert feed via PostgreSQL CDC (WebSockets)   |
| Supabase Storage             | Photo and video file storage (`pet-media` bucket) |

### Integrations & Services

| Service                     | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| OpenCage Data API           | Primary reverse geocoding (lat/lng → barangay name) |
| Google Maps Geocoding       | Fallback geocoding provider                         |
| Nominatim (OpenStreetMap)   | Secondary geocoding fallback                        |
| Philippine Barangay Dataset | 5,000+ barangay records for local matching          |
| FFmpeg Static               | Server-side video thumbnail generation              |
| pdf-lib                     | PDF generation for adoption application forms       |
| QRCode.js                   | QR code generation for pet registry                 |
| ExcelJS                     | Report data export to Excel                         |
| @zxing/browser              | In-browser QR code scanning                         |

### Testing & Quality

| Tool                  | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| Vitest                | Unit and integration testing (24 passing tests) |
| React Testing Library | Component testing                               |
| Playwright            | End-to-end testing                              |
| ESLint 9              | Code linting                                    |

### Deployment

| Tool      | Purpose                                      |
| --------- | -------------------------------------------- |
| Vercel    | Hosting and continuous deployment            |
| Turbopack | Fast development builds (Next.js 15 default) |

---

## Core Features

### Citizen-Facing (Main App)

- **Real-time Alert Feed** — Live community feed of lost, found, cruelty, and adoption reports with audio and toast notifications
- **Report Submission** — Multi-type report form with photo/video upload, map-pinned location, and species details
- **Cruelty Reporting** — Anonymous reporting with photo and location pinning
- **Adoption Center** — Browse adoptable pets filtered by species (dog/cat/all) and sorted by newest or nearest
- **Adoption Application** — Multi-step application form with household details and document upload; generates a downloadable PDF
- **Application Dashboard** — Citizens can track the status of their submitted applications
- **Global Search** — Keyword search across alerts and adoptions with debounced queries
- **Pet Registry** — QR/microchip scan flow to display pet profile and owner contact information
- **Emergency Tools** — One-tap hotline access and Google Maps navigation from alert modals

### Operations-Facing (Admin App)

- **Super Admin Dashboard** — Manage all barangays, user roles, and platform-wide profiles
- **Barangay Admin Dashboard** — Manage local reports, assign rescue teams, oversee adoption workflows
- **Rescuer Dashboard** — View team assignments and active report cases
- **Shelter Dashboard** — Manage adoptable animals, review and process adoption applications
- **QR Code Scanner** — Scan pet QR codes to look up pet registry records
- **Report Export** — Export filtered reports to Excel for offline use
- **Batch Geocoding** — Reverse-geocode historical reports to assign barangay location metadata

---

## Role-Based Access Control

| Role              | Permissions                                                   |
| ----------------- | ------------------------------------------------------------- |
| `super-admin`     | Full platform control — manage all barangays, users, and data |
| `barangay-admin`  | Manage reports, teams, and adoptions within own barangay      |
| `rescuer`         | Submit reports and view team assignments                      |
| `shelter`         | Manage adoptable animals and review applications              |
| Anonymous Citizen | Submit reports and browse alerts without login                |

---

## Database Overview

Key tables in the PostgreSQL schema:

| Table                   | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `alerts`                | Community reports (lost / found / cruelty / adoption) with realtime subscription |
| `adoption_pets`         | Adoptable animals inventory with species, location, and photos                   |
| `adoption_applications` | Applicant submissions with household info and application status                 |
| `profiles`              | User accounts with assigned roles and barangay associations                      |
| `barangays`             | 5,000+ Philippine barangay records with coordinates                              |
| `rescuers` / `teams`    | Rescue team members and group assignments                                        |
| `shelters`              | Shelter accounts linked to adoptable animals                                     |
| `species`               | Pet species metadata including energy levels and domestic status                 |

---

## Geographic Coverage

The platform covers all Philippine administrative divisions using a dataset of over **5,000 barangays**. Reports are automatically reverse-geocoded and matched to the correct barangay for scoped admin access and local filtering.

---

## Security

- JWT-based API authentication via Supabase Auth
- Row-Level Security (RLS) policies on all sensitive tables
- Service role key restricted to server-only API routes
- Input validation on all form submissions (coordinates, dates, file types)
- Rate limiting on report export endpoints (5 requests / 60 seconds per user)
- Mock authentication mode blocked in production (`NODE_ENV` check)

---

## Current Status

| Area                                 | Status                                            |
| ------------------------------------ | ------------------------------------------------- |
| Core alert and report system         | Complete                                          |
| Real-time feed                       | Complete                                          |
| Adoption center and application flow | Complete                                          |
| Role-based admin dashboards          | Complete                                          |
| Authentication and RBAC              | Complete                                          |
| Mobile responsiveness                | Complete                                          |
| Unit and E2E testing                 | Complete (24 unit tests, Playwright configured)   |
| Video trimming (server-side)         | In progress — UI exists, server wiring incomplete |
| Full pet registry QR flow            | In progress — mock UI only                        |
| Error tracking (Sentry)              | Not yet implemented                               |
| CI/CD pipeline                       | Not yet implemented                               |

**Estimated total codebase size:** ~50,000 lines across both repositories

---

## Deployment

Both applications are deployed to **Vercel** with shared Supabase environment variables. Each app is a separate Vercel project pointing to the same Supabase instance.

**Required environment variables (per app):**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## References & Inspirations

| Feature              | Inspired By                |
| -------------------- | -------------------------- |
| Lost/Found reporting | PetFinder.my, Pet911.sg    |
| Nearby alerts        | Pet911.sg                  |
| Global search        | PetFinder.my browse/search |
| Pet registry         | PetFinder.my, Petotum (PH) |
| Adoption center      | PetRescue AU, PAWS PH      |
| Cruelty reporting    | AKF PH, ASPCA              |
