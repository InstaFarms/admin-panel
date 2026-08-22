"use server";

import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { isAdmin } from "@/utils/admin-only";
import { resolveR2Target, type R2BucketKey } from "@/lib/r2-s3";
import { captureError } from "@/lib/sentry";

export interface R2FileEntry {
  key: string;
  size: number;
  lastModified: string | null;
}

/** Verifies the PIN gate on the R2 bucket browser page. Requires an already-logged-in
 * admin (not a standalone auth mechanism) — this is an extra confirmation step in
 * front of a destructive tool, not a replacement for real auth. */
export async function verifyR2BrowserPin(pin: string): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const expected = process.env.R2_BROWSER_PIN;
    if (!expected) return { error: "R2 bucket browser PIN is not configured." };
    if (pin !== expected) return { error: "Incorrect PIN." };

    return { success: true };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to verify PIN" };
  }
}

export interface R2ListResult {
  folders: string[];
  files: R2FileEntry[];
  nextToken?: string;
}

/** CopySource is a raw header, not auto-encoded like Key — encode each path
 * segment (not the whole string, or `/` gets corrupted) and prepend the bucket. */
function buildCopySource(bucket: string, key: string): string {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Creates an empty "directory marker" object at `folderPrefix` (must end in `/`) so the
 * folder shows up immediately in listings even with no files in it yet — S3 has no real
 * folders, this is the standard convention (an object whose key ends in `/`). */
export async function createR2Folder(
  folderPrefix: string,
  bucketKey: R2BucketKey
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    if (!folderPrefix || !folderPrefix.endsWith("/")) return { error: "Invalid folder path" };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    await client.send(new PutObjectCommand({ Bucket, Key: folderPrefix, Body: Buffer.alloc(0) }));
    return { success: true };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create folder" };
  }
}

/** Lists one "directory level" under `prefix` using the `/` delimiter — folders
 * come back as CommonPrefixes, files as Contents. Excludes the zero-byte
 * "directory marker" object (Key === prefix) and any key ending in `/`. */
export async function listR2Objects(
  prefix: string,
  continuationToken: string | undefined,
  bucketKey: R2BucketKey
): Promise<{ data?: R2ListResult; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      })
    );

    const folders = (res.CommonPrefixes ?? [])
      .map((p) => p.Prefix)
      .filter((p): p is string => Boolean(p));

    const files = (res.Contents ?? [])
      .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith("/"))
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
      }));

    return {
      data: {
        folders,
        files,
        nextToken: res.IsTruncated ? res.NextContinuationToken : undefined,
      },
    };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to list objects" };
  }
}

/** Lists every object key under `prefix` (recursive, no delimiter), following
 * pagination to exhaustion. Used both to preview a folder-delete's blast radius
 * before confirming, and internally by the bulk operations below. */
export async function listAllR2ObjectKeys(
  prefix: string,
  bucketKey: R2BucketKey
): Promise<{ data?: string[]; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return { data: keys };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to list objects" };
  }
}

/** Same as listAllR2ObjectKeys but INCLUDES zero-byte directory-marker keys
 * (ending in `/`) — deleting/renaming a folder must remove its own marker object
 * too, or an empty folder (marker with no real files inside) never actually goes
 * away since there'd be nothing left to delete. */
async function listAllKeysIncludingMarkers(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

export async function deleteR2Object(
  key: string,
  bucketKey: R2BucketKey
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    if (!key) return { error: "Missing key" };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    return { success: true };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to delete object" };
  }
}

/** Recursively deletes every object under `prefix`, in batches of up to 1000
 * (DeleteObjectsCommand's cap). Reports per-key errors from partial batch
 * failures instead of trusting a raw success count. */
export async function deleteR2Folder(
  prefix: string,
  bucketKey: R2BucketKey
): Promise<{ data?: { deletedCount: number; errors: { key: string; message: string }[] }; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    if (!prefix) return { error: "Missing prefix" };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    const keys = await listAllKeysIncludingMarkers(client, Bucket, prefix);

    let deletedCount = 0;
    const errors: { key: string; message: string }[] = [];

    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      const res = await client.send(
        new DeleteObjectsCommand({
          Bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: false },
        })
      );
      deletedCount += res.Deleted?.length ?? 0;
      for (const e of res.Errors ?? []) {
        errors.push({ key: e.Key ?? "unknown", message: e.Message ?? "Unknown error" });
      }
    }

    return { data: { deletedCount, errors } };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to delete folder" };
  }
}

export async function renameR2Object(
  oldKey: string,
  newKey: string,
  bucketKey: R2BucketKey
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    if (!oldKey || !newKey) return { error: "Missing key" };
    if (oldKey === newKey) return { success: true };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    await client.send(
      new CopyObjectCommand({ Bucket, CopySource: buildCopySource(Bucket, oldKey), Key: newKey })
    );
    await client.send(new DeleteObjectCommand({ Bucket, Key: oldKey }));
    return { success: true };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to rename object" };
  }
}

const RENAME_CONCURRENCY = 6;

/** Renames every object under `oldPrefix` to the equivalent key under `newPrefix`,
 * via copy+delete per object (S3 has no native rename), bounded concurrency. */
export async function renameR2Folder(
  oldPrefix: string,
  newPrefix: string,
  bucketKey: R2BucketKey
): Promise<{ data?: { renamedCount: number; errors: { key: string; message: string }[] }; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    if (!oldPrefix || !newPrefix) return { error: "Missing prefix" };
    if (oldPrefix === newPrefix) return { data: { renamedCount: 0, errors: [] } };

    const { bucket: Bucket, client } = resolveR2Target(bucketKey);
    const keys = await listAllKeysIncludingMarkers(client, Bucket, oldPrefix);

    let renamedCount = 0;
    const errors: { key: string; message: string }[] = [];
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < keys.length) {
        const oldKey = keys[nextIndex++];
        const newKey = newPrefix + oldKey.slice(oldPrefix.length);
        try {
          await client.send(
            new CopyObjectCommand({ Bucket, CopySource: buildCopySource(Bucket, oldKey), Key: newKey })
          );
          await client.send(new DeleteObjectCommand({ Bucket, Key: oldKey }));
          renamedCount++;
        } catch (err) {
          errors.push({ key: oldKey, message: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(RENAME_CONCURRENCY, keys.length) }, () => worker()));

    return { data: { renamedCount, errors } };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to rename folder" };
  }
}
