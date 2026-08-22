# Plan: Bulk "Create Instafarms Watermarked Images"

## Overview

Add a new bulk conversion flow that finds images with `originalUrl` but missing `watermarkedUrlByInstafarms` and/or `thumbnailUrl`, processes them in batches, and saves to DB. The existing per-card "Convert selected" flow remains unchanged.

---

## Current Setup (Keep As-Is)

| Component | Behavior |
|-----------|----------|
| **GalleryTabContent** | User selects cards via checkbox → "Convert (N)" button appears |
| **handleConvertSelected** | Builds `ConvertGalleryItemInput[]` from selected items, calls `convertGalleryToWatermarkServer` |
| **convertGalleryToWatermarkServer** | Fetches each image, applies watermark, creates thumbnail, uploads to Firebase, updates DB via `updatePropertyGalleryUrls` |
| **Processing** | Sequential (one image at a time in a for-loop) |

---

## New Setup: "Create Instafarms watermarked images"

### 1. API: Fetch photos needing conversion

**Endpoint:** `GET /api/properties/:id/gallery/needs-watermark?limit=10`

**Logic (if-api):**
- Query `photos` joined with `propertyPhotos` where `propertyPhotos.propertyId = :id`
- Filter: `originalUrl IS NOT NULL AND originalUrl != ''` AND `(watermarkedUrlByInstafarms IS NULL OR watermarkedUrlByInstafarms = '')`
- Order by `propertyPhotos.sortOrder` (or any stable order)
- Limit: `limit` (default 10, max 20)
- Return: `{ photos: [{ id, originalUrl }] }`

**Why API-side:** Admin app proxies to if-api for DB access; photos live in if-api's DB.

---

### 2. Admin action: Fetch + convert batch

**New action:** `convertPropertyGalleryMissingWatermarks(propertyId, options?)`

```ts
// In imageActions.ts or propertyActions.ts
export const convertPropertyGalleryMissingWatermarks = async (
  propertyId: string,
  options?: { batchSize?: number }
): Promise<{ success?: boolean; convertedCount?: number; pendingCount?: number; error?: string }>
```

**Flow:**
1. Call `fetchPropertyGalleryNeedsWatermark(propertyId, options?.batchSize ?? 10)`
2. If `photos.length === 0` → return `{ success: true, convertedCount: 0, pendingCount: 0 }` (or a specific "all done" message)
3. Map to `ConvertGalleryItemInput[]`: `{ id, sourceUrl: originalUrl, hasUnwatermarkedOriginal: true }`
4. Call `convertGalleryToWatermarkServer(propertyId, items)` (reuse existing)
5. Return `{ success: true, convertedCount, pendingCount: ... }` (optional: refetch needs-watermark to report remaining)

---

### 3. Admin action: Fetch needs-watermark

**New action:** `fetchPropertyGalleryNeedsWatermark(propertyId, limit?)`

```ts
// In propertyActions.ts
export const fetchPropertyGalleryNeedsWatermark = async (
  propertyId: string,
  limit = 10
): Promise<{ photos?: { id: string; originalUrl: string }[]; error?: string }>
```

- Calls `GET /api/properties/:propertyId/gallery/needs-watermark?limit=10`
- Returns the array of photos

---

### 4. API route in if-api

**File:** `apps/if-api/src/routes/properties.ts`

**Route:** `GET /:id/gallery/needs-watermark`

**Query params:** `limit` (default 10, max 20)

**Implementation:**
```ts
// Select from photos JOIN propertyPhotos
// WHERE propertyPhotos.propertyId = id
//   AND photos.originalUrl IS NOT NULL AND photos.originalUrl != ''
//   AND (photos.watermarkedUrlByInstafarms IS NULL OR photos.watermarkedUrlByInstafarms = '')
// ORDER BY propertyPhotos.sortOrder
// LIMIT limit
```

---

### 5. UI: Button placement

**Option A (recommended):** Add button in `CategoryTabToolbar` next to "Convert (N)" and "Update in database"
- Label: **"Create Instafarms watermarked images"**
- Shown when user is on any gallery tab (Outdoors, Indoors, etc.) OR as a global gallery action
- No selection needed; works on all property photos missing watermarks

**Option B:** Add in `GallerySection` as a standalone action above/below tabs
- Visible on all gallery tabs
- One click processes up to N images across the whole property

**Recommendation:** Option B or a dedicated section in the toolbar so it’s clear it’s a property-level bulk action, not per-category.

---

### 6. Processing Modal

A modal opens when bulk conversion starts and stays open until done or cancelled.

**Modal content:**
- **Title:** "Creating Instafarms watermarked images"
- **Stats row:** Total converted | Current batch progress (e.g. "Processing batch 2…")
- **Table/list of images** (no image preview, just data):
  | id (short) | fileName | Status |
  |-------------|----------|--------|
  | abc123…     | photo1.jpg | ✓ Done |
  | def456…     | photo2.jpg | Converting… |
  | ghi789…     | photo3.jpg | Pending |
- **Pause / Cancel button:** Stops fetching new batches; current batch finishes first
- **Close button:** Enabled when processing stopped (done or cancelled)

**Per-image data shown:** `id` (truncated), `fileName`/`name`, `status` (Pending | Converting | Done | Failed)

**State updates:**
- When batch fetch returns → add rows with status "Pending"
- When convert starts for a batch → set those rows to "Converting"
- When convert returns → set to "Done" or "Failed" per item
- Total converted count updates in real time

---

### 7. Pause / Cancel behavior

| User action | Behavior |
|-------------|----------|
| **Click Pause or Cancel** | Set `cancelledRef = true` (or `cancelled` state) |
| **Current batch** | Continues to completion — already-in-flight images finish |
| **After current batch** | No new `fetchPropertyGalleryNeedsWatermark` call; loop exits |
| **Modal** | Shows "Stopped by user" when loop exits due to cancel |

**Implementation:** Pass an `AbortSignal` or `cancelledRef` (e.g. `useRef(false)`) into the processing loop. Before each new batch fetch, check `if (cancelledRef.current) break`. The current `convertGalleryToWatermarkServer` call runs to completion — we don't abort mid-batch.

---

### 8. Optimizing API calls (reduce continuous fetching)

**Problem:** Client loop of fetch → convert → fetch → convert… creates many round-trips.

**Optimizations:**

| Strategy | Implementation |
|----------|----------------|
| **1. Larger fetch batch** | Fetch 20–30 per `needs-watermark` call instead of 10. Fewer fetches for same total images. |
| **2. Single pre-fetch** | Optional: `GET needs-watermark?limit=100` returns up to 100 IDs + `originalUrl`. Client processes in chunks of 10–20, no further fetch until that list is exhausted. Then one more fetch for next 100 if user hasn't cancelled. |
| **3. Backend batch endpoint** | `POST /properties/:id/gallery/convert-missing-watermarks-batch` — accepts `{ limit?: number }`, does internally: fetch N → convert N → return. Client still loops but each iteration is one API call that does both fetch + convert. Reduces to 1 round-trip per batch. |
| **4. Backend loop endpoint** | `POST /properties/:id/gallery/convert-all-missing-watermarks` — backend loops fetch+convert until done or `maxImages` (e.g. 50). Returns final count. No streaming progress; modal would show "Processing…" until request completes. Simpler but no per-batch progress. |

**Recommended: Strategy 2 (pre-fetch larger set)**

```
1. fetch needs-watermark(limit=30) → get 30 photos
2. Add all 30 to modal with status "Pending"
3. Process in chunks of 10: convert batch 1 (indices 0–9) → update 10 rows to "Done"
4. If cancelled, stop
5. Convert batch 2 (10–19) → update 10 rows
6. If cancelled, stop
7. Convert batch 3 (20–29) → update 10 rows
8. If no more from fetch and not cancelled → fetch needs-watermark(limit=30) again
9. Repeat until fetch returns empty or cancelled
```

**Result:** 1 fetch per 30 images instead of 1 fetch per 10. Modal gets 30 rows upfront; we process 3 batches from that list before next fetch.

---

### 10. Speed optimizations (server-side)

| Change | Benefit |
|--------|---------|
| **Parallel processing in `convertGalleryToWatermarkServer`** | Process batch of 10 in parallel via `Promise.all` (with concurrency limit) instead of sequential for-loop |
| **Batch size** | 10–20 images per request balances throughput and memory |
| **Reuse watermark settings** | Already fetched once per batch (no change) |
| **Reuse download + process** | Per image: download → watermark + thumbnail in parallel → upload both → done. Can run N images concurrently with a limit (e.g. p-limit or manual chunks) |

**Implementation detail:** In `convertGalleryToWatermarkServer`, replace:
```ts
for (const item of items) { ... }
```
with:
```ts
const CONCURRENCY = 5; // or 10
const results = await pLimit(items, CONCURRENCY, async (item) => { ... });
```
or process in chunks of 5 with `Promise.all` per chunk. Avoid processing 20 large images at once to prevent memory spikes.

---

### 11. File changes summary

| File | Change |
|------|--------|
| `apps/if-api/src/routes/properties.ts` | Add `GET /:id/gallery/needs-watermark` (include `name` for modal display) |
| `apps/admin/actions/propertyActions.ts` | Add `fetchPropertyGalleryNeedsWatermark` |
| `apps/admin/actions/imageActions.ts` | Add `convertPropertyGalleryMissingWatermarks`; optionally parallelize `convertGalleryToWatermarkServer` |
| **`BulkWatermarkModal.tsx`** (new) | Modal: image list (id, fileName, status), total converted, Pause/Cancel, Close |
| `apps/admin/components/.../CategoryTabToolbar.tsx` | Add prop `onBulkCreateWatermarks`, `bulkCreating` and new button |
| `apps/admin/components/.../GalleryTabContent.tsx` | Add `handleBulkCreateWatermarks`, modal state, processing loop with cancel check |
| `apps/admin/components/.../GallerySection.tsx` | Pass handler to GalleryTabContent (or implement at section level) |

---

### 12. Processing loop (client) — cancel-aware

```ts
// Pseudocode in handleBulkCreateWatermarks
const cancelledRef = useRef(false);
const [modalOpen, setModalOpen] = useState(false);
const [progress, setProgress] = useState({ items: [], totalConverted: 0 });

setModalOpen(true);
cancelledRef.current = false;

while (true) {
  if (cancelledRef.current) break;
  const { photos } = await fetchPropertyGalleryNeedsWatermark(propertyId, 30);
  if (!photos?.length) break;

  setProgress(p => ({ ...p, items: [...p.items, ...photos.map(ph => ({ ...ph, status: 'Pending' }))] }));

  for (let i = 0; i < photos.length; i += 10) {
    if (cancelledRef.current) break;
    const batch = photos.slice(i, i + 10);
    setProgress(p => ({ ...p, items: /* mark batch as Converting */ }));
    const result = await convertGalleryToWatermarkServer(propertyId, batch.map(...));
    setProgress(p => ({ ...p, items: /* mark batch Done/Failed */, totalConverted: p.totalConverted + result.convertedCount }));
  }
}

setModalOpen(false); // or keep open with "Done" / "Stopped" state
```

---

### 13. Edge cases

- **originalUrl empty/invalid:** Skip in API or in converter; don’t count as converted
- **Watermark settings missing:** Same error as existing flow: "Instafarm watermark not configured"
- **Partial failure:** Existing `convertGalleryToWatermarkServer` skips failed items and continues; report `convertedCount` only for successes
- **No remaining images:** Modal shows "All images already have watermarks"; close or show empty list
- **Partial failure (per row):** Mark failed rows as "Failed" in modal
- **Modal UX:** Close button disabled until processing has stopped (done or cancelled)

---


- x don’t refetch needs-watermark for `pendingCount`
- Or: `GET needs-watermark` can return `totalPending` (count) in response for UX (e.g. "X images remaining")
- Simpler: only show "Converted N. Click again to process more." if `convertedCount > 0`
