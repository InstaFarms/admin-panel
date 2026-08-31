"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from "@/utils/api-utils";
import type { Admin, ServerActionResult, ServerSearchResult } from "@/utils/types";
import { ADMIN_LIST_ERRORS } from "@/constants/admin";
import { PHONE_LENGTH } from "@/constants/auth";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

export type AdminStatusFilter = "ACTIVE" | "DEACTIVATED" | "ALL";

export type GetAdminsResult =
  | { success: Admin[]; total: number }
  | { error: string };

export const getAdmins = async (
  pageNumber: number,
  perPage: number,
  searchValue?: string,
  searchKey?: string,
  status: AdminStatusFilter = "ACTIVE",
): Promise<GetAdminsResult> => {
  try {
    const token = await getAuthToken();

    const payload: any = {
      pageNumber,
      perPage,
    };

    if (searchValue && searchKey) {
      const searchByMap: Record<string, string> = {
        Name: "firstName",
        Email: "email",
        Phone: "phone",
      };
      payload.searchBy = searchByMap[searchKey] || "firstName";
      payload.searchKey = searchValue.trim().toLowerCase();
    }

    if (status === "ACTIVE") payload.isActive = true;
    else if (status === "DEACTIVATED") payload.isActive = false;
    // "ALL" → omit isActive

    const result = await apiPost<{
      success?: boolean;
      data?: { items?: Admin[]; total?: number };
    }>("/api/admins/paginate", payload, { token });

    return {
      success: result.data?.items ?? [],
      total: Number(result.data?.total ?? 0),
    };
  } catch (err: any) {
    console.error("Error fetching admins:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : ADMIN_LIST_ERRORS.fetchFailed };
  }
};

export const getAdminById = async (id: string): Promise<Admin | null> => {
  try {
    const token = await getAuthToken();

    const result = await apiGet<{ success?: boolean; data?: Admin }>(
      `/api/admins/${id}`,
      { token }
    );

    if (!result.success && !result.data) {
      throw new Error("Admin not found");
    }

    return result.data || null;
  } catch (err: any) {
    console.error("Error fetching admin:", err);
    captureError(err);
    throw new Error(err.message || "Failed to fetch admin");
  }
};

export const checkAdminPhoneAvailability = async (
  phoneNumber: string,
  excludeId?: string,
): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    const query = buildQueryString({
      phoneNumber: phoneNumber.trim(),
      excludeId: excludeId?.trim() || undefined,
    });

    const result = await apiGet<{ success?: boolean; data?: { available?: boolean } }>(
      `/api/admins/phone-availability${query}`,
      { token }
    );

    return Boolean(result.data?.available);
  } catch (err: any) {
    console.error("Error checking admin phone availability:", err);
    captureError(err);
    throw new Error(err.message || "Failed to check phone availability");
  }
};

function parseOptionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)?.toString().trim();
  return value ? value : undefined;
}

function normalizeRequiredPhone(value: string, fieldLabel: string): string {
  const digits = value.trim().replace(/\D/g, "");

  if (digits.length !== PHONE_LENGTH) {
    throw new Error(`${fieldLabel} must be ${PHONE_LENGTH} digits`);
  }

  if (digits.startsWith("0")) {
    throw new Error(`${fieldLabel} cannot start with 0`);
  }

  return digits;
}

function normalizeOptionalPhone(value: string | undefined, fieldLabel: string): string | undefined {
  if (!value) return undefined;

  const digits = value.trim().replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.length !== PHONE_LENGTH) {
    throw new Error(`${fieldLabel} must be ${PHONE_LENGTH} digits`);
  }

  if (digits.startsWith("0")) {
    throw new Error(`${fieldLabel} cannot start with 0`);
  }

  return digits;
}

function parseAddressDetails(formData: FormData): Record<string, unknown> | undefined {
  const raw = formData.get("addressDetails")?.toString().trim();
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.error("Invalid addressDetails JSON:", error);
    captureError(error);
  }

  return undefined;
}

export const createAdmin = async (
  formData: FormData
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    const phoneNumber = normalizeRequiredPhone(
      formData.get("phoneNumber")?.toString() || "",
      "Primary phone number"
    );

    const payload = {
      firstName: formData.get("firstName")?.toString().trim() || "",
      lastName: parseOptionalString(formData, "lastName"),
      email: formData.get("email")?.toString().trim() || "",
      phoneNumber,
      panelRole: parseOptionalString(formData, "panelRole"),
      gender: parseOptionalString(formData, "gender") as Admin["gender"] | undefined,
      whatsappNumber: normalizeOptionalPhone(
        parseOptionalString(formData, "whatsappNumber"),
        "WhatsApp number"
      ),
      alternateContact: normalizeOptionalPhone(
        parseOptionalString(formData, "alternateContact"),
        "Alternate contact"
      ),
      addressDetails: parseAddressDetails(formData),
    };

    const result = await apiPost<{ success: boolean; message?: string }>(
      "/api/admins",
      payload,
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to create admin");
    }

    revalidatePath("/admin/admins");
    return { success: "Admin created successfully" };
  } catch (err: any) {
    console.error("Error creating admin:", err);
    captureError(err);
    return { error: err.message || "Failed to create admin" };
  }
};

export const editAdmin = async (
  id: string,
  formData: FormData
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();

    if (!id) {
      throw new Error("Invalid admin ID");
    }

    const phoneNumber = normalizeRequiredPhone(
      formData.get("phoneNumber")?.toString() || "",
      "Primary phone number"
    );

    const payload = {
      firstName: formData.get("firstName")?.toString().trim() || "",
      lastName: parseOptionalString(formData, "lastName"),
      phoneNumber,
      panelRole: parseOptionalString(formData, "panelRole"),
      gender: parseOptionalString(formData, "gender") as Admin["gender"] | undefined,
      whatsappNumber: normalizeOptionalPhone(
        parseOptionalString(formData, "whatsappNumber"),
        "WhatsApp number"
      ),
      alternateContact: normalizeOptionalPhone(
        parseOptionalString(formData, "alternateContact"),
        "Alternate contact"
      ),
      addressDetails: parseAddressDetails(formData),
    };

    const result = await apiPatch<{ success: boolean; message?: string }>(
      `/api/admins/${id}`,
      payload,
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to update admin");
    }

    revalidatePath("/admin/admins");
    revalidatePath(`/admin/admins/${id}`);
    return { success: "Admin updated successfully" };
  } catch (err: any) {
    console.error("Error updating admin:", err);
    captureError(err);
    return { error: err.message || "Failed to update admin" };
  }
};

export const deleteAdmin = async (id: string): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();

    if (!id) {
      throw new Error("Invalid admin ID");
    }

    const result = await apiDelete<{ success: boolean; message?: string }>(
      `/api/admins/${id}`,
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to delete admin");
    }

    revalidatePath("/admin/admins");
    return { success: "Admin deleted successfully" };
  } catch (err: any) {
    console.error("Error deleting admin:", err);
    captureError(err);
    return { error: sanitizeDeleteAdminError(err) };
  }
};

/**
 * The backend maps known delete failures to friendly text, but guard here too so
 * a raw drizzle/Postgres error ("Failed query: delete from \"admins\" …", bound
 * params and all) can never land in a toast if something slips through.
 */
function sanitizeDeleteAdminError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const looksLikeRawDbError =
    /^Failed query:/i.test(message) ||
    /\bviolates\b|\bconstraint\b|syntax error|does not exist/i.test(message);

  if (!message || looksLikeRawDbError) {
    return "Could not delete this admin. Please try again or contact support.";
  }
  return message;
}

async function setAdminActive(
  id: string,
  action: "deactivate" | "reactivate",
): Promise<ServerActionResult> {
  try {
    const token = await getAuthToken();

    if (!id) {
      throw new Error("Invalid admin ID");
    }

    const result = await apiPost<{ success: boolean; message?: string }>(
      `/api/admins/${id}/${action}`,
      {},
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || `Failed to ${action} admin`);
    }

    revalidatePath("/admin/admins");
    revalidatePath(`/admin/admins/${id}`);
    return {
      success: action === "deactivate" ? "Admin deactivated." : "Admin reactivated.",
    };
  } catch (err: any) {
    console.error(`Error running ${action} on admin:`, err);
    captureError(err);
    return {
      error: err instanceof Error ? err.message : `Failed to ${action} admin`,
    };
  }
}

export const deactivateAdmin = async (id: string): Promise<ServerActionResult> =>
  setAdminActive(id, "deactivate");

export const reactivateAdmin = async (id: string): Promise<ServerActionResult> =>
  setAdminActive(id, "reactivate");

export const searchAdmin = async (
  formData: FormData
): Promise<ServerSearchResult<Admin[]>> => {
  try {
    const token = await getAuthToken();

    const searchKeys = ["Name", "Email", "Phone"] as const;
    const searchKey = searchKeys.find(
      (x) => x === formData.get("searchKey")?.toString()
    );
    const searchValue = formData.get("searchValue")?.toString();

    if (!searchValue) {
      return { data: [] };
    }

    if (!searchKey) {
      throw new Error("Invalid search key");
    }

    const searchByMap: Record<string, string> = {
      Name: "name",
      Email: "email",
      Phone: "phoneNumber",
    };

    const searchBy = searchByMap[searchKey];

    const result = await apiPost<{ success: boolean; data?: Admin[] }>(
      "/api/admins/search",
      {
        searchBy,
        searchKey: searchValue,
        perPage: 10,
      },
      { token }
    );

    return { data: result.data || [] };
  } catch (err: any) {
    console.error("Error searching admins:", err);
    captureError(err);
    return { error: err.message || "Failed to search admins" };
  }
};
