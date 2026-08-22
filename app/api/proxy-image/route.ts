import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/sentry";

/** Allowed hostnames for image proxy (avoids CORS and limits SSRF). */
const ALLOWED_HOSTS = [
  "storage.googleapis.com",
  "storage.cloud.google.com",
  "firebasestorage.googleapis.com",
  "*.googleapis.com",
  // Hetzner object storage — images migrated off Firebase resolve to this
  // domain now (see docs/HETZNER_PHOTO_URL_MIGRATION.md); without it, the
  // bulk asset-download tools 403 on every migrated asset type.
  "nbg1.your-objectstorage.com",
  "localhost",
  "127.0.0.1",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_DEV_BASE_URL || "http://localhost:3001";

function isHostAllowed(host: string): boolean {
  const lower = host.toLowerCase();
  if (ALLOWED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".googleapis.com")) return true;
  try {
    const apiHost = new URL(API_URL).hostname.toLowerCase();
    if (lower === apiHost) return true;
  } catch {
    // ignore
  }
  try {
    const hetznerHost = new URL(process.env.NEXT_PUBLIC_HETZNER_BASE_URL || "").hostname.toLowerCase();
    if (hetznerHost && lower === hetznerHost) return true;
  } catch {
    // ignore
  }
  try {
    const r2Host = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").hostname.toLowerCase();
    if (r2Host && lower === r2Host) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Proxies image requests so the browser does not hit CORS when fetching
 * gallery images from storage (e.g. GCS). Query: url=<encoded image URL>.
 */
export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(urlParam);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return NextResponse.json({ error: "Only http(s) URLs allowed" }, { status: 400 });
    }

    if (!isHostAllowed(targetUrl.hostname)) {
      return NextResponse.json(
        { error: `URL host not allowed: ${targetUrl.hostname}` },
        { status: 403 }
      );
    }

    const res = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "Instafarms-Admin-Image-Proxy/1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Upstream returned ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const blob = await res.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    captureError(err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
