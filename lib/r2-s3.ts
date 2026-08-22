import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

const requiredEnv = [
  "R2_KEY_ID",
  "R2_SECRET_KEY",
  "R2_ENDPOINT_DEV",
  "R2_ENDPOINT_PROD",
  "R2_BUCKET_DEV",
  "R2_BUCKET_PROD",
] as const;

/** Checked lazily by callers right before they use an R2 client, so importing this
 * module never crashes an environment that legitimately has no R2 config. */
export function assertR2Configured(): void {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`R2 storage is not configured: missing env var(s) ${missing.join(", ")}`);
  }
}

export type R2BucketKey = "dev" | "prod";

const R2_BUCKET_DEV = process.env.R2_BUCKET_DEV ?? "";
const R2_BUCKET_PROD = process.env.R2_BUCKET_PROD ?? "";
const R2_ENDPOINT_DEV = process.env.R2_ENDPOINT_DEV ?? "";
const R2_ENDPOINT_PROD = process.env.R2_ENDPOINT_PROD ?? "";
// R2's S3 API endpoint (accountid.r2.cloudflarestorage.com) does NOT serve public
// reads — unlike Hetzner's endpoint, it can't double as an <img> src. R2 buckets need
// a separate public domain (r2.dev subdomain or custom domain) for that, so it's kept
// as its own pair of env vars rather than derived from the endpoint like Hetzner does.
const R2_PUBLIC_URL_DEV = process.env.R2_PUBLIC_URL_DEV ?? "";
const R2_PUBLIC_URL_PROD = process.env.R2_PUBLIC_URL_PROD ?? "";

function buildR2Client(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: "auto",
    credentials: {
      accessKeyId: process.env.R2_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

// Dev and prod can live in different R2 accounts/endpoints, so — same reasoning as
// Hetzner's Bucket Browser — one S3Client per bucket rather than a single shared one.
const r2Dev = R2_ENDPOINT_DEV ? buildR2Client(R2_ENDPOINT_DEV) : null;
const r2Prod = R2_ENDPOINT_PROD ? buildR2Client(R2_ENDPOINT_PROD) : null;

/** Resolves a "dev"/"prod" label (as picked in the R2 Bucket Browser's bucket switcher)
 * to its bucket name + matching S3 client. Both require their own explicit
 * R2_BUCKET_DEV/PROD and R2_ENDPOINT_DEV/PROD env vars — neither falls back to a default. */
export function resolveR2Target(bucketKey: R2BucketKey): { bucket: string; client: S3Client } {
  const bucket = bucketKey === "dev" ? R2_BUCKET_DEV : R2_BUCKET_PROD;
  const client = bucketKey === "dev" ? r2Dev : r2Prod;
  if (!bucket || !client) {
    throw new Error(
      `R2 ${bucketKey} bucket is not configured (R2_BUCKET_${bucketKey.toUpperCase()} / R2_ENDPOINT_${bucketKey.toUpperCase()})`
    );
  }
  return { bucket, client };
}

/** Public base URL for a "dev"/"prod" label — R2_PUBLIC_URL_DEV/PROD directly (an r2.dev
 * subdomain or custom domain already rooted at the bucket), NOT endpoint+bucket like
 * Hetzner, since R2's S3 API endpoint isn't publicly readable. Returns "" if unconfigured. */
export function resolveR2BaseUrl(bucketKey: R2BucketKey): string {
  return bucketKey === "dev" ? R2_PUBLIC_URL_DEV : R2_PUBLIC_URL_PROD;
}

// ── Plain production client ──────────────────────────────────────────────────
// Everything below is for real application storage (property photos, icons, PDFs,
// etc. — apps/admin/actions/imageActions.ts), one bucket per deployment, same shape
// as the R2_ENDPOINT_DEV/PROD pair above but NOT tied to the Bucket Browser's
// dev/prod switcher — mirrors how apps/if-api's R2 client works (single set of vars,
// whichever bucket matches wherever this is deployed).

/** Checked lazily by callers right before they use the plain r2S3 client. */
export function assertR2ProductionConfigured(): void {
  const missing = (["R2_ENDPOINT", "R2_BUCKET", "R2_KEY_ID", "R2_SECRET_KEY", "R2_PUBLIC_URL"] as const).filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new Error(`R2 storage is not configured: missing env var(s) ${missing.join(", ")}`);
  }
}

export const r2S3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export const R2_BUCKET = process.env.R2_BUCKET!;

/** Deletes a single object from the plain production R2 bucket. Mirrors
 * hetznerBrowserActions.ts's deleteHetznerObject, for imageActions.ts's cleanup paths. */
export async function deleteR2Object(key: string): Promise<{ success?: true; error?: string }> {
  try {
    if (!key) return { error: "Missing key" };
    await r2S3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete object" };
  }
}

/** Lists every object key under `prefix` (recursive, no delimiter) in the plain
 * production R2 bucket, following pagination to exhaustion. */
export async function listAllR2ObjectKeys(prefix: string): Promise<{ data?: string[]; error?: string }> {
  try {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await r2S3.send(
        new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: continuationToken })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key && !obj.Key.endsWith("/")) keys.push(obj.Key);
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);
    return { data: keys };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to list objects" };
  }
}
