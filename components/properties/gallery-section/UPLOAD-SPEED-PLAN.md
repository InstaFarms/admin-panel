# Plan: Increase Gallery Upload Speed

Current flow in `GalleryUploadTab.tsx` (client-side upload) and where time is spent:

1. **getGalleryUploadUrls(propertyId, N)** – one server call; server generates N×3 signed URLs **sequentially** (loop over entries).
2. **Per entry (fully sequential):**
   - Build files: `entryToFile(entry)` → `blobUrlToFile(watermarked)` → `blobUrlToFile(thumbnail)` (each awaited).
   - Upload: `putToSignedUrl(original)` → `putToSignedUrl(watermarked)` → `putToSignedUrl(thumbnail)` (each awaited).
3. **makeGalleryUploadsPublic(paths)** – one server call; already uses `Promise.all` per path.
4. **addGalleryImagesToProperty(propertyId, uploaded)** – one server call.

Bottlenecks: (A) entries are processed one-by-one, (B) within each entry file build and uploads are sequential, (C) server generates URLs for all slots in a sequential loop.

---

## 1. Parallelize within each entry (high impact, low risk)

**Current:** Build original → then watermarked → then thumbnail; then upload original → watermarked → thumbnail.

**Change:**
- Build all 3 files in parallel: `Promise.all([entryToFile(entry), blobUrlToFile(...), blobUrlToFile(...)])` (use `null` for watermarked/thumbnail when not available).
- Upload all 3 in parallel: `Promise.all([putToSignedUrl(original), putToSignedUrl(watermarked), putToSignedUrl(thumbnail)].filter(Boolean))` (skip nulls).

**Where:** `GalleryUploadTab.tsx` – inside the per-entry `try` block, replace the sequential `await` chain with two `Promise.all` steps (prepare files, then upload).

**Expected:** Roughly 2–3× faster per entry (e.g. 3 uploads in parallel instead of 3 in sequence).

---

## 2. Parallelize across entries with a concurrency limit (high impact, medium risk)

**Current:** Entries are processed in a strict `for` loop; entry 2 starts only after entry 1 is fully done.

**Change:**
- Process entries with a fixed concurrency (e.g. 3–5 at a time). Options:
  - **Option A:** Use a small “pool”: e.g. `pLimit` or a simple `Promise.all` on chunks of 3–5 entries so 3–5 entries run in parallel (each entry still does its own parallel file build + upload as in plan 1).
  - **Option B:** Process all entries in parallel (no limit). Simpler but can overwhelm the browser (many concurrent PUTs and memory for many Blobs).

**Recommendation:** Option A with concurrency 3–4. Implement a helper that takes `entries`, `slots`, and `concurrency`, and runs “process one entry” (build 3 files + upload 3) in parallel for up to `concurrency` entries at a time, then moves to the next batch until done. Aggregate `allPaths` and `uploaded` and keep per-entry status updates so the UI still shows progress.

**Where:** `GalleryUploadTab.tsx` – replace the `for (let i = 0; i < entries.length; i++)` loop with a concurrent runner (e.g. chunked `Promise.all` or a queue).

**Expected:** For 12 entries, ~4× faster than full sequential if we run 4 in parallel (and each entry is already 2–3× faster from plan 1).

---

## 3. Parallelize signed URL generation on the server (medium impact, low risk)

**Current:** `getGalleryUploadUrls` loops over `count` and for each slot awaits 3× `getSignedUploadUrl` (already in parallel per slot), but slots are generated one after another.

**Change:** Generate all slots in parallel: e.g. `const slots = await Promise.all(Array.from({ length: count }, (_, i) => createSlot(i)))` where `createSlot` generates one slot’s paths and its 3 signed URLs (with the existing `Promise.all` for the 3 URLs).

**Where:** `apps/admin/actions/imageActions.ts` – inside `getGalleryUploadUrls`, replace the `for` loop with a single `Promise.all` over `count` slot creations.

**Expected:** Shorter time to get URLs when N is large (e.g. 20+ images).

---

## 4. Reduce React state updates during upload (small impact, low risk)

**Current:** We call `setUploadStatuses` multiple times per entry (uploading, then success/error), which can cause many re-renders.

**Change:**
- Prefer a single status update per entry when the entry finishes (success or error), instead of “uploading” then “success”.
- Optionally batch updates: collect status changes and call `setUploadStatuses` once per “batch” of entries (e.g. every 3–5 entries) for progress, and once at the end for final state. Or keep one update per entry but avoid intermediate “uploading” if we already show a global “Uploading…” indicator.

**Where:** `GalleryUploadTab.tsx` – adjust when and how often we call `setUploadStatuses` during the concurrent upload loop.

**Expected:** Fewer re-renders and slightly smoother UI; minor speed gain.

---

## 5. Optional: Prefer same-origin proxy if CORS is slow or flaky (fallback)

If direct PUTs to GCS from the browser are slow or unreliable (e.g. CORS, network), consider a fallback: client sends one FormData per image (original + watermarked + thumbnail) to your backend, and the backend uploads to GCS (server-to-server, no CORS). This can be faster in some networks and avoids CORS. Not a refactor of the current client-direct flow, but an alternative path if needed.

---

## Implementation order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Parallelize within entry (build 3 files + upload 3 in parallel) | Low | High |
| 2 | Parallelize across entries (concurrency 3–4) | Medium | High |
| 3 | Parallelize getGalleryUploadUrls slot generation | Low | Medium |
| 4 | Fewer status updates during upload | Low | Small |

Suggested order: do **1** first (quick win), then **2** (biggest overall speedup), then **3** and **4** as polish.

---

## Implemented (points 1–4)

- **1.** In `GalleryUploadTab.tsx`: `processEntry` now builds all 3 files with `Promise.all` and uploads all 3 with `Promise.all`.
- **2.** Entries are processed in chunks of 4 (`CONCURRENCY = 4`) via chunked `Promise.all`; results are written by index so order is preserved.
- **3.** In `imageActions.ts`: `getGalleryUploadUrls` uses `Promise.all(Array.from({ length: count }, () => createSlot()))` so all slots are generated in parallel.
- **4.** Status is set only when an entry completes (success or error); no per-entry "uploading" or "converting" updates.

---

## Notes

- **Concurrency limit:** Keep 3–4 parallel entries to avoid too many simultaneous PUTs (browser/network limits) and to avoid memory spikes from building many Blobs at once.
- **Error handling:** With parallel entry processing, ensure one failing entry doesn’t break the whole batch; collect errors per entry and still call `makeGalleryUploadsPublic` and `addGalleryImagesToProperty` for successful uploads.
- **Order of results:** When running entries in parallel, maintain the same order in `uploaded` and `allPaths` (e.g. by indexing with `i` and writing into preallocated arrays or sorting by entry index before calling backend).
