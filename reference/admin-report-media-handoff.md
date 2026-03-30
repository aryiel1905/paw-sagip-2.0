# Admin Report Media Handoff

## Purpose

This document explains how report media is currently stored and how the admin side should use it for:

- report cards
- report lists
- report detail modals/pages

It covers how `photo_path`, `video_thumbnail_path`, and `landmark_media_paths` work together.

## Storage Fields

In `public.reports`, the relevant media fields are:

- `photo_path`
- `video_thumbnail_path`
- `landmark_media_paths`

## Field Meaning

### `photo_path`

This is the real main media file for the report.

- if the report was uploaded with an image, `photo_path` is the image file
- if the report was uploaded with a video, `photo_path` is the video file

Examples:

- `reports/abc.jpg`
- `reports/abc.mp4`

### `video_thumbnail_path`

This is only used when the main uploaded media is a video.

- it stores a generated image thumbnail for preview surfaces
- it should be used for cards/lists instead of trying to render the video directly

Example:

- `reports/abc-thumb.jpg`

If the main report media is an image, this field is usually `null`.

### `landmark_media_paths`

This is the array of extra attached media for the report.

- can contain images
- can contain videos
- used in the full detail carousel

Examples:

- `reports/landmarks/1.jpg`
- `reports/landmarks/2.mp4`

Note:
in the current app flow, additional media attached from the first upload tile may also end up in this array after save. For detail-view rendering, treat these as additional report media.

## Upload Behavior

### If the main upload is an image

The app does this:

1. uploads the image directly
2. stores:
   - `photo_path = reports/<file>.jpg`
   - `video_thumbnail_path = null`

### If the main upload is a video

The app does this:

1. trims/transcodes the video
2. generates a thumbnail image
3. uploads both files
4. stores:
   - `photo_path = reports/<file>.mp4`
   - `video_thumbnail_path = reports/<file>-thumb.jpg`

## Admin Fetch Contract

The admin side should fetch at least:

```sql
select
  id,
  custom_id,
  report_type,
  species,
  location,
  created_at,
  status,
  photo_path,
  video_thumbnail_path,
  landmark_media_paths
from public.reports;
```

## Card/List Rendering Rules

Cards and list rows should use a preview image, not the raw video.

### Preview Rule

- if `photo_path` is an image, use `photo_path`
- if `photo_path` is a video, use `video_thumbnail_path`
- if neither is available, use a fallback placeholder

### Card Rule Summary

- `photo_path` is the actual media source
- `video_thumbnail_path` is the card preview source for video reports

## Detail Modal/Page Rendering Rules

The full detail view should use the real media, not the thumbnail.

### Main Media Rule

- render the real main media from `photo_path`
- if it is an image, render `<img>`
- if it is a video, render `<video controls>`

### Additional Media Rule

To build the detail carousel:

1. start with `photo_path`
2. append all items from `landmark_media_paths`

This produces a combined media array for the report detail view.

Example:

```ts
const mediaItems = [
  ...(report.photo_path ? [report.photo_path] : []),
  ...((report.landmark_media_paths ?? []).filter(Boolean)),
];
```

## URL Handling

All paths are stored as storage-relative paths in the `pet-media` bucket.

Examples:

- `reports/a.mp4`
- `reports/a-thumb.jpg`
- `reports/landmarks/b.jpg`

The admin side should convert these to public or signed URLs from the `pet-media` bucket before rendering.

## Recommended Admin Helpers

### Card Preview Helper

```ts
function isVideoPath(path?: string | null) {
  return !!path && /\.(mp4|mov|webm)$/i.test(path);
}

function getReportCardPreviewPath(report: {
  photo_path?: string | null;
  video_thumbnail_path?: string | null;
}) {
  if (!report.photo_path) return null;
  if (isVideoPath(report.photo_path)) {
    return report.video_thumbnail_path || null;
  }
  return report.photo_path;
}
```

### Detail Media Helper

```ts
function getReportDetailMediaPaths(report: {
  photo_path?: string | null;
  landmark_media_paths?: string[] | null;
}) {
  return [
    ...(report.photo_path ? [report.photo_path] : []),
    ...((report.landmark_media_paths ?? []).filter(Boolean)),
  ];
}
```

## Final Rule Summary

- use `video_thumbnail_path` for report cards and list previews when the main media is a video
- use `photo_path` as the actual media to open or play
- use `photo_path + landmark_media_paths` together for the full detail carousel

