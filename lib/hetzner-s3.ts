import { S3Client } from "@aws-sdk/client-s3";

const requiredEnv = [
  "HETZNER_ENDPOINT",
  "HETZNER_BUCKET",
  "HETZNER_KEY_ID",
  "HETZNER_SECRET_KEY",
] as const;

/** Checked lazily by callers right before they use hetznerS3, so importing this
 * module never crashes an environment that legitimately has no Hetzner config. */
export function assertHetznerConfigured(): void {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Hetzner storage is not configured: missing env var(s) ${missing.join(", ")}`
    );
  }
}

export const hetznerS3 = new S3Client({
  endpoint: process.env.HETZNER_ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: process.env.HETZNER_KEY_ID!,
    secretAccessKey: process.env.HETZNER_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export const HETZNER_BUCKET = process.env.HETZNER_BUCKET!;

export type HetznerBucketKey = "dev" | "prod";

// HETZNER_BUCKET_DEV/PROD and HETZNER_ENDPOINT_DEV/PROD are both always required
// explicitly — deliberately NOT falling back to the default HETZNER_BUCKET/HETZNER_ENDPOINT
// for either one. Which bucket the default happens to be varies per deployment (dev
// locally/staging, prod in production), so a "dev falls back to default" shortcut would
// silently point at the wrong bucket depending on where this runs. Explicit everywhere
// means the switcher behaves identically regardless of environment.
const HETZNER_BUCKET_DEV = process.env.HETZNER_BUCKET_DEV ?? "";
const HETZNER_BUCKET_PROD = process.env.HETZNER_BUCKET_PROD ?? "";
const HETZNER_ENDPOINT_DEV = process.env.HETZNER_ENDPOINT_DEV ?? "";
const HETZNER_ENDPOINT_PROD = process.env.HETZNER_ENDPOINT_PROD ?? "";

function buildHetznerClient(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: "auto",
    credentials: {
      accessKeyId: process.env.HETZNER_KEY_ID!,
      secretAccessKey: process.env.HETZNER_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

// Dev and prod buckets can live in different Hetzner regions (different endpoint
// hosts, e.g. hel1 vs nbg1) — a single S3Client pinned to one endpoint can't reach
// both, so the Bucket Browser needs one client per bucket.
const hetznerS3Dev = HETZNER_ENDPOINT_DEV ? buildHetznerClient(HETZNER_ENDPOINT_DEV) : null;
const hetznerS3Prod = HETZNER_ENDPOINT_PROD ? buildHetznerClient(HETZNER_ENDPOINT_PROD) : null;

/** Resolves a "dev"/"prod" label (as picked in the Bucket Browser's bucket switcher)
 * to its bucket name + matching S3 client. Omitting bucketKey returns the default
 * HETZNER_BUCKET/hetznerS3 pair, so every other caller in the app (photo deletes,
 * uploads, …) is unaffected — only the Bucket Browser page ever passes "dev"/"prod".
 * Both "dev" and "prod" require their own explicit HETZNER_BUCKET_DEV/PROD and
 * HETZNER_ENDPOINT_DEV/PROD env vars — neither falls back to the default. */
export function resolveHetznerTarget(bucketKey?: string): { bucket: string; client: S3Client } {
  if (bucketKey === undefined) return { bucket: HETZNER_BUCKET, client: hetznerS3 };
  if (bucketKey !== "dev" && bucketKey !== "prod") {
    throw new Error(`Invalid bucket "${bucketKey}" — must be "dev" or "prod"`);
  }
  const bucket = bucketKey === "dev" ? HETZNER_BUCKET_DEV : HETZNER_BUCKET_PROD;
  const client = bucketKey === "dev" ? hetznerS3Dev : hetznerS3Prod;
  if (!bucket || !client) {
    throw new Error(
      `Hetzner ${bucketKey} bucket is not configured (HETZNER_BUCKET_${bucketKey.toUpperCase()} / HETZNER_ENDPOINT_${bucketKey.toUpperCase()})`
    );
  }
  return { bucket, client };
}

/** Public base URL (endpoint + bucket) for a "dev"/"prod" label — combined server-side
 * from non-public env vars (HETZNER_ENDPOINT_PROD, HETZNER_BUCKET_PROD, …) so the Bucket
 * Browser page doesn't need its own NEXT_PUBLIC_* copies of them. Only callable from a
 * Server Component; pass the result down as a prop to any client component that needs it.
 * Returns "" for "prod" when it isn't configured. */
export function resolveHetznerBaseUrl(bucketKey: HetznerBucketKey): string {
  if (bucketKey === "dev") return `${HETZNER_ENDPOINT_DEV}/${HETZNER_BUCKET_DEV}`;
  if (!HETZNER_ENDPOINT_PROD || !HETZNER_BUCKET_PROD) return "";
  return `${HETZNER_ENDPOINT_PROD}/${HETZNER_BUCKET_PROD}`;
}
