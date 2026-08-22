import { NextRequest, NextResponse } from "next/server";

function parseLatLng(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = parseFloat(value.trim());
  return Number.isNaN(n) ? null : n;
}

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("place_id")?.trim() || null;
    const paramLat = parseLatLng(searchParams.get("lat"));
    const paramLng = parseLatLng(searchParams.get("lng"));
    const usePropertyCoords =
      paramLat != null && paramLng != null &&
      paramLat >= -90 && paramLat <= 90 &&
      paramLng >= -180 && paramLng <= 180;

    if (!placeId && !usePropertyCoords) {
      return NextResponse.json(
        { error: "Provide place_id and/or lat & lng (property coordinates) for nearby locations" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing server API key" }, { status: 500 });
    }

    const PLACES_BASE = "https://places.googleapis.com/v1";

    let rating: number | null = null;
    let user_ratings_total: number | null = null;
    let reviews: object[] = [];
    let detailLat: number | null = null;
    let detailLng: number | null = null;

    // ── Place Details (New) ──────────────────────────────────────────────────
    if (placeId) {
      const res = await fetch(`${PLACES_BASE}/places/${placeId}?key=${apiKey}`, {
        method: "GET",
        headers: {
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,location",
        },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: json.error?.message || "Place details request failed" },
          { status: res.status }
        );
      }

      rating = typeof json.rating === "number" ? json.rating : null;
      user_ratings_total = typeof json.userRatingCount === "number" ? json.userRatingCount : null;
      detailLat = json.location?.latitude ?? null;
      detailLng = json.location?.longitude ?? null;

      reviews = (json.reviews ?? []).map((r: any) => {
        const publishTime = r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : 0;
        const langCode = r.text?.languageCode ?? null;
        const origLangCode = r.originalText?.languageCode ?? null;
        return {
          author_name: r.authorAttribution?.displayName ?? "",
          ...(r.authorAttribution?.uri && { author_url: r.authorAttribution.uri }),
          ...(langCode && { language: langCode }),
          ...(origLangCode && { original_language: origLangCode }),
          ...(r.authorAttribution?.photoUri && { profile_photo_url: r.authorAttribution.photoUri }),
          rating: typeof r.rating === "number" ? r.rating : 0,
          relative_time_description: r.relativePublishTimeDescription ?? "",
          text: r.text?.text ?? "",
          time: publishTime,
          ...(langCode != null && origLangCode != null && { translated: langCode !== origLangCode }),
        };
      });
    }

    // ── Nearby Search (New) ──────────────────────────────────────────────────
    const lat = usePropertyCoords ? paramLat! : detailLat;
    const lng = usePropertyCoords ? paramLng! : detailLng;

    let nearbyPlaces: Array<{
      place_id: string;
      name: string;
      vicinity: string;
      types: string[];
      lat: number;
      lng: number;
      distanceKm?: number;
    }> = [];

    if (lat != null && lng != null) {
      const nearbyRes = await fetch(`${PLACES_BASE}/places:searchNearby?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.location",
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 1500.0,
            },
          },
          maxResultCount: 20,
        }),
        cache: "no-store",
      });
      const nearbyJson = await nearbyRes.json();
      if (nearbyRes.ok && Array.isArray(nearbyJson.places)) {
        nearbyPlaces = nearbyJson.places.map((p: any) => {
          const placeLat = p.location?.latitude ?? lat;
          const placeLng = p.location?.longitude ?? lng;
          return {
            place_id: p.id ?? "",
            name: p.displayName?.text ?? "",
            vicinity: p.formattedAddress ?? "",
            types: Array.isArray(p.types) ? p.types : [],
            lat: placeLat,
            lng: placeLng,
            distanceKm: Math.round(haversineDistanceKm(lat, lng, placeLat, placeLng) * 100) / 100,
          };
        });
      }
    }

    return NextResponse.json({ rating, user_ratings_total, reviews, nearbyPlaces });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
