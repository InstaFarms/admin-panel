"use server";

import { isAdmin } from "@/utils/admin-only";
import { ServerActionResult } from "@/utils/types";
import { getApiAuthToken } from "@/utils/auth-utils";

import { revalidatePath } from "next/cache";
import { apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export const deleteEnquiry = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();

    if (!id) {
      return { error: "Invalid id." };
    }

    await apiPost("/api/enquiries/management/delete", { id }, { token });

    revalidatePath("/admin");
    return { success: "Enquiry deleted." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const updateEnquiryStatus = async (
  id: string,
  status: "pending" | "in_progress" | "resolved" | "closed" | "spam",
  responseMessage?: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();

    if (!id) {
      return { error: "Invalid id." };
    }

    await apiPost(
      "/api/enquiries/management/status",
      { id, status, responseMessage },
      { token }
    );

    revalidatePath("/admin");
    return { success: "Enquiry status updated." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const getEnquiries = async (
  limit: number,
  offset: number,
  search?: string,
  searchKey?: "Name" | "Email" | "Subject",
  type?: string,
  status?: string
): Promise<{ data: any[] }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();

    try {
      const result = await apiPost<{ data?: any[] }>(
        "/api/enquiries/management/paginate",
        { limit, offset, search, searchKey, type, status },
        { token, cache: "no-store" }
      );
      console.log("API Result:", result);
      return { data: result.data || [] };
    } catch (e) {
      console.error("Error getting enquiries:", e);
      captureError(e);
      return { data: [] };
    }
  } catch (err) {
    console.error("Error getting enquiries:", err);
    captureError(err);
    return { data: [] };
  }
};