import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    throw new Error("Sentry API Test Error");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "test error captured" }, { status: 500 });
  }
}
