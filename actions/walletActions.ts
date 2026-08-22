"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin, requireAdminPermission } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import { uploadWalletAttachmentAction } from "@/actions/imageActions";
import { captureError } from "@/lib/sentry";

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

export const createManualTransaction = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    
    const ownerId = parseString(formData.get("ownerId")?.toString());
    const transactionType = parseString(formData.get("transactionType")?.toString()) as "admin_credit" | "admin_debit";
    const amount = parseFloat(formData.get("amount")?.toString() || "0");
    const bookingId = parseString(formData.get("bookingId")?.toString());
    const remarks = parseString(formData.get("remarks")?.toString());
    let attachmentUrl = parseString(formData.get("attachmentUrl")?.toString());
    let attachmentFilename = parseString(formData.get("attachmentFilename")?.toString());
    let attachmentSize = formData.get("attachmentSize") ? parseInt(formData.get("attachmentSize")?.toString() || "0") : undefined;
    let attachmentMimeType = parseString(formData.get("attachmentMimeType")?.toString());

    // Upload attachment file to storage if present
    const attachmentFile = formData.get("attachment");
    if (attachmentFile instanceof File && attachmentFile.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", attachmentFile);
      const uploadResult = await uploadWalletAttachmentAction(uploadFormData);
      if (uploadResult.error || !uploadResult.success) {
        return { error: uploadResult.error || "Failed to upload attachment" };
      }

      attachmentUrl = uploadResult.success.url;
      attachmentFilename = attachmentFilename || attachmentFile.name;
      attachmentSize = attachmentSize ?? attachmentFile.size;
      attachmentMimeType = attachmentMimeType || attachmentFile.type;
    }

    if (!ownerId) {
      return { error: "Owner ID is required." };
    }

    if (!transactionType || !["admin_credit", "admin_debit"].includes(transactionType)) {
      return { error: "Invalid transaction type." };
    }

    if (!amount || amount <= 0) {
      return { error: "Amount must be greater than 0." };
    }

    if (!remarks || remarks.length === 0) {
      return { error: "Remarks are required." };
    }

    const token = await getAuthToken();

    const payload: {
      ownerId: string;
      transactionType: "admin_credit" | "admin_debit";
      amount: number;
      bookingId?: string;
      remarks: string;
      attachmentUrl?: string;
      attachmentFilename?: string;
      attachmentSize?: number;
      attachmentMimeType?: string;
    } = {
      ownerId,
      transactionType,
      amount,
      remarks,
      attachmentUrl: attachmentUrl || undefined,
      attachmentFilename: attachmentFilename || undefined,
      attachmentSize,
      attachmentMimeType: attachmentMimeType || undefined,
    };

    if (bookingId) {
      payload.bookingId = bookingId;
    }

    const response = await apiPost(
      "/api/wallet/transaction",
      payload,
      {
        token,
      }
    );

    revalidatePath("/admin");
    return { success: `Transaction of ₹${amount} ${transactionType === "admin_credit" ? "credited to" : "debited from"} owner's wallet successfully.` };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const retryWithdrawal = async (
  withdrawalRequestId: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!withdrawalRequestId) {
      return { error: "Invalid withdrawal request ID." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    const response = await apiPost(
      "/api/wallet/withdrawal-request/retry",
      {
        withdrawalRequestId,
      },
      {
        token,
      }
    );

    revalidatePath("/admin");
    
    if (response.success) {
      return { success: "Withdrawal retry successful. Amount transferred to owner's bank account." };
    } else {
      return { error: response.message || "Withdrawal retry failed." };
    }
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const blockSettlement = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const bookingId = parseString(formData.get("bookingId")?.toString());
    const reason = parseString(formData.get("reason")?.toString());
    const attachmentUrl = parseString(formData.get("attachmentUrl")?.toString());
    const attachmentFilename = parseString(formData.get("attachmentFilename")?.toString());
    const attachmentSize = formData.get("attachmentSize") ? parseInt(formData.get("attachmentSize")?.toString() || "0") : undefined;
    const attachmentMimeType = parseString(formData.get("attachmentMimeType")?.toString());

    if (!bookingId) {
      return { error: "Booking ID is required." };
    }

    if (!reason || reason.length === 0) {
      return { error: "Reason for blocking settlement is required." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPost(
      "/api/wallet/settlements/block",
      {
        bookingId,
        reason,
        attachmentUrl: attachmentUrl || undefined,
        attachmentFilename: attachmentFilename || undefined,
        attachmentSize,
        attachmentMimeType: attachmentMimeType || undefined,
      },
      {
        token,
      }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/wallet/settlements");
    revalidatePath("/admin/wallet/blocked-settlements");
    return { success: "Settlement blocked successfully." };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const unblockSettlement = async (
  bookingId: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!bookingId) {
      return { error: "Invalid booking ID." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPost(
      "/api/wallet/settlements/unblock",
      {
        bookingId,
      },
      {
        token,
      }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/wallet/settlements");
    revalidatePath("/admin/wallet/blocked-settlements");
    return { success: "Settlement unblocked successfully." };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const manualSettlement = async (
  bookingId: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!bookingId) {
      return { error: "Invalid booking ID." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    const response = await apiPost(
      "/api/wallet/settlements/settle-manual",
      {
        bookingId,
      },
      {
        token,
      }
    );

    // Handle skipped settlements (when owner has settlement disabled)
    if (response.skipped) {
      return { error: response.message || "Settlement skipped" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/wallet/settlements");
    const ownerSettlementAmount = response.data?.ownerSettlementAmount || 0;
    const ownersSettled = response.data?.ownersSettled || 0;
    return { 
      success: `Settlement successful. ₹${ownerSettlementAmount.toFixed(2)} credited to ${ownersSettled} owner(s).` 
    };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const toggleOwnerSettlement = async (
  ownerId: string,
  enabled: boolean,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!ownerId) {
      return { error: "Owner ID is required." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPost(
      `/api/wallet/${ownerId}/toggle-settlement`,
      {
        enabled,
      },
      {
        token,
      }
    );

    revalidatePath("/admin");
    return { 
      success: enabled 
        ? "Settlement enabled for owner. Bookings will be settled automatically." 
        : "Settlement disabled for owner. Bookings will NOT be settled automatically." 
    };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

/**
 * Get wallet balance for an owner
 */
export const getWalletBalance = async (ownerId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!ownerId) {
      throw new Error("Invalid owner ID.");
    }

    const token = await getAuthToken();
    const response = await apiGet(`/api/wallet/${ownerId}/balance`, {
      token,
    });
    return response.data;
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    throw new Error("Failed to fetch wallet balance");
  }
};

/**
 * Get transaction history for an owner
 */
export const getWalletTransactions = async (
  ownerId: string,
  params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    status?: string;
  }
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!ownerId) {
      throw new Error("Invalid owner ID.");
    }

    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.transactionType) queryParams.append("transactionType", params.transactionType);
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `/api/wallet/${ownerId}/transactions${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiGet(url, {
      token,
    });
    return response.data;
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    throw new Error("Failed to fetch wallet transactions");
  }
};

export const getOwnerPayouts = async (
  ownerId: string,
  params?: { limit?: number; offset?: number; status?: string }
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    if (!ownerId) {
      throw new Error("Invalid owner ID.");
    }
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const url = `/api/wallet/${ownerId}/payouts${queryString ? `?${queryString}` : ""}`;
    const response = await apiGet(url, { token });
    return response.data;
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    throw new Error("Failed to fetch payouts");
  }
};

export const getOwnerPendingReleaseSummary = async (ownerId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    if (!ownerId) {
      throw new Error("Invalid owner ID.");
    }

    const token = await getAuthToken();
    const params = new URLSearchParams();
    params.append("ownerId", ownerId);
    params.append("limit", "100");
    params.append("offset", "0");

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/wallet/settlements/upcoming?${params.toString()}`,
      { token }
    );

    const rows = response.data || [];
    const pendingAmount = rows.reduce((sum, row) => {
      const net = Number(row?.settlement?.netPayableToOwner || 0);
      return sum + (Number.isFinite(net) ? net : 0);
    }, 0);

    return {
      pendingCount: rows.length,
      pendingAmount,
    };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    throw new Error("Failed to fetch pending release summary");
  }
};

/** Reschedule already-frozen earnings; future bookings continue using the property policy. */
export const overrideOwnerPendingRelease = async (input: {
  ownerId: string;
  scope: "OWNER" | "PROPERTY" | "BOOKING";
  propertyId?: string;
  bookingId?: string;
  availableAt: string;
  reason: string;
}): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) throw new Error("Unauthorized");
    if (!input.ownerId) return { error: "Owner ID is required." };
    if (!input.availableAt || Number.isNaN(new Date(input.availableAt).getTime())) {
      return { error: "Choose a valid release date and time." };
    }
    if (!input.reason.trim()) return { error: "A release override reason is required." };

    const token = await getAuthToken();
    const response = await apiPatch<{
      success: boolean;
      data?: { affectedCount: number; affectedNetAmount: number };
      error?: string;
    }>("/api/wallet/release-date", input, { token });
    if (!response.success) return { error: response.error || "Failed to reschedule frozen earnings." };

    revalidatePath("/admin");
    revalidatePath(`/admin/users/owners/${input.ownerId}/wallet`);
    const count = response.data?.affectedCount ?? 0;
    const amount = response.data?.affectedNetAmount ?? 0;
    return { success: `${count} frozen ledger entr${count === 1 ? "y" : "ies"} (net ₹${amount.toFixed(2)}) rescheduled.` };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Server Error." };
  }
};

export const recordOwnerPayout = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  void formData;
  return { error: "Payouts must be initiated by the owner in Mago Host." };
};

/** Finance settles only a withdrawal the host has already initiated. */
export const completeHostPayout = async (
  ownerId: string,
  payoutId: string,
  payoutDetail: string,
): Promise<ServerActionResult> => {
  try {
    await requireAdminPermission("WALLET_AND_SETTLEMENTS", "edit");
    if (!ownerId || !payoutId) return { error: "Owner and payout are required." };
    if (payoutDetail.trim().length < 3) {
      return { error: "Enter the bank transfer reference or UTR." };
    }

    const token = await getAuthToken();
    await apiPost(
      `/api/wallet/${ownerId}/payouts/complete`,
      { payoutId, payoutDetail: payoutDetail.trim() },
      { token },
    );
    revalidatePath("/admin");
    revalidatePath(`/admin/users/owners/${ownerId}/wallet`);
    return { success: "Host withdrawal marked paid with the transfer reference." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Could not complete payout." };
  }
};

/** A failed host withdrawal restores the reserved amount through the ledger. */
export const failHostPayout = async (
  ownerId: string,
  payoutId: string,
  reason: string,
): Promise<ServerActionResult> => {
  try {
    await requireAdminPermission("WALLET_AND_SETTLEMENTS", "edit");
    if (!ownerId || !payoutId) return { error: "Owner and payout are required." };
    if (reason.trim().length < 3) return { error: "Enter a failure reason." };

    const token = await getAuthToken();
    await apiPost(
      `/api/wallet/${ownerId}/payouts/fail`,
      { payoutId, reason: reason.trim() },
      { token },
    );
    revalidatePath("/admin");
    revalidatePath(`/admin/users/owners/${ownerId}/wallet`);
    return { success: "Withdrawal marked failed and funds restored to the host wallet." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Could not fail payout." };
  }
};
