import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  resolveR2Target,
  assertR2Configured,
  r2S3,
  R2_BUCKET,
  assertR2ProductionConfigured,
  type R2BucketKey,
} from "@/lib/r2-s3";
import { isAdmin } from "@/utils/admin-only";

// POST /api/r2-upload/image?key=folder/file.jpg[&bucket=dev|prod]
// Body: raw file binary (application/octet-stream or actual mime type)
// `bucket` is only ever sent by the R2 Bucket Browser page (to target whichever bucket
// it's currently viewing); every other caller (e.g. GalleryUploadContext) omits it and
// gets the plain production bucket.
export async function POST(req: NextRequest) {
  try {
    await isAdmin();

    const s3Key = req.nextUrl.searchParams.get("key");
    if (!s3Key) {
      return NextResponse.json({ error: "Missing key query param" }, { status: 400 });
    }

    const bucketParam = req.nextUrl.searchParams.get("bucket");
    let Bucket: string;
    let client: typeof r2S3;
    if (bucketParam === null) {
      assertR2ProductionConfigured();
      Bucket = R2_BUCKET;
      client = r2S3;
    } else {
      if (bucketParam !== "dev" && bucketParam !== "prod") {
        return NextResponse.json({ error: 'Invalid "bucket" query param — must be "dev" or "prod"' }, { status: 400 });
      }
      assertR2Configured();
      ({ bucket: Bucket, client } = resolveR2Target(bucketParam as R2BucketKey));
    }

    const contentType = req.headers.get("content-type") ?? "image/webp";
    const buffer = Buffer.from(await req.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
