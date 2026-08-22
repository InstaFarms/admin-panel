# Plan: Convert Selected Images to Watermark & Thumbnail

## Overview
Allow users to select gallery cards within each category tab, then convert those selected images to watermarked and thumbnail versions, save the new URLs to the database, and update both `properties` and `entities` related tables.

---

## 1. UI Changes

### 1.1 Card Selection
- **GalleryImageCard** / **SortableGalleryCard**: Add a checkbox or selection indicator (e.g. top-left corner checkbox) so users can multi-select cards.
- **Selection state**: Lift selection state to `GalleryTabContent` or `usePropertyGallery` so it’s per-tab. Structure: `selectedPhotoIds: Set<string>` per `tabKey`, or `Record<tabKey, Set<string>>`.
- **Visual feedback**: Selected cards get a ring/highlight (e.g. `ring-2 ring-emerald-500`).

### 1.2 "Convert" Button
- **Location**: Beside "Delete all" in `CategoryTabToolbar`.
- **Visibility**: Show only when `hasItems && selectedCount > 0`.
- **Label**: e.g. "Convert to watermark & thumbnail" or "Generate watermark & thumbnail".
- **Props**: `onConvertSelected: () => void`, `selectedCount: number`, `converting?: boolean`.

### 1.4 Blocking Overlay During Conversion
- **Requirement**: While conversion is in progress, the user must not interact with other parts of the admin panel (sidebar, tabs, other property fields, etc.).
- **Implementation**: Show a full-screen blocking overlay with `position: fixed; inset: 0` during `converting === true`. Use `pointer-events: auto` on the overlay so it captures all clicks and blocks interaction with content behind it.
- **Content**: Semi-transparent dark backdrop, centered spinner, progress text (e.g. "Converting 3/12..."), and optionally a "Cancel" button.
- **z-index**: Use `z-[9998]` or higher so it sits above navbar (`z-50`), sidebar, modals, sticky gallery bar, and other UI.

### 1.3 CategoryTabToolbar Updates
- Add `selectedCount` and `onConvertSelected` (and optionally `converting`).
- Render the Convert button next to Delete all (e.g. `flex gap-2`).
- Icon: e.g. `HiPhotograph` or `HiRefresh`.

---

## 2. Client-Side Processing

### 2.1 Source Image
- Use **originalUrl** if available.
- Fallback: **watermarkedUrlByInstafarms**, then **rawUrl**, then **photoUrl**.
- CORS: Fetch with `mode: 'cors'` or proxy if needed; images from Firebase Storage should usually work.

### 2.2 Reuse Upload Utilities
- **createWatermarkClient** (`upload-tab/utils.ts`): Input = image URL (blob or http), watermark image URL, optional display number. Returns `{ url: string, size: number }` (blob URL).
- **createThumbnailClient**: Input = image URL. Returns `{ url: string, size: number }` (blob URL).
- **getWatermarkData**: Use existing Settings flow (Instafarm watermark URL + display number). Same as `GalleryUploadTab` / `processEntriesPreview`.

### 2.3 Processing Flow (per selected photo)
1. Fetch source image → get blob/object URL (or use existing URL if same-origin).
2. Call `createWatermarkClient(sourceUrl, watermarkUrl, displayNumber)` → watermarked blob URL.
3. Call `createThumbnailClient(sourceUrl)` → thumbnail blob URL. (Use original for thumbnail quality.)
4. Convert blobs to `File` via `blobUrlToFile`.
5. Proceed to upload (next step).

### 2.4 Upload Flow
- **getGalleryUploadUrls**: Already supports getting signed URLs for original + watermarked + thumbnail. For conversion we only need watermarked + thumbnail slots.
- **Option A** – New server action: `getGalleryConvertUrls(propertyId, photoIds)` that returns one slot per photo: `{ watermarked: { uploadUrl, publicUrl, path }, thumbnail: { uploadUrl, publicUrl, path } }`.
- **Option B** – Reuse `getGalleryUploadUrls(propertyId, count)`: Request one slot per selected photo; upload only watermarked and thumbnail (no original).
- **Upload**: PUT watermarked File and thumbnail File to signed URLs.
- **makeGalleryUploadsPublic**: Call with all uploaded paths.
- **Persist URLs**: New API (see below) to update `photos` with the new URLs.

---

## 3. Backend Changes

### 3.1 New API: Update Photo URLs
**Option A – Extend PATCH `/properties/:id/gallery`**
- Add optional fields to each update item: `originalUrl?: string`, `watermarkedUrlByInstafarms?: string`, `thumbnailUrl?: string`.
- In handler, if any are provided, include them in `photoUpdate` and update `s.photos`.
- `propertyPhotos` and `entityPhotos` reference `photoId` only; no URL columns. URLs live in `photos`. So one update to `photos` affects both property and entity.

**Option B – New PATCH endpoint**
- e.g. `PATCH /properties/:id/gallery/urls`
- Body: `{ updates: Array<{ photoId, originalUrl?, watermarkedUrlByInstafarms?, thumbnailUrl? }> }`
- Only updates `s.photos`; entities are handled because they share the same `photos` rows.

Recommendation: **Option A** – extend existing PATCH to avoid extra endpoints.

### 3.2 Schema
- `photos`: already has `originalUrl`, `watermarkedUrlByInstafarms`, `thumbnailUrl`.
- `propertyPhotos`: only `propertyId`, `photoId`, `key`.
- `entityPhotos`: only `entityId`, `photoId`, `key`.
- Updating `photos` is enough; entities and properties both use the same `photos` rows via junction tables.

---

## 4. Signed URL for Conversion-Only Uploads

Current `getGalleryUploadUrls` returns one slot with `original`, `watermarked`, `thumbnail`.

For conversion:
- We only upload watermarked + thumbnail (original already exists).
- Either:
  - **A**: Add `getGalleryConvertUrls(propertyId, photoIds)` returning `{ photoId, watermarked: {...}, thumbnail: {...} }[]`.
  - **B**: Reuse `getGalleryUploadUrls(propertyId, selectedCount)` and upload only watermarked + thumbnail to the given slots; ignore original slot.

B is simpler and reuses existing logic. Paths: `{baseId}_instafarm.jpg`, `{baseId}_thumb.jpg`. Original path can be left unused.

---

## 5. Data Flow Summary

```
User selects cards in tab (e.g. Outdoors)
  → Clicks "Convert to watermark & thumbnail"
  → For each selected photo:
      1. Get source URL (originalUrl || watermarkedUrlByInstafarms || rawUrl)
      2. createWatermarkClient(source, watermarkSettings) → blob
      3. createThumbnailClient(source) → blob
      4. blobUrlToFile(blob) → File
  → getGalleryUploadUrls(propertyId, selectedCount)
  → For each slot: putToSignedUrl(watermarked), putToSignedUrl(thumbnail)
  → makeGalleryUploadsPublic(allPaths)
  → PATCH /properties/:id/gallery with { photoId, watermarkedUrlByInstafarms, thumbnailUrl } per photo
  → refetchGallery()
```

---

## 6. File Changes Checklist

| File | Changes |
|------|---------|
| `GalleryImageCard.tsx` | Add `selected`, `onToggleSelect` props; render checkbox/selection indicator |
| `SortableGalleryCard.tsx` | Pass through selection props to GalleryImageCard |
| `CategoryTabToolbar.tsx` | Add `selectedCount`, `onConvertSelected`, `converting`; render Convert button |
| `GalleryTabContent.tsx` | Selection state; handlers for toggle and convert; pass props to toolbar & cards; render blocking overlay when converting |
| `usePropertyGallery.ts` | (Optional) selection state per tab if lifted here |
| `upload-tab/utils.ts` | Possibly export `createWatermarkClient`, `createThumbnailClient` if not already; add helper to fetch image as blob from URL for cross-origin |
| `imageActions.ts` | Either reuse `getGalleryUploadUrls` or add `getGalleryConvertUrls` |
| `propertyActions.ts` | Add `updatePropertyGalleryUrls(propertyId, updates)` calling extended PATCH |
| `if-api/routes/properties.ts` | Extend PATCH `/properties/:id/gallery` to accept `originalUrl`, `watermarkedUrlByInstafarms`, `thumbnailUrl` |

---

## 7. Edge Cases

1. **Watermark not configured**: Show error toast; disable or warn before conversion.
2. **CORS**: If source URLs are cross-origin, canvas may be tainted. Options: use existing same-origin URLs, proxy via backend, or ensure Firebase Storage CORS allows reads.
3. **No original**: If only watermarked exists, use it as source for thumbnail (watermark for watermark would be redundant – skip or use as-is).
4. **Partial failure**: If some conversions fail, report per-item errors; still save and make public the successful ones.
5. **Entity sync**: No extra entity logic needed; `photos` is shared.

---

## 8. Potential Issues & Mitigations

### 8.1 Slot-to-PhotoId Mapping (Critical)
**Issue**: `getGalleryUploadUrls(propertyId, count)` returns slots with random UUIDs; there is no `photoId` in each slot. The PATCH update needs `{ photoId, watermarkedUrlByInstafarms, thumbnailUrl }` per photo.

**Mitigation**: Preserve strict ordering. Process selected photos in a deterministic order (e.g. by `items` array order). Map `slot[i]` → `selectedPhotoIds[i]` so `slot[i].watermarked.publicUrl` and `slot[i].thumbnail.publicUrl` are saved for `selectedPhotoIds[i]`. Avoid parallel processing that could reorder results unless you explicitly track indices in the Promise results.

### 8.2 CORS / Tainted Canvas
**Issue**: `loadImage` sets `crossOrigin = "anonymous"`. Images from Firebase Storage must be served with `Access-Control-Allow-Origin` (or `*`). If the storage bucket CORS is misconfigured, `img.onload` may fire but `canvas.toBlob` can throw due to tainted canvas.

**Mitigation**: Test with production Firebase URLs. Ensure Firebase Storage CORS allows `Origin` and `GET`. If it fails, add a server-side proxy: `GET /api/proxy-image?url=...` that fetches the image and returns it with appropriate CORS headers.

### 8.3 putToSignedUrl Not Exported
**Issue**: `putToSignedUrl` is defined inline in `GalleryUploadContext.tsx` and is not exported. The conversion handler cannot call it directly.

**Mitigation**: Extract to a shared util (e.g. `utils/uploadUtils.ts` or `imageActions.ts`) and use in both `GalleryUploadContext` and the conversion handler.

### 8.4 Blob URL Memory Leak
**Issue**: `createWatermarkClient` and `createThumbnailClient` return blob URLs. If not revoked after converting to File, each conversion retains memory.

**Mitigation**: After `blobUrlToFile(blobUrl)`, call `URL.revokeObjectURL(blobUrl)` in a `finally` block. Do this for both watermarked and thumbnail blob URLs.

### 8.5 Double Watermark When Source Is Already Watermarked
**Issue**: If only `watermarkedUrlByInstafarms` exists (no original), using it as source and running `createWatermarkClient` would apply watermark again (double watermark).

**Mitigation**: When source is already watermarked, **skip** watermark generation. Use existing watermarked URL as the new `watermarkedUrlByInstafarms`. Still generate thumbnail from the watermarked source.

### 8.6 GalleryData Field Mapping
**Issue**: API returns `rawUrl` (maps to `originalUrl` in DB) and `photoUrl` (watermarked || original). Plan says source = "originalUrl || watermarkedUrlByInstafarms || rawUrl". In `GalleryData`, `rawUrl` and `originalUrl` may both be set from the API; `rawUrl` is the usual display name for original.

**Mitigation**: Use consistent fallback: `item.originalUrl || item.rawUrl || item.watermarkedUrlByInstafarms || item.photoUrl`. Ensures we prefer original for best quality.

### 8.7 Concurrency / Browser Limits
**Issue**: Converting many images (e.g. 20) means 20× watermark + 20× thumbnail = 40 canvas operations, then 40 PUTs. Can overwhelm the browser (memory, connections).

**Mitigation**: Process in batches (e.g. 3–4 at a time), similar to `UPLOAD_CONCURRENCY = 4` in `GalleryUploadContext`. Show progress (e.g. "Converting 5/12...").

### 8.8 Selection vs. Drag-and-Drop
**Issue**: Cards are wrapped in `SortableGalleryCard` with `useSortable`. Adding a checkbox could conflict with drag handle (user might accidentally reorder when trying to click checkbox).

**Mitigation**: Place checkbox in a non-draggable area (e.g. top-left, outside the drag handle). Ensure the drag handle is clearly separated (currently it's a vertical dots icon on the left).

### 8.9 PATCH Payload Compatibility
**Issue**: Extending PATCH with URL fields means the same endpoint handles both "Update in database" (name, alt, key, order) and "Convert" (URLs). Ensure the client sends only the fields that changed. Sending `fileName`, `altText`, etc. from convert flow could overwrite user edits if they had unsaved changes.

**Mitigation**: Convert flow should send only `{ photoId, watermarkedUrlByInstafarms, thumbnailUrl }` — a dedicated action/API call. Don't mix with the general "Update in database" payload.

---

## 9. Implementation Order

1. Extract `putToSignedUrl` to shared util.
2. Extend PATCH `/properties/:id/gallery` for `watermarkedUrlByInstafarms`, `thumbnailUrl` (or add dedicated PATCH for URLs only).
3. Add `updatePropertyGalleryUrls` in `propertyActions` — send only URL updates, not mixed with name/alt/key/order.
4. Add selection state and UI in cards and toolbar.
5. Implement conversion handler with batch concurrency and blob URL cleanup.
6. Wire Convert button and error handling.
