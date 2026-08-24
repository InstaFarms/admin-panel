"use server";

import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPut } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export type BankAccountSummary = {
  id: string;
  bankAccountHolderName: string;
  maskedAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch?: string;
};

export type OwnerPropertySummary = {
  propertyId: string;
  propertyName: string;
  propertyCode?: string | null;
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

/** Admin-only, masked configuration view for selecting payout destinations per property. */
export async function getOwnerPropertyPayoutBankAssignmentsAction(ownerId: string) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const result = await apiGet(`/api/owners/${ownerId}/properties`, { token });
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to load owner properties");
    }

    return { data: result.data as OwnerPropertySummary[] };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to load owner properties",
    };
  }
}

export async function getPropertyPayoutBankAccountsAction(
  ownerId: string,
  propertyId: string,
) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const result = await apiGet(
      `/api/jarvis-wallet/${ownerId}/properties/${propertyId}/payout-bank-accounts`,
      { token },
    );
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to load property payout accounts");
    }

    return { data: result.data as BankAccountSummary[] };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to load property payout accounts",
    };
  }
}

/**
 * Assign only already-saved owner bank accounts to a property. This changes a
 * payout preference, never the bank record or any historical payout.
 */
export async function setPropertyPayoutBankAccountsAction(input: {
  ownerId: string;
  propertyId: string;
  bankAccountIds: string[];
}) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    if (!input.propertyId) throw new Error("Choose a property");

    const token = await getAuthToken();
    const result = await apiPut(
      `/api/jarvis-wallet/${input.ownerId}/properties/${input.propertyId}/payout-bank-accounts`,
      { bankAccountIds: [...new Set(input.bankAccountIds)] },
      { token },
    );
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to save payout accounts");
    }

    return { success: "Property payout accounts saved." };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to save payout accounts",
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
    void _ownerId;
    void _input;
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
