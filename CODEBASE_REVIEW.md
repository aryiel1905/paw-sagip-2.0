# PawSagip 2.0 — Codebase Review

## Critical (Security)

**1. No API Route Authentication**
Most API routes don't verify the caller's identity. Anyone can submit, modify, or delete reports/applications. Every protected endpoint needs a session check before processing.

**2. Missing Input Validation & Sanitization**
No validation on coordinates, photo paths, or free-text fields in the report endpoint. This opens up stored XSS and data integrity issues.

**3. No Supabase RLS Policies**
The database has no visible Row-Level Security policies. The anon key can read/write broadly based on current code structure.

**4. No CSRF Protection**
API routes don't validate origin or use CSRF tokens, making them vulnerable to cross-site request forgery.

---

## High Priority (Stability & Quality)

**5. Zero Test Coverage** ✅ RESOLVED
Vitest + React Testing Library installed. 24 tests written and passing across 2 test files:
- `src/test/api/reports.test.ts` (10 tests)
- `src/test/api/adoption-applications.test.ts` (12 tests)
Run with `npm test`.

**6. Silent Error Handling** ✅ PARTIALLY RESOLVED
`console.error` added to silent catch blocks in `reports/route.ts`, `adoption-applications/route.ts`, and `export/route.ts`. A full error tracking service (e.g. Sentry) is still not set up.

**7. Incomplete Features Shipped**
Several stubs exist in the UI/API:
- "Nearest" sort in adoption — placeholder only
- Pet Registry — mock UI, no real data flow
- `ffmpeg-static` is installed but not wired up (video trim range is selected client-side but not re-encoded server-side)

**8. No Pagination** ✅ RESOLVED (was never an issue)
Pagination is fully implemented. `fetchAlertsPaged()` and `fetchAdoptionPetsPaged()` use `.range()` with exact counts. `AlertsBrowse.tsx` has working Prev/Next/page navigation. The homepage previews (6/9 items) are intentional design.

---

## Medium Priority (Code Quality)

**9. Excessive Use of `any` Types** ✅ RESOLVED
Removed all unnecessary `as any` casts in `AlertsSection.tsx` (lat/lng now typed directly from `Alert`). Replaced `["--btn-accent" as any]` with a properly typed CSS custom property intersection. Removed 3 blanket `eslint-disable` comments from `AlertsSection.tsx`, `AlertsBrowse.tsx`, and `AdoptionBrowse.tsx`.

**10. Debugging Code Left In Production** ✅ RESOLVED
Removed the only remaining `console.log` — the unused `logPdfFields()` debug function in `fillAdoptionForm.ts` was deleted entirely (it was exported but never called).

**11. God-File: `supabaseApi.ts`**
At 764 lines, `supabaseApi.ts` handles too many concerns. Should be split by domain (alerts, adoptions, search, subscriptions). — *Deferred: low risk, high effort refactor.*

**12. Long Components**
`ReportSection.tsx` (2155 lines) and `page.tsx` (1685 lines) are very large. — *Deferred: requires careful splitting without breaking functionality.*

**13. Magic Numbers** ✅ RESOLVED
Extracted `ALERT_NOTIFY_COOLDOWN_MS`, `DEFAULT_PAGE_SIZE`, and `MAX_PAGE_SIZE` into `src/constants/app.ts`. Wired up in `notify.ts`, `supabaseApi.ts`, and `api/adoptions/available/route.ts`.

---

## Low Priority (Polish & UX)

**14. No CI/CD Pipeline**
No GitHub Actions, no automated linting/testing on PR. Easy wins for code quality enforcement. — *Deferred: requires GitHub repo setup.*

**15. No Structured Logging**
No log levels, no correlation IDs. Hard to trace issues across API routes. — *Deferred: low immediate impact at current scale.*

**16. Inline Canvas Logic in Layout** ✅ RESOLVED
Extracted canvas background composition into `src/lib/composeBgTile.ts` and a `BgTileLoader` client component. `layout.tsx` now uses `<BgTileLoader />` instead of a 30-line inline `<Script>` block.

**17. No Error Boundary** ✅ RESOLVED
Created `src/components/ErrorBoundary.tsx` (class component with fallback UI). Wrapped the entire app in `layout.tsx` — a crash in any component now shows a friendly "Something went wrong / Reload page" screen instead of a blank white page.

**18. Notification Spam Cooldown is Global**
The 2.5s cooldown in `notify.ts` blocks all alerts, not just duplicates. A per-alert deduplication approach would be more correct. — *Deferred: low user impact, higher complexity to fix correctly.*

---

## Planned Features to Complete

| Feature | Status |
|---|---|
| Species metadata system | Design doc exists, not implemented |
| Barangay admin UI | API routes exist, UI incomplete |
| Video trimming | Modal exists, logic absent |
| Adoption status notifications | Not started |
| Advanced search filters | Stub only |
| Pet registry full flow | Mock only |
| Report editing after submission | Not implemented |

---

## Mobile Responsiveness Fixes ✅ RESOLVED

All critical and moderate mobile issues addressed:

| Issue | Fix |
|---|---|
| MapPickerModal fixed `h-96` map overflows on small phones | Changed to `h-[40vh] min-h-[200px] sm:h-[50vh] md:h-96`; modal is now `max-h-[95vh] flex flex-col` with scrollable body |
| DetailsModal no max height — overflows viewport | Added `max-h-[90vh] flex flex-col overflow-hidden`; body is `overflow-y-auto` |
| DetailsModal image `max-w-[180px]` too narrow on mobile | Changed to `w-full sm:max-w-[200px]` and increased height to `h-40` |
| DetailsModal details grid `grid-cols-2` wraps badly on narrow screens | Changed to `grid-cols-1 sm:grid-cols-2` |
| ReportSection media buttons `px-2 py-1` (~24px) below 44px touch target | Increased all media overlay buttons to `px-3 py-2` |
| AlertsBrowse & AdoptionBrowse pagination `px-3 py-1` too small | Increased to `px-4 py-2` |
| AlertsSection `min-h-[420px]` too tall on short phones | Changed to `min-h-[300px] sm:min-h-[420px]` |
| Bottom nav overlaps last page section | Added `pb-24 md:pb-0` to main content |
| Bottom nav label `text-[11px]` too small | Increased to `text-[12px] font-medium`; max-w extended to `max-w-lg` |
| Navbar username `max-w-[8ch]` cuts names too short | Extended to `max-w-[12ch]` |
| Navbar redundant `md:hidden hidden` | Cleaned up to `hidden md:hidden` |
| MapPickerModal bottom buttons overlap on mobile | Buttons now stack vertically on mobile (`flex-col sm:flex-row`) |

---

## Quick Wins (Low effort, high value)

1. ~~Strip all `console.log` statements from production code~~ ✅ Done
2. ~~Add a React Error Boundary wrapper~~ ✅ Done
3. ~~Add pagination to alerts and adoptions API calls~~ ✅ Already implemented
4. Add Sentry (or similar) for error tracking
5. Add `zod` for runtime input validation on API routes
6. ~~Write at least smoke tests for the report submission and adoption application flows~~ ✅ Done (24 tests passing)
