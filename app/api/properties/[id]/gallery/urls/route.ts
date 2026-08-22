import { NextRequest, NextResponse } from "next/server";
import { updatePropertyGalleryUrls } from "@/actions/propertyActions";

/**
 * PATCH /api/properties/[id]/gallery/urls
 * Updates gallery photo URLs (originalUrl, watermarkedUrlByInstafarms, thumbnailUrl) in the database.
 * Body: { updates: Array<{ photoId, originalUrl, watermarkedUrlByInstafarms, thumbnailUrl }> }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;
    const body = await req.json();
    const { updates } = body;
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "updates must be an array" }, { status: 400 });
    }
    const result = await updatePropertyGalleryUrls(propertyId, updates);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update gallery URLs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
