/**
 * Server-side JSON log for the "Regenerate all watermarks" bulk process
 * (apps/admin/components/properties/gallery-section/GalleryTabContent.tsx).
 *
 * Written to the admin server's local disk (not the browser, not the DB) so every
 * photo's outcome — including the real error for failures — survives the run and
 * can be inspected afterward, instead of only living in transient React state.
 * One file per (appType, force) pair, holding just the latest run — a new run
 * merges into it; "Start Over" clears it via resetWatermarkRegenLog.
 */
import { promises as fs } from "fs";
import path from "path";

export interface WatermarkPhotoLogEntry {
  propertyName: string | null;
  fileName: string | null;
  status: "done" | "failed";
  error: string | null;
  attemptedAt: string;
}

export interface WatermarkRegenLog {
  appType: string;
  force: boolean;
  startedAt: string;
  updatedAt: string;
  counts: { done: number; failed: number };
  photos: Record<string, WatermarkPhotoLogEntry>;
}

export interface WatermarkBatchResultEntry {
  id: string;
  propertyName: string | null;
  fileName: string | null;
  status: "done" | "failed";
  error?: string | null;
}

const LOG_DIR = path.join(process.cwd(), ".data", "watermark-logs");

function logFilePath(appType: string, force: boolean): string {
  const safeAppType = appType.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  return path.join(LOG_DIR, `${safeAppType}-${force ? "force" : "missing"}.json`);
}

export async function loadWatermarkRegenLog(appType: string, force: boolean): Promise<WatermarkRegenLog | null> {
  try {
    const raw = await fs.readFile(logFilePath(appType, force), "utf-8");
    return JSON.parse(raw) as WatermarkRegenLog;
  } catch {
    return null;
  }
}

/**
 * Merges a batch of per-photo results into the on-disk log for (appType, force),
 * creating the file (and its directory) if this is the first batch of a new run.
 * Best-effort: throws on I/O failure so the caller can decide whether to swallow it.
 */
export async function recordWatermarkBatchResults(
  appType: string,
  force: boolean,
  entries: WatermarkBatchResultEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  await fs.mkdir(LOG_DIR, { recursive: true });
  const filePath = logFilePath(appType, force);
  const now = new Date().toISOString();

  let log = await loadWatermarkRegenLog(appType, force);
  if (!log) {
    log = { appType, force, startedAt: now, updatedAt: now, counts: { done: 0, failed: 0 }, photos: {} };
  }

  for (const entry of entries) {
    log.photos[entry.id] = {
      propertyName: entry.propertyName ?? null,
      fileName: entry.fileName ?? null,
      status: entry.status,
      error: entry.status === "failed" ? entry.error ?? "Unknown error" : null,
      attemptedAt: now,
    };
  }

  const allEntries = Object.values(log.photos);
  log.counts = {
    done: allEntries.filter((p) => p.status === "done").length,
    failed: allEntries.filter((p) => p.status === "failed").length,
  };
  log.updatedAt = now;

  await fs.writeFile(filePath, JSON.stringify(log, null, 2), "utf-8");
}

/** Deletes the on-disk log for (appType, force) — call when the user clicks "Start Over". */
export async function resetWatermarkRegenLog(appType: string, force: boolean): Promise<void> {
  try {
    await fs.unlink(logFilePath(appType, force));
  } catch {
    // Nothing to delete — fine.
  }
}
