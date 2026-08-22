"use server";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { isAdmin } from "@/utils/admin-only";
import { resolveHetznerTarget, type HetznerBucketKey } from "@/lib/hetzner-s3";
import { captureError } from "@/lib/sentry";

export interface HetznerFileEntry {
  key: string;
  size: number;
  lastModified: string | null;
}

export interface HetznerListResult {
  folders: string[];
  files: HetznerFileEntry[];
  nextToken?: string;
}

/** Lists one "directory level" under `prefix` using the `/` delimiter — folders
 * come back as CommonPrefixes, files as Contents. Excludes the zero-byte
 * "directory marker" object (Key === prefix) and any key ending in `/`.
 * Read-only — this is the only bucket operation the (now read-only) Hetzner
 * Bucket Browser page uses; all writes have moved to R2 (see r2BrowserActions.ts). */
export async function listHetznerObjects(
  prefix: string,
  continuationToken?: string,
  bucketKey?: HetznerBucketKey
): Promise<{ data?: HetznerListResult; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const { bucket: Bucket, client } = resolveHetznerTarget(bucketKey);
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
