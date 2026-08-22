"use server";

import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { apiGet } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

type BrandOption = { id: string; name: string };
type RouteRecipientRequirement = {
  fieldReference: string;
  status: string;
  reasonCode: string | null;
};
type RouteRecipientRow = {
  id: string;
  brandId: string;
  razorpayLinkedAccountId: string;
  status: string;
  metadata: unknown;
  updatedAt: string;
  bankAccountId: string | null;
  productId: string | null;
  razorpayAccountStatus: string | null;
  productActivationStatus: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  requirements: RouteRecipientRequirement[];
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

/** Read the safe, cached result of a Host-owned Razorpay Route submission. */
export async function getOwnerRouteRecipientOptionsAction(ownerId: string) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const result = await apiGet(`/api/wallet/${ownerId}/route-recipients`, { token });
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to load Route recipients");
    }

    return {
      data: result.data as { brands: BrandOption[]; recipients: RouteRecipientRow[] },
    };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to load Route recipients",
    };
  }
}

/** Stale pages cannot silently restore the retired manual acc_ mapping. */
export async function saveOwnerRouteRecipientAction(
  _ownerId: string,
  _formData: FormData,
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  return {
    error:
      "Manual Route recipient mapping has been retired. Ask the owner to complete Route onboarding in Mago Host.",
  };
}
