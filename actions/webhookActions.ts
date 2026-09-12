"use server";

import { cookies } from "next/headers";
import { apiGet } from "@/utils/api-utils";
import { parseLimitOffset } from "@/utils/server-utils";
import { captureError } from "@/lib/sentry";
import { requireAdminPermission } from "@/utils/admin-only";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) {
    throw new Error("No authentication token found");
  }
  return token;
}

export async function getRazorpayWebhookLogs(
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<{ data: any[]; error?: string }> {
  try {
    // The API gates this on WALLET_AND_SETTLEMENTS and answers 403, which this
    // action then threw — so a denied admin got a crashed page instead of being
    // told why. Asking the permission layer first means the real reason is
    // available to render (QA #273).
    await requireAdminPermission("WALLET_AND_SETTLEMENTS", "view");
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/webhooks/razorpay/logs?${params.toString()}`,
      { token }
    );

    return { data: response.data || [] };
  } catch (error) {
    console.error("Error fetching Razorpay webhook logs:", error);
    captureError(error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to load webhook logs.",
    };
  }
}
