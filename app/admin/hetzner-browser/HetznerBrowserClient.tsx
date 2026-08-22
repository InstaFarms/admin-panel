"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HiFolder,
  HiDocument,
  HiRefresh,
  HiChevronRight,
  HiExclamationCircle,
  HiX,
  HiDownload,
  HiDuplicate,
  HiDatabase,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { listHetznerObjects, type HetznerFileEntry } from "@/actions/hetznerBrowserActions";
import type { HetznerBucketKey } from "@/lib/hetzner-s3";

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

interface BucketOption {
  key: HetznerBucketKey;
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface HetznerBrowserClientProps {
  /** Combined server-side (see resolveHetznerBaseUrl in lib/hetzner-s3.ts) from
   * non-public env vars — avoids needing NEXT_PUBLIC_* copies just for this page. */
  devBaseUrl: string;
  prodBaseUrl: string;
}

/**
 * Read-only historical archive of the Hetzner bucket — all storage/read/write app
 * logic has moved to R2 (see /admin/r2-browser). Nothing here can upload, rename, or
 * delete; it exists purely so old files can still be found and their URLs copied.
 */
export default function HetznerBrowserClient({ devBaseUrl, prodBaseUrl }: HetznerBrowserClientProps) {
  const bucketOptions: BucketOption[] = [
    { key: "dev", label: "Dev", baseUrl: devBaseUrl },
    { key: "prod", label: "Prod", baseUrl: prodBaseUrl },
  ];

  const [bucketKey, setBucketKey] = useState<HetznerBucketKey>("dev");
  const activeBucket = bucketOptions.find((b) => b.key === bucketKey)!;

  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<HetznerFileEntry[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<HetznerFileEntry | null>(null);

  const loadPage = useCallback(
    async (forBucket: HetznerBucketKey, targetPrefix: string, append: boolean, token?: string) => {
      setLoading(true);
      try {
        const result = await listHetznerObjects(targetPrefix, token, forBucket);
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

  const switchBucket = (newBucketKey: HetznerBucketKey) => {
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

  /** Thumbnail/preview src for the currently viewed bucket — deliberately not the shared
   * resolveImageSrc() helper, which is pinned to the R2 production bucket and would
   * resolve to the wrong place for this page (always Hetzner, whichever bucket is picked). */
  const imageSrc = (key: string): string | null => (activeBucket.baseUrl ? `${activeBucket.baseUrl}/${key}` : null);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bucket Browser (Hetzner, read-only)</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Historical archive — browse and copy links only. All uploads now go to R2 (see Bucket Browser (R2)).
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
                      : "bg-violet-600 text-white"
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
        </div>
      </div>

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
            <>You are viewing the <strong>production</strong> Hetzner bucket. </>
          ) : (
            <>You are viewing the <strong>dev</strong> Hetzner bucket. </>
          )}
          Read-only — this page can no longer upload, rename, or delete anything.
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
                    : "text-violet-600 dark:text-violet-400 hover:underline"
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
              className="shrink-0 text-violet-500 hover:text-violet-600"
              title="Copy base URL"
            >
              <HiDuplicate className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Listing */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
        {loading && folders.length === 0 && files.length === 0 && (
          <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
            <div className="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
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
              className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200 truncate hover:text-violet-600 dark:hover:text-violet-400"
            >
              {segmentName(folderPrefix)}/
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(fullObjectUrl(folderPrefix), "Copied URL.")}
              className="shrink-0 text-violet-500 hover:text-violet-600"
              title="Copy URL"
            >
              <HiDuplicate className="h-4 w-4" />
            </button>
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
              <button
                type="button"
                onClick={() => copyToClipboard(fullObjectUrl(file.key), "Copied URL.")}
                className="shrink-0 text-violet-500 hover:text-violet-600"
                title="Copy URL"
              >
                <HiDuplicate className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {nextToken && (
        <button
          type="button"
          onClick={() => loadPage(bucketKey, prefix, true, nextToken)}
          disabled={loading}
          className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-3 text-sm font-medium text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all disabled:opacity-50"
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
                  className="shrink-0 text-violet-500 hover:text-violet-600"
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                <HiDownload className="h-4 w-4" />
                Open / download
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
