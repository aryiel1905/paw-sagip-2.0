# PawSagip — User Manual

Welcome to PawSagip, a community app for reporting lost/found pets, tracking animal cruelty alerts, and browsing animals for adoption. This guide explains how to use the app as an end user.

## Quick Start
- Open the website. The top navigation bar appears on every page.
- Use the nav to jump to: Home, Alerts, Report, Registry, Adoption.
- Click cards to view details. Use the Back button or the browser back to return.

## Navigation Basics
- Navbar
  - Visible at the top on all pages.
  - On the home page, clicking a nav item smoothly scrolls to that section.
  - From other pages (e.g., Alerts, Adoption), clicking a nav item routes to the home page and scrolls to the desired section.
- Back Button
  - On the Alerts and Adoption listing pages, a Back button takes you back in history or returns to the corresponding home section if there’s no history.

## Alerts
Alerts help the community coordinate around lost, found, and cruelty reports.

- Home Overview
  - Three panels: FOUND, LOST, and CRUELTY.
  - Each panel shows a preview grid of recent reports.
  - Click “View More” to open the full alerts page pre‑filtered by the panel type.
- Full Alerts Page
  - URL format: `/alerts?type=found|lost|cruelty|all&page=1`.
  - Full‑page background matches the selected type.
  - Responsive grid shows many cards per page with “Newest” first.
  - Numbered pagination (Prev/Next and ellipses) at the bottom; default page size is 60 items.
  - A neutral Back button sits above the title.
- Cards
  - Show an image (or emoji fallback), report title, location area, and “time ago”.
  - Click a card to open the Details modal.
- Details Modal
  - Displays report type, time, location, and additional details (species/breed, gender/age, features, notes) when available.
  - Photos
    - Tap/click the main photo or any landmark image to view it fullscreen.
    - In fullscreen, tap the background or press Esc to close; use the on‑screen chevrons or Arrow keys to move between multiple photos.

## Reporting a Pet (Report Section)
Use this to create a new report for the community.

- Choose a report type: Found, Lost, or Cruelty.
- Fill in details: description, condition, and location.
- Location
  - You can type the location or use the map picker to set it precisely.
  - Grant location permission to improve accuracy.
- Photos
  - Add one primary photo (recommended) and up to five “landmark” photos to aid identification.
  - Each photo must be under 5 MB. You can remove selected photos before submitting.
- Submit
  - After submit, the report is uploaded and appears in Alerts (Newest first).
  - The home page and alerts page update in real time.

## Adoption
Browse animals looking for a new home.

- Home Overview
  - Adoption section previews recent available pets.
  - Click a pet card to open its dedicated page with more details.
  - A “More” card navigates to the full adoption listing page.
- Full Adoption Page
  - URL format: `/adopt?page=1`.
  - Full‑page adoption background for consistency.
  - Responsive grid with numbered pagination (default 60 per page).
  - Neutral Back button returns to the previous page or the home Adoption section.
- Pet Cards
  - Show image (or emoji), kind (DOG/CAT/OTHER), and age or location.
  - Click through to the pet’s dedicated profile page for full details.

## Registry
A central place for pet IDs or related records (as made available by your organization). Visit the Registry section from the home page to explore what’s supported.

## Search
- Use the search box in the top navbar.
- Start typing to see suggestions for alerts and adoption entries.
- Select a result to open its details view.

## Photos & Fullscreen Viewer
- Tap the main image (alerts/adoption) or any landmark image to open the fullscreen viewer.
- Close by tapping the background or pressing Esc.
- Navigate between multiple photos using the on‑screen chevrons or the Left/Right arrow keys.

## Location & Maps
- If latitude/longitude is present on a report, the app can show improved details in the modal.
- The app may ask for your location permission to improve submissions and searching; you can deny it and still use the app.

## Tips & Best Practices
- Upload clear, well‑lit photos of pets and key landmarks (signs, intersections, unique features).
- Use concise, descriptive titles and include recognizable areas or districts.
- Keep an eye on the “time ago” indicator on alerts to prioritize recent reports.

## Troubleshooting
- Nothing loads / shows a spinner
  - Check your internet connection and refresh the page.
- Photos won’t upload
  - Ensure each file is under 5 MB and try again.
- Location can’t be set
  - Confirm browser location permission or enter the location manually.
- New reports don’t appear immediately
  - Wait a moment for the real‑time update, or refresh the page.

## Accessibility & Keyboard Shortcuts
- Modal dialogs: press Esc to close.
- Fullscreen image viewer: Left/Right Arrows to navigate, Esc to close.
- Buttons and links are accessible via Tab; focus outlines indicate active elements.

## Privacy & Safety
- Avoid sharing personal contact information publicly in descriptions.
- If you suspect abuse, contact local authorities. Use the Cruelty report type to document incidents responsibly.

<!--
## Accounts & Login (Coming Soon)

This section will cover signing in and accessing your user page once accounts are enabled.

- Login
  - Access the Sign in button in the navbar.
  - Enter your email/password or use supported social logins.
  - After login, you’ll return to the page you started from.
- User Page
  - View your submitted reports and adoption applications.
  - Edit or delete your reports (where allowed).
  - Manage your profile (name, location preferences).
  - Sign out from your profile dropdown.

Note: The above is planned functionality and may not appear in the current build.
-->

## Need Help?
If you encounter issues or have suggestions, please reach out to your site administrator or project maintainers.

*** End of User Manual ***

