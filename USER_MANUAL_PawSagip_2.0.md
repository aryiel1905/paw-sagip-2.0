# PawSagip 2.0 User Manual (User Flow Order)

Version: 1.1  
Project: PawSagip 2.0 - Community Pet Rescue and Adoption Platform  
Last updated: March 5, 2026

## 1. Getting Started

1. Open PawSagip in your browser.
2. Use desktop or mobile.
3. Sign in if you want account-based features (saved reports, applications, settings).

## 2. Home Page (First Screen)

The Home page is the primary user journey screen.

Actual section order in Home:

1. Hero + Global Search
2. Alerts section
3. Report section
4. Adoption section

---

## 3. Hero + Global Search

From the top part of Home:

1. Use the search box to find alerts/adoptions by keyword, place, species, or name.
2. Press Enter or click Search.
3. Select a result:
   1. Alerts result opens details modal.
   2. Adoption result opens adoption view/page.

Use this first when you already know what case/pet you are looking for.

---

## 4. Alerts Section (Home Section #1)

In Alerts, users can:

1. Browse recent cases.
2. Browse by category columns (`Found`, `Lost`, `Cruelty`) in the Home layout.
3. Open a card to view full details.
4. Use available actions inside details modal:
   1. Contact details (if available)
   2. Hotline action
   3. Open in Google Maps (if coordinates exist)

### Alerts Details Modal Quick Guide

1. Review report info: type, status, location, time, notes.
2. Review media (main + landmark media if present).
3. Close modal to continue browsing.

---

## 5. Report Section (Home Section #2)

Use this section to submit a new case.

### Report Submission Steps

1. Select report type (`Lost`, `Found`, or `Cruelty`).
2. Select species.
3. If species is `Other`, add custom species text.
4. Pin exact location using map picker.
5. Set date/time (`When`) or use auto.
6. Add description/condition/features as applicable.
7. Upload media:
   1. Main photo/video
   2. Optional landmark media
8. Submit report.

### Important Notes

1. Required fields must be completed before submit.
2. `Other` species handling is constrained to preserve valid format.
3. Accurate map pin improves rescue response.

---

## 6. Adoption Section (Home Section #3)

In Adoption section:

1. Browse adoptable pet cards.
2. Open pet details.
3. Proceed to adoption application flow.
4. Use `Find my match` for recommendations.

### Find My Match

1. Open `Find my match`.
2. Answer matching questions.
3. Generate recommendations.
4. Review ranked pets and reasons.
5. Open a recommended pet and proceed to apply.

---

## 7. Adoption Application Flow

When applying:

1. Fill applicant information.
2. Complete questionnaire.
3. Upload required proof/media (if required by form).
4. Review and submit.
5. Track status later in account dashboard.

---

## 8. Top Navigation Pages (Outside Home)

After Home sections, users can directly open top-nav pages:

1. Alerts page (`/alerts`) for broader browsing.
2. Adoption page (`/adopt`) for full adoption listing.
3. Report form page (`/report-form`) for dedicated reporting experience.
4. Contacts page (`/contacts`).

---

## 9. Account Area (Signed-In Users)

In `My Account` / dashboard:

1. Overview panel
2. My Reports
3. Adoption Applications
4. Settings

### Settings Quick Guide

1. Toggle sound alerts.
2. Test alert sound.
3. Manage notification sound:
   1. Current selected sound card supports play/pause.
   2. `Edit sound` opens a modal picker.
   3. Choose, preview, and save sound.
4. Toggle browser notifications and test system notification.

---

## 10. Onboarding / Tutorial Controls

If first-time tutorial appears:

1. Next: Enter or Right Arrow
2. Back: Left Arrow
3. Skip: Esc (with confirmation)

---

## 11. Admin / Barangay Operational Flow

For authorized users:

1. Review submitted reports.
2. Update report status/decision.
3. Promote eligible records to adoption.
4. Review adoption applications and decisions.
5. Maintain species metadata and aliases (if enabled).

---

## 12. Troubleshooting

### Sound not playing

1. Ensure Sound alerts is enabled.
2. Interact once (browser audio policy).
3. Check device volume and browser permissions.

### Notifications not appearing

1. Enable browser notifications in Settings.
2. Grant browser permission.
3. Verify OS notification settings.

### Report submit problems

1. Recheck required fields.
2. Verify network.
3. Retry media upload.

### Map/location issues

1. Re-open map picker and re-pin.
2. Allow location access.
3. Confirm generated location text.

---

## 13. Data and Governance Notes

1. Anonymous reporting may be available in selected flows.
2. Data/media are handled via Supabase-backed services.
3. Admin actions should follow barangay policy and data governance.

---

End of Manual
