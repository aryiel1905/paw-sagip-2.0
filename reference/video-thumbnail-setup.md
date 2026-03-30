# Video Thumbnail Setup For Report Cards

## Purpose

This document defines the actual integration contract for video uploads in PawSagip so the admin site knows exactly what data it should receive and how to render it.

This is not a full media-model rewrite.

For the current implementation, the system will:

- keep using `photo_path` as the main report media field
- allow `photo_path` to contain either an image path or a video path
- add `video_thumbnail_path` for video preview cards

This keeps the change small and compatible with the existing app and admin flows.

## Final Data Model

In `public.reports`, the relevant media fields should be:

- `photo_path text null`
- `video_thumbnail_path text null`
- `landmark_media_paths text[] not null default '{}'`

### Meaning

- `photo_path`
  - For image-based reports: this is the uploaded image path.
  - For video-based reports: this is the uploaded video path.
- `video_thumbnail_path`
  - Only used when the main uploaded media is a video.
  - Stores the generated thumbnail image path for card/list previews.
- `landmark_media_paths`
  - Existing array for optional landmark image/video uploads.

## Required Database Change

Run this on Supabase:

```sql
alter table public.reports
add column if not exists video_thumbnail_path text;
```

## Schema Contract

### Reports Table

Final relevant shape for `public.reports`:

```sql
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_type text not null,
  description text,
  condition text,
  location text,
  latitude double precision,
  longitude double precision,
  photo_path text,
  video_thumbnail_path text,
  landmark_media_paths text[] not null default '{}'::text[],
  pet_name text,
  species text,
  breed text,
  gender text,
  age_size text,
  features text,
  event_at timestamptz,
  reporter_name text,
  reporter_contact text,
  is_aggressive boolean,
  is_friendly boolean,
  is_anonymous boolean,
  pet_status text,
  status text
);
```

### Minimal Migration

If the table already exists, only this is required for this feature:

```sql
alter table public.reports
add column if not exists video_thumbnail_path text;
```

### Fields The Admin Site Should Read

```sql
select
  id,
  report_type,
  location,
  created_at,
  photo_path,
  video_thumbnail_path,
  landmark_media_paths,
  pet_name,
  species,
  description,
  pet_status,
  status,
  latitude,
  longitude
from public.reports;
```

## Storage Contract

Use the existing Supabase bucket:

```text
pet-media
```

Recommended path pattern:

```text
reports/<uuid>.jpg
reports/<uuid>.mp4
reports/<uuid>-thumb.jpg
reports/landmarks/<uuid>.jpg
reports/landmarks/<uuid>.mp4
```

If keeping current random-file naming, that is also acceptable as long as:

- `photo_path` points to the main uploaded media
- `video_thumbnail_path` points to the thumbnail image for the main video

## Main App Write Contract

When a report is submitted:

### If the main media is an image

The app should save:

```json
{
  "photo_path": "reports/<image-file>",
  "video_thumbnail_path": null
}
```

### If the main media is a video

The app should:

1. upload the processed video
2. generate a thumbnail image
3. upload the thumbnail image
4. save both paths

Example:

```json
{
  "photo_path": "reports/<video-file>.mp4",
  "video_thumbnail_path": "reports/<video-thumb>.jpg"
}
```

## Upload Changes To Implement In This App

This section defines the exact change in the report-upload flow.

### Current Behavior

Right now:

- main images upload directly to Supabase storage
- main videos go through `/api/media/ingest`
- the uploaded main media path is saved into `photo_path`
- no dedicated thumbnail is uploaded or saved for the main video

### New Behavior

When the main selected media is a video, the app will do all of the following:

1. process and upload the main video
2. generate a thumbnail image from that video
3. upload the thumbnail image to Supabase storage
4. submit both paths to `/api/reports`

### Exact Upload Flow For Main Video

```text
1. User selects video file
2. User optionally trims video
3. App sends video to /api/media/ingest
4. API returns uploaded video path
5. App generates thumbnail from the selected video in browser
6. App uploads thumbnail image to pet-media bucket
7. App submits report payload with:
   - photoPath = uploaded video path
   - videoThumbnailPath = uploaded thumbnail image path
```

### Exact Upload Flow For Main Image

```text
1. User selects image file
2. App uploads image to pet-media bucket
3. App submits report payload with:
   - photoPath = uploaded image path
   - videoThumbnailPath = null
```

### Exact Upload Flow For No Main Media

```text
1. User submits report without main media
2. App submits report payload with:
   - photoPath = null
   - videoThumbnailPath = null
```

## Required Payload Change For /api/reports

The report payload must be extended to include:

```ts
type ReportPayload = {
  type?: string;
  description?: string;
  condition?: string;
  location?: string;
  photoPath?: string | null;
  videoThumbnailPath?: string | null;
  lat?: number | null;
  lng?: number | null;
  landmarkMediaPaths?: string[] | null;
  petName?: string | null;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  ageSize?: string | null;
  features?: string | null;
  eventAt?: string | null;
  reporterName?: string | null;
  reporterContact?: string | null;
  isAggressive?: boolean | null;
  isFriendly?: boolean | null;
  isAnonymous?: boolean | null;
  petStatus?: string | null;
};
```

### API Insert Mapping

When inserting into `public.reports`, the server should map:

```ts
{
  photo_path: payload.photoPath ?? null,
  video_thumbnail_path: payload.videoThumbnailPath ?? null,
  landmark_media_paths: payload.landmarkMediaPaths ?? []
}
```

## Frontend Changes To Implement

### 1. Report Submit Page

On the report form page:

- detect when the main media is a video
- generate a thumbnail blob in the browser
- upload the thumbnail image
- include `videoThumbnailPath` in the `/api/reports` request body

### 2. Thumbnail Generation Rule

For the first implementation:

- use a hidden `<video>`
- seek to around `0.2s` to `0.5s`
- draw the frame to `<canvas>`
- export JPEG blob

Recommended output:

- format: JPEG
- width: about 640px to 960px max
- quality: about `0.7` to `0.85`

### 3. Storage Upload Rule

Thumbnail uploads should go into the same bucket:

```text
pet-media
```

Recommended file name:

```text
reports/<uuid>-thumb.jpg
```

### 4. Data Fetch Changes

Any query that currently selects only `photo_path` for reports should also select:

```text
video_thumbnail_path
```

### 5. Card Rendering Changes

Every report-card style UI should follow this rule:

```text
if photo_path exists and is image:
  show photo_path
else if video_thumbnail_path exists:
  show video_thumbnail_path
else:
  show fallback
```

### 6. Detail Rendering Changes

Detail pages and modals should keep using `photo_path` as the actual main media source:

```text
if photo_path is image:
  render image
if photo_path is video:
  render video player
```

## Admin Site Read Contract

The admin site should receive these fields from `reports`:

- `id`
- `report_type`
- `location`
- `created_at`
- `photo_path`
- `video_thumbnail_path`
- `landmark_media_paths`
- `pet_name`
- `species`
- `description`
- `pet_status`
- `status`
- `latitude`
- `longitude`

Minimum example row:

```json
{
  "id": "report-uuid",
  "report_type": "lost",
  "location": "La Paz, Iloilo City",
  "created_at": "2026-03-29T10:00:00.000Z",
  "photo_path": "reports/abc123.mp4",
  "video_thumbnail_path": "reports/abc123-thumb.jpg",
  "landmark_media_paths": [],
  "pet_name": "Max",
  "species": "Dog",
  "description": "Seen near the market.",
  "pet_status": "roaming",
  "status": "open",
  "latitude": 10.716,
  "longitude": 122.562
}
```

## Admin Site Preview Rules

The admin site must not assume `photo_path` is always an image.

Use this preview priority for report cards, lists, and table thumbnails:

```text
1. If photo_path exists and is an image -> show photo_path
2. Else if video_thumbnail_path exists -> show video_thumbnail_path
3. Else -> show species fallback artwork / emoji / placeholder
```

### Important

Do not use `photo_path` directly as the card image when `photo_path` is a video file.

If the admin site needs to detect that, use file extension or media-type rules such as:

- `.mp4`
- `.mov`
- `.webm`

## Admin Site Detail View Rules

For the full report detail view:

```text
1. If photo_path is an image -> render <img>
2. If photo_path is a video -> render <video controls>
3. Render landmark_media_paths as mixed media:
   - image path -> <img>
   - video path -> <video controls>
```

## Main App Implementation Choice

### Recommended for current repo

Generate the thumbnail on the client during report submission.

Reason:

- fastest to ship
- no schema rewrite needed
- no extra backend service required right now

### Future upgrade

Move thumbnail generation to a backend service or Supabase Edge Function later for better consistency.

## Client-Side Thumbnail Flow

For the current implementation:

1. User selects a main video file.
2. Load it into a hidden `<video>`.
3. Seek to a safe preview frame such as `0.2s` to `0.5s`.
4. Draw the frame to a `<canvas>`.
5. Export as JPEG.
6. Upload the video.
7. Upload the thumbnail image.
8. Save:
   - video path into `photo_path`
   - thumbnail path into `video_thumbnail_path`

## What The Admin Site Should Expect

The admin site should expect three main cases:

### Case 1: Image report

```json
{
  "photo_path": "reports/a.jpg",
  "video_thumbnail_path": null
}
```

Behavior:

- card preview uses `photo_path`
- detail view uses image

### Case 2: Video report

```json
{
  "photo_path": "reports/a.mp4",
  "video_thumbnail_path": "reports/a-thumb.jpg"
}
```

Behavior:

- card preview uses `video_thumbnail_path`
- detail view uses video from `photo_path`

### Case 3: No main media

```json
{
  "photo_path": null,
  "video_thumbnail_path": null
}
```

Behavior:

- card preview uses fallback artwork
- detail view shows no main media

## Backward Compatibility

Old rows may already exist with:

- image in `photo_path`
- no `video_thumbnail_path`

The admin site should handle them safely:

```text
if photo_path is image:
  show image
else if video_thumbnail_path exists:
  show thumbnail
else:
  show fallback
```

If an old row has a video in `photo_path` but no thumbnail yet, use fallback artwork in the card and still allow the detail page to render the video.

## Implementation Notes For Admin Integrators

- `photo_path` is now the main media path, not strictly a photo-only field.
- `video_thumbnail_path` is only for preview surfaces.
- the actual playable video remains in `photo_path`
- `landmark_media_paths` may contain mixed image and video files

## Recommended Next Steps

1. Add `video_thumbnail_path` to `public.reports`.
2. Update the report submit flow to generate and upload a thumbnail for main videos.
3. Update all report-card data fetches to select `video_thumbnail_path`.
4. Update card rendering in both app and admin surfaces to prefer:
   - image `photo_path`
   - then `video_thumbnail_path`
   - then fallback
5. Keep detail views rendering mixed media from the existing paths.
