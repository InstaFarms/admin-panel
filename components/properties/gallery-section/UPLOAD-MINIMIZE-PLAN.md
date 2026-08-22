# Plan: Minimizable Upload Modal (mirror Download flow)

## Goal
Allow the gallery **upload** modal to be minimized (like the download modal) so the user can do other tasks while uploads run in the background. A compact status appears in the navbar; "Expand" reopens the modal.

## Current Download Flow (reference)
- **GalleryDownloadContext**: Holds `phase`, `currentJob`, `modalOpen`, `overallError`. Provides `startDownload(items)`, `openModal`, `closeModal`, `cancelDownload`, `dismissSuccessPopup`. Renders the modal when `modalOpen` is true.
- **GalleryDownloadSection**: Calls `startDownload(buildDownloadList())` when user clicks "Download as ZIP". Job starts immediately and modal opens.
- **GalleryDownloadModalContent**: Modal UI with progress, per-item status, "Cancel Task", and a header button (minus icon) that calls `onClose` (currently `closeModal` = full reset).
- **GalleryDownloadHeaderStatus**: Rendered in **Navbar**. Visible only when `phase === "downloading" || phase === "creating_zip"`. Shows progress %, "Cancel Task", "Expand" (`openModal`). So when the user "minimizes", they would set `modalOpen: false` (job keeps running) and this navbar pill appears.
- **Layout**: Wraps app with `GalleryDownloadProvider`.

Note: In the current download code, the header button calls `closeModal`, which resets phase and job. To support true "minimize", download would need a **minimize** action that only sets `modalOpen: false` when the job is running; "Close" could reset only when idle/done/error. This plan assumes we want that pattern for upload from the start.

---

## Upload Flow Today
- **GalleryUploadTab**: Local state: `entries`, `uploadModalOpen`, `uploadStatuses`, `uploading`. Renders `UploadModal` (from upload-tab). User clicks "Upload to property gallery" → `openUploadModal()` (sets statuses, opens modal). User clicks "Start upload" → `startUpload()` runs (getGalleryUploadUrls, PUT files, makeGalleryUploadsPublic, addGalleryImagesToProperty) and updates local `uploadStatuses`. On success, clears entries and closes modal.
- Upload is two-step: open modal → click "Start upload". The actual upload logic lives inside `GalleryUploadTab.startUpload`.

---

## Implementation Plan

### 1. GalleryUploadContext (new file: `contexts/GalleryUploadContext.tsx`)

**State:**
- `phase`: `'idle' | 'uploading' | 'done' | 'error'`
- `currentJob`: `{ propertyId: string; entries: UploadEntry[]; uploadStatuses: Record<string, UploadStatusState> } | null`
- `overallError`: `string | null`
- `modalOpen`: `boolean`

**API:**
- `prepareUpload(propertyId: string, entries: UploadEntry[])`: Store a **copy** of `propertyId` and `entries` in context, initialize `uploadStatuses` to pending for each entry, set `modalOpen: true`, set `phase: 'idle'`. Does not start the upload. (Called when user clicks "Upload to property gallery" in the tab.)
- `startUpload(onUploadSuccess?: () => void)`: If there is a current job and phase is idle, set `phase: 'uploading'` and run the existing upload logic (same as current `GalleryUploadTab.startUpload`): getGalleryUploadUrls, concurrent PUTs, makeGalleryUploadsPublic, addGalleryImagesToProperty. Update `currentJob.uploadStatuses` (and thus state) as each entry completes. On success: call `onUploadSuccess?.()`, set `phase: 'done'`, show toast. On failure: set `phase: 'error'`, set `overallError` or per-entry errors. Use an `AbortController` so we can cancel in-flight requests.
- `cancelUpload()`: Abort controller, set `phase: 'idle'`, `currentJob: null`, `modalOpen: false`, `overallError: null`.
- `openModal()`: Set `modalOpen: true` (Expand from navbar).
- `minimizeModal()`: Set `modalOpen: false` only. Job and phase unchanged. Use this when user clicks the minimize (minus) button in the modal header while upload is running or before start.
- `closeModal()`: Set `modalOpen: false`. If phase is not `'uploading'`, also set `phase: 'idle'`, `currentJob: null`, `overallError: null` (full reset so user can start a new upload from the tab). When phase is `'uploading'`, calling close could be treated as minimize (same as `minimizeModal`) so the upload continues.
- `dismissSuccessPopup()`: After success, user can dismiss; set `modalOpen: false`, `phase: 'idle'`, `currentJob: null`.

**Computed:**
- `completedCount`, `totalCount` from `currentJob.uploadStatuses` (same as today: success + error count vs total entries).

**Modal rendering:**
- Provider renders `<Modal show={modalOpen} onClose={...}>` with `GalleryUploadModalContent` when `modalOpen` is true. Content receives `phase`, `currentJob`, `overallError`, `completedCount`, `totalCount`, `onCancel`, `onClose`, `onMinimize`. Use `onMinimize` for the header minus button (minimize only); `onClose` can be used for a "Close" action when done or to mean minimize when running.

**Dependencies:**
- Reuse upload helpers from `@/actions/imageActions`, `@/actions/propertyActions`, and `upload-tab/utils` (`entryToFile`, `blobUrlToFile`, `buildGalleryDataFromClientUrls`). Import types from `upload-tab/types` and `@/utils/types` (GalleryData).

---

### 2. GalleryUploadModalContent (new file: `contexts/GalleryUploadModalContent.tsx`)

- Mirror structure of **GalleryDownloadModalContent**.
- **Header**: Title "Upload images to property gallery", and a **minimize** button (minus icon) that calls `onMinimize` (so user can minimize and do other work). Optional: when phase is done/error, show "Close" that calls `onClose` (full reset).
- **Body**: Progress bar (when `phase === 'uploading'`), overall error if any, and the list of entries with status (reuse **UploadStatusList** from upload-tab, fed from `currentJob.entries` and `currentJob.uploadStatuses`). Tabs for "Original / Watermarked / Thumbnail" like current UploadModal.
- **Footer**: "Cancel Task" when `phase === 'uploading'` (calls `onCancel`); when idle, "Start upload" button (calls `startUpload` from context via a callback prop) and "Cancel" (close without starting). When done/error, "Close" or "Done" that calls `onClose` / `dismissSuccessPopup`.
- Props: `phase`, `currentJob`, `overallError`, `completedCount`, `totalCount`, `onStartUpload`, `onCancel`, `onClose`, `onMinimize`.

---

### 3. GalleryUploadHeaderStatus (new file: `components/properties/gallery-section/GalleryUploadHeaderStatus.tsx`)

- Same pattern as **GalleryDownloadHeaderStatus**.
- Use `useGalleryUpload()`.
- Render only when `phase === 'uploading'`.
- Show: spinner, progress text (e.g. `completedCount/totalCount`, percent), "Cancel Task" button, "Expand" button (`openModal`).
- Styling: re-use the same pill style as download (e.g. green/emerald for upload to differentiate from blue download, or keep blue for consistency).

---

### 4. Layout: Add GalleryUploadProvider

- In `app/layout.tsx`, wrap (or nest with) **GalleryDownloadProvider** with **GalleryUploadProvider** so both contexts are available (e.g. `GalleryDownloadProvider` > `GalleryUploadProvider` > children, or side-by-side with a single wrapper that provides both).

---

### 5. Navbar: Show upload status when uploading

- In **Navbar**, render **GalleryUploadHeaderStatus** next to **GalleryDownloadHeaderStatus** (e.g. both in the same flex area). When an upload is in progress, the upload pill appears; when a download is in progress, the download pill appears; both can be visible if both run.

---

### 6. GalleryUploadTab refactor

- **Remove**: Local `uploadModalOpen`, `uploadStatuses` (for the modal), `uploading`, and the local **UploadModal** render.
- **Add**: `useGalleryUpload()`. When user clicks "Upload to property gallery", call `prepareUpload(propertyId, entries)` (pass current `propertyId` and `entries`). Do **not** clear `entries` in the tab yet; keep them until upload succeeds (so if user cancels or the modal is closed before start, they still see their list). When upload completes successfully, the context will call `onUploadSuccess` (passed to `startUpload`), and in that callback the tab can clear its entries and call `refetchGallery` (current `onUploadSuccess` from props).
- **Flow**: "Upload to property gallery" → `prepareUpload(propertyId, entries)` → modal (owned by context) opens with the same entries. User clicks "Start upload" in modal → context `startUpload(onUploadSuccess)` runs. User can click minimize → modal closes, navbar shows upload progress. User can click Expand → modal reopens. On success, context calls `onUploadSuccess()` → tab clears entries and refetches gallery.
- **Optional**: After `prepareUpload`, the tab could clear its entries so the drop zone is free for new files; the modal would still show the snapshot in context. That would require the context to own the only copy of entries for the running job (already the case). Clearing the tab after prepareUpload is a UX choice: either keep entries in tab until success (so cancel brings them back) or clear on open (simpler, user re-adds if they cancel).

---

### 7. Download modal: optional minimize behavior

- In **GalleryDownloadContext**, add `minimizeModal()` that only sets `modalOpen: false`.
- In **GalleryDownloadModalContent**, when phase is `downloading` or `creating_zip`, make the header button call `onMinimize` (minimize only); when phase is idle/done/error, call `onClose` (reset). This way "minimize" doesn’t cancel the download. If you prefer not to change download behavior, skip this and only implement minimize for upload.

---

## File summary

| Action | File |
|--------|------|
| Create | `contexts/GalleryUploadContext.tsx` (provider + upload job logic + modal render) |
| Create | `contexts/GalleryUploadModalContent.tsx` (modal UI) |
| Create | `components/properties/gallery-section/GalleryUploadHeaderStatus.tsx` (navbar pill) |
| Edit | `app/layout.tsx` (add GalleryUploadProvider) |
| Edit | `components/Navbar.tsx` (render GalleryUploadHeaderStatus) |
| Edit | `components/properties/gallery-section/GalleryUploadTab.tsx` (use context, remove local modal/upload state, call prepareUpload) |

---

## Data flow summary

1. User adds files in **GalleryUploadTab** → local `entries`.
2. User clicks "Upload to property gallery" → `prepareUpload(propertyId, entries)` → context stores job + opens modal.
3. User clicks "Start upload" in modal → `startUpload(onUploadSuccess)` → context runs upload, updates `uploadStatuses`, modal (and later navbar) show progress.
4. User clicks minimize (minus) → `minimizeModal()` → modal closes, **GalleryUploadHeaderStatus** shows in navbar.
5. User clicks "Expand" in navbar → `openModal()` → modal reopens with same job and live status.
6. On success → context calls `onUploadSuccess()` → tab clears entries and refetches; toast and phase set to `'done'`.
7. User clicks "Cancel Task" (in modal or navbar) → `cancelUpload()` → abort, reset state.

---

## Edge cases

- **AbortController**: Use one for the batch of fetch(PUT) calls so "Cancel Task" can abort in-flight uploads. Check `signal.aborted` in loops and after await.
- **Blob URLs**: Entries hold blob URLs (objectUrl, processedPhotoUrl, processedThumbnailUrl). They remain valid as long as the context holds the entry objects; don’t revoke until upload finishes or is cancelled. On success, context can revoke before clearing the job (or the tab revokes when it clears entries if we don’t clear tab until success).
- **Refetch**: `onUploadSuccess` should call the same refetch callback the tab gets from props so the gallery list updates after upload.

This plan mirrors the download minimize pattern and reuses existing upload logic and UI building blocks (UploadStatusList, upload-tab utils and types).
