"use server";

import { cookies } from "next/headers";
import { apiGet } from "@/utils/api-utils";
import { parseLimitOffset } from "@/utils/server-utils";
import { captureError } from "@/lib/sentry";

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
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/webhooks/razorpay/logs?${params.toString()}`,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching Razorpay webhook logs:", error);
    captureError(error);
    throw error;
  }
}
