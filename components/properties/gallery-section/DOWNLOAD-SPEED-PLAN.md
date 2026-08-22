# Plan: Increase Gallery Download Speed

Current flow and where time is spent:

1. **GalleryDownloadSection** – builds a list of items (id, label, folder, url) from filtered gallery (watermarked + non-watermarked).
2. **GalleryDownloadContext.runDownloadJob** – for each item **sequentially**:
   - Sets status to `"downloading"`.
   - `fetch(/api/proxy-image?url=...)` → waits for response.
   - `res.blob()` → reads body.
   - `zip.folder(item.folder)?.file(item.label, blob)`.
   - Sets status to `"done"` or `"failed"`.
3. After all items: `zip.generateAsync({ type: "blob" })` → create download link.

**Main bottleneck:** Images are fetched one-by-one. Network and proxy latency add up; parallel fetches (with a concurrency limit) give the largest speedup.

---

## 1. Parallelize image fetches with a concurrency limit (high impact, medium risk)

**Current:** Strict `for (const item of job.items)` – each image is fetched only after the previous one finishes.

**Change:** Fetch multiple images in parallel with a fixed concurrency (e.g. 4–8). Options:

- **Option A (recommended):** Process items in chunks of N (e.g. 6). Run `Promise.all` on each chunk so 6 fetches run at once; when the chunk completes, add blobs to the zip and update status for those items; then process the next chunk. Preserve order so ZIP layout and status list stay consistent.
- **Option B:** Use a small “pool”: e.g. keep N in-flight requests at all times. When one finishes, start the next. More even throughput but slightly more complex (queue + worker loop).

**Where:** `apps/admin/contexts/GalleryDownloadContext.tsx` – inside `runDownloadJob`, replace the sequential `for` loop with:
- A helper that runs “fetch one item” (fetch → blob → return { item, blob }) for a batch of items via `Promise.all`.
- Loop over chunks (e.g. chunk size 6), await each chunk, then for each result do `zip.folder(...).file(...)` and merge status updates into `currentJob` (one `updateCurrentJob` per chunk to avoid too many re-renders).

**Details:**
- Keep using the same `AbortController` so cancel still aborts all in-flight fetches (pass `signal` into each `fetch`).
- On failure, mark that item as failed but continue with others; don’t let one failure stop the whole job.
- Preserve item order when adding to the zip (chunk results can be ordered by original index).

**Expected:** For 24 images with ~500 ms per image sequential, 6-way parallel could bring total fetch time down to roughly 4 “rounds” × 500 ms ≈ 2 s instead of 12 s (order-of-magnitude improvement).

---

## 2. Batch status updates (medium impact, low risk)

**Current:** Two state updates per item: first “downloading”, then “done” or “failed”. With parallel fetches, many items can complete in the same tick, leading to many sequential `setState` calls if we update per item.

**Change:**
- When processing by chunk: after a chunk completes, call `updateCurrentJob` **once** for the whole chunk (set “done” or “failed” for each item in that chunk). Optionally skip the per-item “downloading” state and rely on the progress bar (e.g. “X of Y images”); or set “downloading” for the whole chunk when the chunk starts.
- Avoid calling `updateCurrentJob` inside the inner `Promise.all` (e.g. don’t update per fetch); collect results and update once per chunk.

**Where:** `GalleryDownloadContext.tsx` – in the new chunked loop, after `Promise.all(chunk)` resolves, compute the new `items` array (status + error for each item in the chunk) and call `updateCurrentJob` once with the merged job.

**Expected:** Fewer re-renders, smoother UI, and less React overhead during heavy download activity.

---

## 3. Faster ZIP creation (medium impact, low risk)

**Current:** `zip.generateAsync({ type: "blob" })` uses default compression. For JPEG/PNG, content is already compressed; deflate adds CPU with little size benefit.

**Change:** Use no compression for the ZIP so generation is faster:
- JSZip supports `compression: "STORE"` (and `compressionOptions: { level: 0 }` for DEFLATE). Use `compression: "STORE"` when adding files: `zip.file(name, blob, { compression: "STORE" })` for each image. Then `generateAsync` is mostly I/O and much faster.

**Where:** `GalleryDownloadContext.tsx` – when calling `zip.folder(item.folder)?.file(item.label, blob)`, pass options: `.file(item.label, blob, { compression: "STORE" })`. If the API differs (e.g. only on generateAsync), set default compression on the zip or per-file according to JSZip docs.

**Expected:** Noticeably faster ZIP generation for many/large images; slightly larger ZIP size (usually acceptable for already-compressed images).

---

## 4. Optional: Reduce “downloading” flicker (small impact, low risk)

**Current:** Each item is set to “downloading” just before its fetch. With parallel chunks, many items show “downloading” then quickly “done”.

**Change:** Either:
- Set the whole chunk to “downloading” when the chunk starts, then to “done”/“failed” when the chunk completes; or
- Omit the “downloading” state and only show “pending” and “done”/“failed” (progress bar still shows completion count). This simplifies state and avoids flicker.

**Where:** `GalleryDownloadContext.tsx` and optionally `GalleryDownloadModalContent.tsx` if you change how “downloading” is displayed.

**Expected:** Clearer, less noisy progress list.

---

## 5. Optional: Server-side batch proxy (lower priority)

If client parallelization and ZIP options are not enough (e.g. many hundreds of images), consider a server endpoint that accepts a list of URLs and returns a ZIP. The server would fetch images in parallel (with concurrency limit), build the ZIP (e.g. with archiver or JSZip on Node), and stream the response. This moves work to the server and can avoid browser connection limits and memory for very large jobs. Not a replacement for the current client-side flow; add as an alternative path (e.g. “Download via server” for large selections).

---

## Implementation order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Parallelize fetches (chunk size 4–8) | Medium | High |
| 2 | Batch status updates (one update per chunk) | Low | Medium |
| 3 | ZIP: use STORE compression for images | Low | Medium |
| 4 | Reduce “downloading” flicker / simplify status | Low | Small |

Suggested order: implement **1** first (biggest win), then **2** and **3** together (fewer re-renders + faster ZIP), then **4** if desired.

---

## Notes

- **Concurrency limit:** 4–8 parallel requests is a good balance. Browsers limit connections per origin (e.g. 6); the proxy is same-origin so 6 is a safe default. Too high can cause queueing or failures.
- **Abort/cancel:** Keep a single `AbortController` and pass its `signal` to every `fetch` so “Cancel” aborts all in-flight requests.
- **Order:** When resolving chunk results, map back to original indices so ZIP file order and modal list order stay consistent with the original `job.items`.
- **Errors:** If some items in a chunk fail, mark them as “failed” and still add successful blobs to the zip; only fail the whole job if something critical (e.g. zip generation) fails.
