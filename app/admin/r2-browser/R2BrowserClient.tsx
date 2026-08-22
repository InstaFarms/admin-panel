"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiFolder,
  HiDocument,
  HiTrash,
  HiPencil,
  HiUpload,
  HiRefresh,
  HiChevronRight,
  HiExclamationCircle,
  HiX,
  HiCheck,
  HiDownload,
  HiDuplicate,
  HiDatabase,
  HiFolderAdd,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { captureError } from "@/lib/sentry";
import PinLockScreen from "./PinLockScreen";
import PinConfirmModal from "./PinConfirmModal";
import {
  listR2Objects,
  listAllR2ObjectKeys,
  createR2Folder,
  deleteR2Object,
  deleteR2Folder,
  renameR2Object,
  type R2FileEntry,
} from "@/actions/r2BrowserActions";
import type { R2BucketKey } from "@/lib/r2-s3";

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

interface BucketOption {
  key: R2BucketKey;
  label: string;
  baseUrl: string;
}

function bucketDisplayName(baseUrl: string): string {
  return baseUrl.split("/").filter(Boolean).pop() || "bucket";
}

async function copyToClipboard(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Failed to copy to clipboard.");
  }
}

function segmentName(prefixOrKey: string): string {
  const trimmed = prefixOrKey.endsWith("/") ? prefixOrKey.slice(0, -1) : prefixOrKey;
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || trimmed;
}

function parentOf(key: string): string {
  const name = segmentName(key);
  return key.slice(0, key.length - name.length);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isFsApiSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Recursively walks a picked directory handle, yielding every file with its path
 * relative to the picked folder (dotfiles skipped). Uses the same File System Access
 * API already proven working in this app (HetznerUploadClient.tsx, IconUploadsClient.tsx)
 * — far more reliable than the `<input webkitdirectory>` hack, which depends on an
 * easy-to-miss browser confirmation popup and can silently return zero files. */
async function* walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path = ""
): AsyncGenerator<{ file: File; relativePath: string }> {
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const relativePath = path ? `${path}/${name}` : name;
    if ((handle as FileSystemHandle).kind === "file") {
      if (name.startsWith(".")) continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      yield { file, relativePath };
    } else {
      yield* walkDirectory(handle as FileSystemDirectoryHandle, relativePath);
    }
  }
}

const UNLOCK_STORAGE_KEY = "r2_browser_unlock_expiry";
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

function isUnlockValid(): boolean {
  const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
  if (!raw) return false;
  const expiry = Number(raw);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    localStorage.removeItem(UNLOCK_STORAGE_KEY);
    return false;
  }
  return true;
}

function persistUnlock(): void {
  localStorage.setItem(UNLOCK_STORAGE_KEY, String(Date.now() + UNLOCK_DURATION_MS));
}

interface R2BrowserClientProps {
  /** Combined server-side (see resolveR2BaseUrl in lib/r2-s3.ts) from non-public
   * env vars — avoids needing NEXT_PUBLIC_* copies just for this page. */
  devBaseUrl: string;
  prodBaseUrl: string;
}

export default function R2BrowserClient({ devBaseUrl, prodBaseUrl }: R2BrowserClientProps) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");

  useEffect(() => {
    setStatus(isUnlockValid() ? "unlocked" : "locked");
  }, []);

  if (status === "checking") return null;

  if (status === "locked") {
    return (
      <PinLockScreen
        onUnlock={() => {
          persistUnlock();
          setStatus("unlocked");
        }}
      />
    );
  }

  return <R2BrowserContent devBaseUrl={devBaseUrl} prodBaseUrl={prodBaseUrl} />;
}

function R2BrowserContent({ devBaseUrl, prodBaseUrl }: R2BrowserClientProps) {
  const bucketOptions: BucketOption[] = [
    { key: "dev", label: "Dev", baseUrl: devBaseUrl },
    { key: "prod", label: "Prod", baseUrl: prodBaseUrl },
  ];

  const [bucketKey, setBucketKey] = useState<R2BucketKey>("dev");
  const activeBucket = bucketOptions.find((b) => b.key === bucketKey)!;

  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<R2FileEntry[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewFile, setPreviewFile] = useState<R2FileEntry | null>(null);
  const [folderUploadProgress, setFolderUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetKeyRef = useRef<string | null>(null);

  const [pinGate, setPinGate] = useState<{ message: string; action: () => void | Promise<void> } | null>(null);

  const requirePin = (action: () => void | Promise<void>, message: string) => {
    setPinGate({ message, action });
  };

  const loadPage = useCallback(
    async (forBucket: R2BucketKey, targetPrefix: string, append: boolean, token?: string) => {
      setLoading(true);
      try {
        const result = await listR2Objects(targetPrefix, token, forBucket);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setFolders((prev) => (append ? [...prev, ...(result.data?.folders ?? [])] : result.data?.folders ?? []));
        setFiles((prev) => (append ? [...prev, ...(result.data?.files ?? [])] : result.data?.files ?? []));
        setNextToken(result.data?.nextToken);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPage(bucketKey, "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (newPrefix: string) => {
    setPrefix(newPrefix);
    void loadPage(bucketKey, newPrefix, false);
  };

  const switchBucket = (newBucketKey: R2BucketKey) => {
    if (newBucketKey === bucketKey) return;
    setBucketKey(newBucketKey);
    setPrefix("");
    setNextToken(undefined);
    void loadPage(newBucketKey, "", false);
  };

  const refresh = () => loadPage(bucketKey, prefix, false);

  const segments = prefix.split("/").filter(Boolean);
  const crumbs = [
    { label: bucketDisplayName(activeBucket.baseUrl), prefix: "" },
    ...segments.map((seg, i) => ({ label: seg, prefix: segments.slice(0, i + 1).join("/") + "/" })),
  ];

  /** Full public URL for a bucket-relative key/prefix, in the currently viewed bucket. */
  const fullObjectUrl = (key: string): string => `${activeBucket.baseUrl}/${key}`;

  /** Thumbnail/preview src for the currently viewed bucket. Empty when the bucket's
   * public URL (R2_PUBLIC_URL_DEV/PROD) isn't configured — R2's S3 API endpoint alone
   * can't serve public reads, unlike Hetzner's. */
  const imageSrc = (key: string): string | null => (activeBucket.baseUrl ? `${activeBucket.baseUrl}/${key}` : null);

  // ── Upload ────────────────────────────────────────────────────────────────

  const putObject = async (key: string, file: File) => {
    const buffer = await file.arrayBuffer();
    const res = await fetch(
      `/api/r2-upload/image?key=${encodeURIComponent(key)}&bucket=${bucketKey}`,
      {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: buffer,
      }
    );
    if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
  };

  const handleUploadSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      await putObject(`${prefix}${file.name}`, file);
      toast.success("Uploaded.");
      await refresh();
    } catch (err) {
      captureError(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const FOLDER_UPLOAD_CONCURRENCY = 6;

  const handleUploadFolderClick = async () => {
    if (!isFsApiSupported()) {
      toast.error("Folder upload requires a Chromium-based browser (Chrome or Edge).");
      return;
    }

    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await (window as any).showDirectoryPicker({ mode: "read" });
    } catch {
      return; // user cancelled the picker
    }

    const collected: { file: File; relativePath: string }[] = [];
    for await (const entry of walkDirectory(dirHandle)) {
      // Nest under the picked folder's own name, e.g. "setting/instafarms/hero.jpg" —
      // matches how "Upload folder" was described: creates a same-named folder here.
      collected.push({ file: entry.file, relativePath: `${dirHandle.name}/${entry.relativePath}` });
    }

    if (collected.length === 0) {
      toast.error(`"${dirHandle.name}" has no uploadable files in it (only dotfiles, or empty).`);
      return;
    }

    setLoading(true);
    setFolderUploadProgress({ done: 0, total: collected.length });
    let succeeded = 0;
    const failed: string[] = [];
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < collected.length) {
        const { file, relativePath } = collected[nextIndex++];
        try {
          await putObject(`${prefix}${relativePath}`, file);
          succeeded++;
        } catch (err) {
          captureError(err);
          failed.push(relativePath);
        }
        setFolderUploadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(FOLDER_UPLOAD_CONCURRENCY, collected.length) }, () => worker())
    );

    setFolderUploadProgress(null);
    setLoading(false);
    if (failed.length > 0) {
      toast.error(`Uploaded ${succeeded}, but ${failed.length} failed: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`);
    } else {
      toast.success(`Uploaded ${succeeded} file(s).`);
    }
    await refresh();
  };

  // ── Create folder ────────────────────────────────────────────────────────

  const startCreateFolder = () => {
    setCreatingFolder(true);
    setNewFolderName("");
  };

  const cancelCreateFolder = () => {
    setCreatingFolder(false);
    setNewFolderName("");
  };

  const confirmCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      cancelCreateFolder();
      return;
    }
    if (trimmed.includes("/")) {
      toast.error('Folder name can\'t contain "/".');
      return;
    }
    setLoading(true);
    try {
      const res = await createR2Folder(`${prefix}${trimmed}/`, bucketKey);
      if (res.error) throw new Error(res.error);
      toast.success("Folder created.");
      cancelCreateFolder();
      await refresh();
    } catch (err) {
      captureError(err);
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceClick = (key: string) => {
    replaceTargetKeyRef.current = key;
    replaceInputRef.current?.click();
  };

  const handleReplaceSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = replaceTargetKeyRef.current;
    e.target.value = "";
    if (!file || !key) return;
    setBusyKey(key);
    try {
      await putObject(key, file);
      toast.success("Replaced.");
      await refresh();
    } catch (err) {
      captureError(err);
      toast.error(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setBusyKey(null);
      replaceTargetKeyRef.current = null;
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteFile = (key: string) => {
    if (!window.confirm(`Delete "${segmentName(key)}"? This cannot be undone.`)) return;
    requirePin(async () => {
      setBusyKey(key);
      try {
        const res = await deleteR2Object(key, bucketKey);
        if (res.error) throw new Error(res.error);
        toast.success("Deleted.");
        setFiles((prev) => prev.filter((f) => f.key !== key));
      } catch (err) {
        captureError(err);
        toast.error(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyKey(null);
      }
    }, `Enter PIN to delete "${segmentName(key)}".`);
  };

  const handleDeleteFolder = async (folderPrefix: string) => {
    setBusyKey(folderPrefix);
    let count = 0;
    try {
      const countRes = await listAllR2ObjectKeys(folderPrefix, bucketKey);
      if (countRes.error) throw new Error(countRes.error);
      count = countRes.data?.length ?? 0;
    } catch (err) {
      captureError(err);
      toast.error(err instanceof Error ? err.message : "Failed to check folder contents");
      setBusyKey(null);
      return;
    }
    setBusyKey(null);
    if (
      !window.confirm(
        `Delete folder "${segmentName(folderPrefix)}" and all ${count} object(s) inside it? This cannot be undone and will NOT update any database references pointing at those files.`
      )
    ) {
      return;
    }
    requirePin(async () => {
      setBusyKey(folderPrefix);
      try {
        const res = await deleteR2Folder(folderPrefix, bucketKey);
        if (res.error) throw new Error(res.error);
        if (res.data && res.data.errors.length > 0) {
          toast.error(`Deleted ${res.data.deletedCount}, but ${res.data.errors.length} failed.`);
        } else {
          toast.success(`Deleted ${res.data?.deletedCount ?? 0} object(s).`);
        }
        setFolders((prev) => prev.filter((f) => f !== folderPrefix));
      } catch (err) {
        captureError(err);
        toast.error(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyKey(null);
      }
    }, `Enter PIN to delete folder "${segmentName(folderPrefix)}" (${count} object(s)).`);
  };

  // ── Rename ────────────────────────────────────────────────────────────────

  const startRename = (keyOrPrefix: string) => {
    setRenamingKey(keyOrPrefix);
    setRenameValue(segmentName(keyOrPrefix));
  };

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameValue("");
  };

  const confirmRenameFile = async (key: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === segmentName(key)) {
      cancelRename();
      return;
    }
    const newKey = parentOf(key) + trimmed;
    setBusyKey(key);
    try {
      const res = await renameR2Object(key, newKey, bucketKey);
      if (res.error) throw new Error(res.error);
      toast.success("Renamed.");
      await refresh();
    } catch (err) {
      captureError(err);
      toast.error(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusyKey(null);
      cancelRename();
    }
  };

  const isBusy = (key: string) => busyKey === key;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">R2 Bucket Browser</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse, upload, rename, and delete objects in the Cloudflare R2 storage bucket.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
            {bucketOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => switchBucket(opt.key)}
                disabled={loading}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  bucketKey === opt.key
                    ? opt.key === "prod"
                      ? "bg-red-600 text-white"
                      : "bg-orange-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title={opt.baseUrl || undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <HiRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => requirePin(() => uploadInputRef.current?.click(), "Enter PIN to upload a file.")}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50"
          >
            <HiUpload className="h-4 w-4" />
            Upload file
          </button>
          <button
            type="button"
            onClick={() => requirePin(handleUploadFolderClick, "Enter PIN to upload a folder.")}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 px-3 py-2 text-sm font-semibold text-white"
          >
            <HiUpload className="h-4 w-4" />
            Upload folder
          </button>
          <input ref={uploadInputRef} type="file" className="hidden" onChange={handleUploadSelected} />
          <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceSelected} />
        </div>
      </div>

      {folderUploadProgress && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
          Uploading {folderUploadProgress.done} / {folderUploadProgress.total}…
        </div>
      )}

      <div
        className={`rounded-xl border p-3 flex gap-2.5 ${
          bucketKey === "prod"
            ? "border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/10"
            : "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10"
        }`}
      >
        <HiExclamationCircle
          className={`h-5 w-5 shrink-0 mt-0.5 ${
            bucketKey === "prod" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          }`}
        />
        <p className={`text-xs ${bucketKey === "prod" ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}>
          {bucketKey === "prod" ? (
            <>You are viewing the <strong>production</strong> R2 bucket. </>
          ) : (
            <>You are viewing the <strong>dev</strong> R2 bucket. </>
          )}
          Renaming or deleting a file does <strong>not</strong> update any database record pointing at it —
          anything currently displaying that file will break.
        </p>
      </div>

      {/* Breadcrumb + base URL */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb.prefix} className="flex items-center gap-1">
              {i > 0 && <HiChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              <button
                type="button"
                onClick={() => navigateTo(crumb.prefix)}
                className={`px-1.5 py-0.5 rounded ${
                  crumb.prefix === prefix
                    ? "font-semibold text-gray-900 dark:text-gray-100"
                    : "text-orange-600 dark:text-orange-400 hover:underline"
                }`}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
        {activeBucket.baseUrl && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 min-w-0">
            <HiDatabase className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono truncate max-w-70">{activeBucket.baseUrl}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(activeBucket.baseUrl, "Copied base URL.")}
              className="shrink-0 text-orange-500 hover:text-orange-600"
              title="Copy base URL"
            >
              <HiDuplicate className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Listing */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
        {creatingFolder ? (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50/60 dark:bg-orange-900/10">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <HiFolder className="h-4 w-4 text-orange-500" />
            </span>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  requirePin(confirmCreateFolder, `Enter PIN to create folder "${newFolderName.trim()}".`);
                }
                if (e.key === "Escape") cancelCreateFolder();
              }}
              placeholder="Folder name"
              disabled={loading}
              className="min-w-0 flex-1 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => requirePin(confirmCreateFolder, `Enter PIN to create folder "${newFolderName.trim()}".`)}
              disabled={loading || !newFolderName.trim()}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition-colors"
            >
              {loading ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
              ) : (
                <HiCheck className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={cancelCreateFolder}
              disabled={loading}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <HiX className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCreateFolder}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left group hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 group-hover:border-orange-400 group-hover:text-orange-500 transition-colors">
              <HiFolderAdd className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              New folder
            </span>
          </button>
        )}

        {loading && folders.length === 0 && files.length === 0 && (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
            <div className="h-5 w-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!loading && folders.length === 0 && files.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Empty folder.</div>
        )}

        {folders.map((folderPrefix) => (
          <div key={folderPrefix} className="flex items-center gap-3 px-4 py-2.5">
            <HiFolder className="h-5 w-5 shrink-0 text-amber-400" />
            <button
              type="button"
              onClick={() => navigateTo(folderPrefix)}
              className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200 truncate hover:text-orange-600 dark:hover:text-orange-400"
            >
              {segmentName(folderPrefix)}/
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {isBusy(folderPrefix) ? (
                <div className="h-4 w-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(fullObjectUrl(folderPrefix), "Copied URL.")}
                    className="text-orange-500 hover:text-orange-600"
                    title="Copy URL"
                  >
                    <HiDuplicate className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(folderPrefix)}
                    className="text-red-500 hover:text-red-600"
                    title="Delete folder"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {files.map((file) => {
          const isImage = IMAGE_EXT_RE.test(file.key);
          const src = isImage ? imageSrc(file.key) : null;
          return (
            <div key={file.key} className="flex items-center gap-3 px-4 py-2.5">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded object-cover border border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                />
              ) : (
                <HiDocument className="h-5 w-5 shrink-0 text-gray-400" />
              )}
              {renamingKey === file.key ? (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      requirePin(
                        () => confirmRenameFile(file.key),
                        `Enter PIN to rename "${segmentName(file.key)}" to "${renameValue.trim()}".`
                      )
                    }
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <HiCheck className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={cancelRename} className="text-gray-400 hover:text-gray-600">
                    <HiX className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {segmentName(file.key)}
                  </p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                </button>
              )}
              {renamingKey !== file.key && (
                <div className="flex items-center gap-2 shrink-0">
                  {isBusy(file.key) ? (
                    <div className="h-4 w-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(fullObjectUrl(file.key), "Copied URL.")}
                        className="text-orange-500 hover:text-orange-600"
                        title="Copy URL"
                      >
                        <HiDuplicate className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requirePin(
                            () => handleReplaceClick(file.key),
                            `Enter PIN to replace "${segmentName(file.key)}".`
                          )
                        }
                        className="text-amber-500 hover:text-amber-600"
                        title="Replace file content"
                      >
                        <HiUpload className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(file.key)}
                        className="text-blue-500 hover:text-blue-600"
                        title="Rename"
                      >
                        <HiPencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.key)}
                        className="text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nextToken && (
        <button
          type="button"
          onClick={() => loadPage(bucketKey, prefix, true, nextToken)}
          disabled={loading}
          className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-3 text-sm font-medium text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-all disabled:opacity-50"
        >
          Load more…
        </button>
      )}

      {/* Preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="max-w-2xl w-full rounded-xl bg-white dark:bg-gray-800 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {segmentName(previewFile.key)}
              </p>
              <button type="button" onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-gray-600">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            {IMAGE_EXT_RE.test(previewFile.key) && imageSrc(previewFile.key) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc(previewFile.key)!}
                alt=""
                className="max-h-[60vh] w-full object-contain rounded-lg bg-gray-50 dark:bg-gray-900"
              />
            )}
            <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono truncate">{previewFile.key}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(fullObjectUrl(previewFile.key), "Copied URL.")}
                  className="shrink-0 text-orange-500 hover:text-orange-600"
                  title="Copy URL"
                >
                  <HiDuplicate className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="shrink-0">{formatBytes(previewFile.size)}</span>
            </div>
            {imageSrc(previewFile.key) && (
              <a
                href={imageSrc(previewFile.key)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <HiDownload className="h-4 w-4" />
                Open / download
              </a>
            )}
          </div>
        </div>
      )}

      {pinGate && (
        <PinConfirmModal
          message={pinGate.message}
          onCancel={() => setPinGate(null)}
          onConfirmed={() => {
            const action = pinGate.action;
            setPinGate(null);
            void action();
          }}
        />
      )}
    </div>
  );
}
