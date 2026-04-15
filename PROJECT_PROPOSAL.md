# Project Proposal

## PawSagip 2.0: A Community-Based Pet Rescue and Adoption Platform for the Philippines

---

## Executive Summary

PawSagip 2.0 is a web-based platform that centralizes pet rescue coordination, lost and found reporting, and animal adoption across Philippine communities. The platform bridges the gap between concerned citizens, barangay rescue teams, and animal shelters by providing a real-time, accessible, and organized system for animal welfare response.

The project addresses the current reliance on fragmented, informal channels — such as Facebook groups and word-of-mouth — which often delay rescues, leave cruelty cases unresolved, and reduce adoption opportunities for sheltered animals. PawSagip 2.0 offers a structured alternative: a single platform where citizens can report cases, communities can respond, and local government units can manage animal welfare operations efficiently.

---

## Background and Problem Statement

Animal welfare in the Philippines faces a coordination problem. When a pet is lost, a stray is spotted, or a cruelty case is observed, concerned citizens have no reliable, centralized place to report it. The typical recourse — posting on Facebook, calling a barangay hotline, or notifying neighbors — is inconsistent and time-sensitive information gets buried.

This fragmentation has real consequences:

- **Lost pets** are rarely reunited with their owners because reports are scattered and hard to track.
- **Found animals** often go unclaimed or are left with untrained individuals unsure of what to do.
- **Cruelty cases** are under-reported and rarely reach the appropriate authorities in time.
- **Animal shelters** operate adoption programs in isolation, with no unified directory for the public to discover adoptable animals.
- **Barangay rescue teams** lack a shared system for receiving, assigning, and tracking cases.

There is a clear and unmet need for a structured, community-accessible platform that organizes animal welfare response at the barangay level.

---

## Project Description

PawSagip 2.0 is a dual-component web platform consisting of a **citizen-facing application** and an **administrative dashboard**, both connected to a shared, real-time database.

### Citizen Application

The public-facing application allows any resident — with or without an account — to:

- **Report** lost pets, found animals, and cruelty cases with photos, location pinning, and descriptive details
- **Browse** a live community alert feed that updates in real time as new reports are submitted
- **Search** across all alerts and adoptable animals by keyword, location, or type
- **Adopt** pets from registered shelters through a guided, multi-step application process
- **Track** their adoption applications and receive status updates
- **Access** emergency rescue hotlines and navigate directly to incident locations via maps

The platform is designed for mobile-first use, with a simple bottom navigation bar and touch-friendly controls optimized for quick action in the field.

### Administrative Dashboard

A role-based operations portal for authorized users, including:

- **Barangay administrators** who receive, review, and manage local reports, assign rescue teams, and oversee adoption workflows
- **Rescue team members** who view their assignments and coordinate responses
- **Shelter staff** who manage their roster of adoptable animals and process adoption applications
- **Platform administrators** who manage all barangays, user accounts, and system-wide data

All administrative actions are scoped to the user's role and assigned barangay, ensuring that local government units maintain clear oversight of their jurisdictions without interference from other areas.

---

## Objectives

1. Provide Filipino citizens with a reliable, accessible platform to report pet-related incidents and cruelty cases.
2. Centralize animal welfare coordination at the barangay level, reducing response time for rescue operations.
3. Increase adoption rates by giving shelters a public-facing directory integrated with a structured application process.
4. Support barangay local government units with tools to manage, monitor, and document animal welfare cases.
5. Establish a scalable foundation for a national pet registry using QR and microchip identification.

---

## Key Features

### For Citizens

| Feature | Description |
|---|---|
| Incident Reporting | Submit lost, found, cruelty, or adoption reports with photos, video, and a map-pinned location |
| Real-Time Alert Feed | Live community feed that updates instantly as new reports are submitted nearby |
| Global Search | Search all alerts and adoptable animals by keyword across the entire platform |
| Adoption Center | Browse adoptable animals filtered by species and sorted by distance or recency |
| Adoption Application | Complete a structured, multi-step application form aligned with responsible adoption standards |
| Application Tracking | View the status of submitted adoption applications from a personal dashboard |
| Emergency Access | One-tap access to rescue hotlines and direct navigation to incident locations |
| Pet Registry | Scan a QR code or microchip ID to retrieve a registered pet's profile and owner contact |

### For Administrators

| Feature | Description |
|---|---|
| Report Management | Receive, review, assign, and update the status of incoming reports within the barangay |
| Team Coordination | Organize rescue team members into groups and manage individual assignments |
| Adoption Workflow | Review and process adoption applications, approve or decline, and notify applicants |
| Animal Inventory | Maintain an up-to-date listing of animals available for adoption at the shelter |
| QR Code Scanner | Scan pet QR codes to retrieve registry records on the spot |
| Data Export | Export case reports to spreadsheet format for documentation and compliance |
| User Management | Create and manage accounts for rescuers, shelter staff, and barangay administrators |

---

## Target Users

| User Group | Role in the Platform |
|---|---|
| General Public | Report incidents, browse alerts, and apply to adopt pets |
| Pet Owners | Track lost pet reports and register animals in the pet registry |
| Barangay Administrators | Manage incoming reports and rescue team operations |
| Rescue Team Members | Receive and respond to assigned cases |
| Animal Shelter Staff | Manage adoptable animals and process adoption applications |
| Local Government Units | Oversee community-level animal welfare data and operations |

---

## Geographic Scope

The platform is designed to serve the entire Philippines. Location data is matched against a database of over **5,000 Philippine barangays**, ensuring that reports are automatically assigned to the correct administrative unit. This enables barangay-scoped oversight and accurate distance-based filtering for citizens searching for nearby incidents or adoptable animals.

---

## System Architecture Overview

PawSagip 2.0 is built on two separate web applications sharing a single cloud-hosted database:

- The **Citizen Application** serves the general public and handles all reporting, browsing, and adoption interactions.
- The **Admin Dashboard** serves authorized personnel and handles case management, team coordination, and system administration.

Both applications connect to a **real-time cloud database** (Supabase/PostgreSQL) hosted on secure infrastructure. Data flows are governed by role-based access controls, ensuring that users only see and act on information relevant to their assigned role and barangay.

Files such as photos and videos are stored in a secure cloud storage bucket. Location data is resolved through a geocoding service that converts GPS coordinates into barangay-level addresses automatically.

The platform is deployed on **Vercel**, a globally distributed hosting platform, ensuring fast load times and high availability for users across the Philippines.

---

## Technology Summary

The platform is built using modern, industry-standard technologies appropriate for a scalable, maintainable public-facing system:

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS — delivering a fast, responsive, and accessible user interface
- **Backend:** Node.js API routes with server-side data processing and secure database access
- **Database:** PostgreSQL via Supabase — a reliable, open-source relational database with built-in real-time capabilities
- **Authentication:** Supabase Auth with JWT tokens and role-based access control
- **File Storage:** Supabase Storage for photos, videos, and generated documents
- **Maps & Geocoding:** MapLibre GL for interactive maps; OpenCage, Google Maps, and OpenStreetMap for address resolution
- **Deployment:** Vercel for both applications with environment-based configuration

---

## Project Status

The platform is currently in active development. Core systems are complete and operational. A live prototype is accessible at **https://paw-sagip-20.vercel.app**.

| Component | Status |
|---|---|
| Incident reporting system | Complete |
| Real-time community alert feed | Complete |
| Adoption center and application workflow | Complete |
| Role-based administrative dashboards | Complete |
| User authentication and access control | Complete |
| Mobile-responsive design | Complete |
| Data export and reporting tools | Complete |
| Video media processing | In Progress |
| Full QR-based pet registry | In Progress |
| Automated error monitoring | Planned |
| CI/CD pipeline | Planned |

---

## Future Roadmap

The following enhancements are planned for subsequent development phases:

1. **Full Pet Registry** — Complete QR and microchip scan-to-lookup flow, enabling a verified national pet database accessible to all barangays.
2. **SMS and Email Notifications** — Automated alerts to applicants, reporters, and rescue teams when case statuses are updated.
3. **Advanced Search and Filtering** — Location radius search, breed-specific filtering, and date range queries.
4. **Mobile Application** — Native iOS and Android apps to complement the existing mobile-optimized web platform.
5. **Analytics Dashboard** — Summary reports for LGUs showing case volumes, resolution rates, and adoption metrics by barangay.
6. **Integration with National Agencies** — Data sharing with PAWS PH, Bureau of Animal Industry, and local veterinary offices.

---

## Conclusion

PawSagip 2.0 addresses a genuine and widespread problem in Philippine communities: the lack of a structured, accessible system for coordinating animal welfare response. By centralizing reporting, rescue coordination, and adoption into a single platform governed by barangay-level oversight, PawSagip 2.0 has the potential to meaningfully improve outcomes for animals and the communities that care for them.

The platform is technically sound, actively developed, and already operational in prototype form. With continued development and community adoption, PawSagip 2.0 can serve as the foundation for a modern, scalable approach to animal welfare management across the Philippines.

---

*Prepared by the PawSagip Development Team — April 2026*
