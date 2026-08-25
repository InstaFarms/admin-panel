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

export type PropertyCollectionAccountSummary = BankAccountSummary & {
  label: string;
  isMappedToProperty?: boolean;
};

export type PropertyCollectionAccountConfig = {
  propertyId: string;
  owner: { id: string; name: string } | null;
  config: {
    id: string;
    receiverType: "PLATFORM" | "OWNER";
    selectedAccount: PropertyCollectionAccountSummary | null;
  } | null;
  platformAccounts: PropertyCollectionAccountSummary[];
  ownerAccounts: PropertyCollectionAccountSummary[];
};

export type NewCollectionAccount = {
  label?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branch?: string;
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

/** Admin-only, property-level manual collection configuration. */
export async function getPropertyCollectionAccountConfigAction(propertyId: string) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    if (!propertyId) throw new Error("Choose a property");

    const token = await getAuthToken();
    const result = await apiGet(
      `/api/properties/${propertyId}/collection-account-config`,
      { token },
    );
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to load collection account");
    }
    return { data: result.data as PropertyCollectionAccountConfig };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to load collection account",
    };
  }
}

/**
 * Saves who receives future manual guest payments for one property. The API
 * validates that owner accounts belong to the property owner and never returns
 * an unmasked account number.
 */
export async function savePropertyCollectionAccountConfigAction(input: {
  propertyId: string;
  receiverType: "PLATFORM" | "OWNER";
  accountId?: string;
  newAccount?: NewCollectionAccount;
}) {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    if (!input.propertyId) throw new Error("Choose a property");
    if (Boolean(input.accountId) === Boolean(input.newAccount)) {
      throw new Error("Select one saved account or enter one new account");
    }

    const token = await getAuthToken();
    const result = await apiPut(
      `/api/properties/${input.propertyId}/collection-account-config`,
      {
        receiverType: input.receiverType,
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(input.newAccount ? { newAccount: input.newAccount } : {}),
      },
      { token },
    );
    if (!result.success) {
      throw new Error(result.message || result.error || "Failed to save collection account");
    }
    return { data: result.data as PropertyCollectionAccountConfig, success: "Property collection account saved." };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to save collection account",
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
