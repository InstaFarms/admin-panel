"use server";

import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { apiGet } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

type BankAccountSummary = {
  id: string;
  bankAccountHolderName: string;
  maskedAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch?: string;
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

/** Admin-only read of the canonical bankDetails table used for owner payouts. */
export async function getOwnerBankAccountsAction(ownerId: string) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const result = await apiGet(`/api/wallet/${ownerId}/bank-accounts`, { token });
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to load bank accounts");
    }

    return { data: result.data as BankAccountSummary[] };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to load bank accounts",
    };
  }
}

/**
 * Bank destinations are host-owned sensitive data. This exists only to make a
 * stale admin client fail safely; administrators cannot add, edit or reveal
 * an owner's account number from Jarvis Admin.
 */
export async function saveOwnerBankAccountAction(
  _ownerId: string,
  _input: unknown,
) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    return {
      error:
        "Bank accounts are owner-managed in Mago Host and are view-only here.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save bank account",
    };
  }
}
