import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

const MAGO_BRAND_ID = "22222222-2222-2222-2222-222222222222";
const INSTAFARMS_BRAND_ID = "11111111-1111-1111-1111-111111111111";

const ELIVAAS_BRAND_ID = "44444444-4444-4444-4444-444444444444";

const QUICK_CREATE_APP_TYPE_BY_BRAND_ID: Record<string, string> = {
  [INSTAFARMS_BRAND_ID]: "INSTAFARMS_ADMIN",
  [MAGO_BRAND_ID]: "MAGO_ADMIN",
  [ELIVAAS_BRAND_ID]: "INSTAFARMS_ADMIN", // Elivaas uses InstaFarms admin context for now
};

interface WizardCreatePayload {
  propertyName: string;
  propertyCode: string;
  heading?: string;
  propertyTypeId?: string;
  isResort?: boolean;
  /** Resort room names captured during quick creation. */
  resortRoomNames?: string[];
  bedroomCount?: number;
  bathroomCount?: number;
  doubleBedCount?: number;
  singleBedCount?: number;
  mattressCount?: number;
  baseGuestCount?: number;
  maxGuestCount?: number;
  /** The source of truth for this property */
  propertySource?: "INSTAFARMS_EXCLUSIVE" | "MAGO" | "ELIVAAS";
}

async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("jarvis-admin-token")?.value ?? null;
}

/**
 * POST /api/wizard/properties
 *
 * Dedicated creation endpoint for the new property wizard.
 * Owns all required-field defaults so the existing backend route's
 * null-override bug (nearby_places / google_place_reviews) doesn't apply.
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: WizardCreatePayload = await req.json();

    const {
      propertyName,
      propertyCode,
      heading,
      propertyTypeId,
      isResort = false,
      resortRoomNames = [],
      bedroomCount,
      bathroomCount,
      doubleBedCount,
      singleBedCount,
      mattressCount,
      baseGuestCount,
      maxGuestCount,
      propertySource,
    } = body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!propertyName?.trim()) {
      return NextResponse.json({ error: "Property name is required." }, { status: 400 });
    }
    if (!propertyCode?.trim()) {
      return NextResponse.json({ error: "Property code is required." }, { status: 400 });
    }
    if (!propertySource) {
      return NextResponse.json({ error: "Select a property source before creating the property." }, { status: 400 });
    }

    let primaryBrandId: string;
    let additionalBrandIds: string[] = [];
    
    if (propertySource === "MAGO") {
      primaryBrandId = MAGO_BRAND_ID;
      additionalBrandIds = [INSTAFARMS_BRAND_ID];
    } else if (propertySource === "ELIVAAS") {
      primaryBrandId = ELIVAAS_BRAND_ID;
      additionalBrandIds = [INSTAFARMS_BRAND_ID];
    } else {
      primaryBrandId = INSTAFARMS_BRAND_ID;
      additionalBrandIds = [];
    }

    const normalizedResortRoomNames = isResort
      ? resortRoomNames.map((name) => String(name ?? "").trim())
      : [];
    if (isResort) {
      if (normalizedResortRoomNames.length === 0) {
        return NextResponse.json({ error: "Add at least one room for this resort." }, { status: 400 });
      }
      if (normalizedResortRoomNames.some((name) => !name)) {
        return NextResponse.json({ error: "Every resort room needs a name." }, { status: 400 });
      }
      if (
        new Set(normalizedResortRoomNames.map((name) => name.toLocaleLowerCase())).size !==
        normalizedResortRoomNames.length
      ) {
        return NextResponse.json({ error: "Every resort room needs a unique name." }, { status: 400 });
      }
    }

    // ── Build the full backend payload with safe defaults ─────────────────
    // The backend property handler explicitly sets nearbyPlaces / googlePlaceReviews
    // to null when absent, which violates the DB NOT NULL constraint.
    // We provide empty arrays here so they reach the handler as explicit values.
    const backendPayload: Record<string, unknown> = {
      propertyName: propertyName.trim(),
      propertyCode: propertyCode.trim(),
      heading: (heading?.trim() || propertyName.trim()),

      // DB NOT NULL cols that the backend inadvertently nulls out
      nearbyPlaces: [],
      googlePlaceReviews: [],
      propertySource, // Pass down the property source so backend saves it

      // Relational intent — nothing to replace on first creation
      relationIntent: {
        amenities: "unchanged",
        activities: "unchanged",
        safetyHygiene: "unchanged",
        specialDates: "unchanged",
        owners: "unchanged",
        managers: "unchanged",
        caretakers: "unchanged",
        plans: "unchanged",
        spaces: "unchanged",
        gallery: "unchanged",
      },
    };

    if (propertyTypeId) backendPayload.propertyTypeId = propertyTypeId;
    if (!isResort) {
      if (typeof bedroomCount === "number" && bedroomCount > 0) backendPayload.bedroomCount = bedroomCount;
      if (typeof bathroomCount === "number" && bathroomCount > 0) backendPayload.bathroomCount = bathroomCount;
      if (typeof doubleBedCount === "number" && doubleBedCount > 0) backendPayload.doubleBedCount = doubleBedCount;
      if (typeof singleBedCount === "number" && singleBedCount > 0) backendPayload.singleBedCount = singleBedCount;
      if (typeof mattressCount === "number" && mattressCount > 0) backendPayload.mattressCount = mattressCount;
      if (typeof baseGuestCount === "number" && baseGuestCount > 0) backendPayload.baseGuestCount = baseGuestCount;
      if (typeof maxGuestCount === "number" && maxGuestCount > 0) backendPayload.maxGuestCount = maxGuestCount;
    }

    // ── Create the property in its selected primary brand context ─────────
    // The API creates its initial property-brand mapping from X-App-Type.
    // A Mago-only selection must therefore start in MAGO_ADMIN, not be created
    // under InstaFarms and merely labelled as Mago in the wizard UI.
    const appType = QUICK_CREATE_APP_TYPE_BY_BRAND_ID[primaryBrandId];
    if (!appType) {
      return NextResponse.json(
        { error: "Unsupported brand selected for Quick Create." },
        { status: 400 }
      );
    }
    const createResult = await apiPost<{
      success?: boolean;
      message?: string;
      meta?: { propertyId?: string };
      data?: { propertyId?: string; id?: string; meta?: { propertyId?: string } };
    }>("/api/properties", backendPayload, { token, appType });

    if (!createResult?.success) {
      const msg = (createResult as any)?.message ?? "Failed to create property.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Extract the new property ID from wherever the backend puts it
    const propertyId =
      String(
        createResult?.meta?.propertyId ??
        (createResult?.data as any)?.propertyId ??
        (createResult?.data as any)?.id ??
        (createResult?.data as any)?.meta?.propertyId ??
        ""
      ).trim();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property created but ID was not returned. Check the property list." },
        { status: 500 }
      );
    }

    // ── Clone to additional brands ────────────────────────────────────────
    const cloneErrors: string[] = [];
    const createdBrandIds = [primaryBrandId];

    if (additionalBrandIds.length > 0 && primaryBrandId) {
      for (const targetBrandId of additionalBrandIds) {
        try {
          const cloneResult = await apiPost<{ success?: boolean; message?: string }>(
            `/api/properties/admin/${propertyId}/brands/clone`,
            { currentBrandId: primaryBrandId, newBrandId: targetBrandId },
            { token }
          );
          if (!cloneResult?.success) {
            cloneErrors.push(`Brand ${targetBrandId}: ${cloneResult?.message ?? "unknown error"}`);
          } else {
            createdBrandIds.push(targetBrandId);
          }
        } catch (err: any) {
          cloneErrors.push(`Brand ${targetBrandId}: ${err?.message ?? "failed"}`);
        }
      }
    }

    // Quick-create named room shells only for resorts. All customer-facing discovery also
    // requires positive day-wise pricing, so these rooms remain unbookable until an admin
    // completes their real capacity, pricing, amenities, photos, and availability in the editor.
    const roomCreationErrors: string[] = [];
    if (isResort) {
      for (const [index, roomName] of normalizedResortRoomNames.entries()) {
        try {
          const roomResult = await apiPost<{ success?: boolean; message?: string }>(
            `/api/properties/${propertyId}/rooms`,
            {
              brandId: primaryBrandId,
              brandIds: createdBrandIds,
              roomNumber: String(index + 1),
              roomName,
              roomType: "Standard",
              bedroomCount: 1,
              bathroomCount: 1,
              baseGuestCount: 1,
              maxGuestCount: 1,
              sortOrder: index,
            },
            { token, appType }
          );
          if (!roomResult?.success) {
            roomCreationErrors.push(`${roomName}: ${roomResult?.message ?? "unknown error"}`);
          }
        } catch (err: any) {
          roomCreationErrors.push(`${roomName}: ${err?.message ?? "failed"}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      propertyId,
      cloneErrors: cloneErrors.length > 0 ? cloneErrors : undefined,
      roomCreationErrors: roomCreationErrors.length > 0 ? roomCreationErrors : undefined,
    });
  } catch (err: any) {
    captureError(err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
