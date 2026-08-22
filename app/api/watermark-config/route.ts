import { NextResponse } from "next/server";
import { getWatermarkConfig, getWatermarkImageDataUrl } from "@/actions/imageActions";

/**
 * GET /api/watermark-config
 * Returns watermark as data URL (server fetches it, avoids CORS) and display number.
 * Client uses data URL for canvas - no cross-origin image load needed.
 */
export async function GET() {
  try {
    const dataUrlResult = await getWatermarkImageDataUrl();
    if (dataUrlResult.dataUrl) {
      return NextResponse.json({
        instafarmWatermarkUrl: dataUrlResult.dataUrl, // Pass data URL so client avoids CORS
        displayNumber: dataUrlResult.displayNumber,
      });
    }
    const config = await getWatermarkConfig();
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get watermark config";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
