import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies Google Static Maps API so the API key stays server-side.
 * Query params:
 *   center: lat,lng (required if no markers; otherwise can be derived)
 *   property: lat,lng (optional - property pin, red)
 *   nearby: lat1,lng1|lat2,lng2|... (optional - nearby pins, blue)
 *   w, h: width and height in pixels (default 640x400)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const center = searchParams.get("center");
    const property = searchParams.get("property");
    const nearby = searchParams.get("nearby");
    const w = Math.min(640, Math.max(100, parseInt(searchParams.get("w") ?? "640", 10) || 640));
    const h = Math.min(480, Math.max(100, parseInt(searchParams.get("h") ?? "400", 10) || 400));

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing server API key" }, { status: 500 });
    }

    let centerLatLng = center;
    const propCoords = property ? parseLatLng(property) : null;
    const nearbyCoords = nearby
      ? nearby.split("|").map((s) => s.trim()).filter(Boolean).map(parseLatLng).filter((c): c is [number, number] => c !== null)
      : [];

    if (!centerLatLng && propCoords) {
      centerLatLng = `${propCoords[0]},${propCoords[1]}`;
    }
    if (!centerLatLng && nearbyCoords.length > 0) {
      const avgLat = nearbyCoords.reduce((a, c) => a + c[0], 0) / nearbyCoords.length;
      const avgLng = nearbyCoords.reduce((a, c) => a + c[1], 0) / nearbyCoords.length;
      centerLatLng = `${avgLat},${avgLng}`;
    }
    if (!centerLatLng) {
      return NextResponse.json({ error: "Missing center or marker coordinates" }, { status: 400 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
    url.searchParams.set("center", centerLatLng);
    url.searchParams.set("zoom", "14");
    url.searchParams.set("size", `${w}x${h}`);
    url.searchParams.set("scale", "2");
    url.searchParams.set("key", apiKey);

    if (propCoords) {
      url.searchParams.append("markers", `color:red|label:P|${propCoords[0]},${propCoords[1]}`);
    }
    if (nearbyCoords.length > 0) {
      const nearbyParam = "color:blue|" + nearbyCoords.map((c) => `${c[0]},${c[1]}`).join("|");
      url.searchParams.append("markers", nearbyParam);
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "Static map request failed" }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

function parseLatLng(s: string): [number, number] | null {
  const parts = s.split(",").map((p) => p.trim());
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}
