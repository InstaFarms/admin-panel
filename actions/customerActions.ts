"use server";

import { revalidatePath } from "next/cache";
import { getApiAuthToken } from "@/utils/auth-utils";
import { CustomerData, ServerActionResult, ServerSearchResult } from "@/utils/types";
import { parseCustomerFormData, parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  CUSTOMERS_ERRORS,
  CUSTOMERS_SUCCESS,
  CUSTOMERS_VALIDATION,
  type CustomerSearchKey,
} from "@/constants/customers";
import { captureError } from "@/lib/sentry";

interface CustomerBrandOptions {
  brandName?: string;
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(CUSTOMERS_ERRORS.unauthorized);
  return token;
}

// ─── API error parser ─────────────────────────────────────────────────────────

function parseApiError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
      if (msg.includes("mobile") || msg.includes("phone")) {
        return CUSTOMERS_VALIDATION.mobileDuplicate;
      }
      if (msg.includes("email")) {
        return CUSTOMERS_VALIDATION.emailDuplicate;
      }
      return "A customer with these details already exists.";
    }
    if (msg.includes("not found")) return CUSTOMERS_ERRORS.notFound;
    if (msg.includes("network") || msg.includes("fetch")) return CUSTOMERS_ERRORS.networkError;
    return err.message;
  }
  return CUSTOMERS_ERRORS.createFailed;
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

export const createCustomer = async (
  formData: FormData,
  options?: CustomerBrandOptions
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

    const { firstName, lastName, mobileNumber, email, dob, gender } =
      parseCustomerFormData(formData);

    const token = await getAuthToken();
    await apiPost("/api/customers", {
      firstName,
      lastName: lastName || undefined,
      email,
      dob: dob || undefined,
      mobileNumber,
      gender: gender || "Other",
      brandName: options?.brandName,
    }, { token });

    revalidatePath("/admin/customers");
    revalidatePath("/admin/Instafarms-customer");
    revalidatePath("/admin/mago-customers");
    return { success: CUSTOMERS_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const sendCustomerOtp = async (mobileNumber: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

    const token = await getAuthToken();
    await apiPost("/api/customers/get_otp", { phone: mobileNumber }, { token });

    return { success: "OTP sent successfully" };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const verifyCustomerOtp = async (
  mobileNumber: string,
  otp: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

    const token = await getAuthToken();
    await apiPost(
      "/api/customers/validate_otp_admin",
      { phone: mobileNumber, otp },
      { token }
    );

    return { success: "Mobile number verified successfully" };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const checkCustomerMobileExists = async (
  mobileNumber: string,
  customerId?: string,
  options?: CustomerBrandOptions
): Promise<{ exists: boolean; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const response = await apiPost(
      "/api/customers/search",
      {
        searchKey: "Mobile",
        searchValue: mobileNumber,
        limit: 10,
        brandName: options?.brandName,
      },
      { token }
    );

    const toDigits = (value: string) => value.replace(/\D/g, "");
    const inputLast10 = toDigits(mobileNumber).slice(-10);

    const exists = (response.data as CustomerData[]).some((customer) => {
      if (customerId && customer.id === customerId) return false;
      const customerLast10 = toDigits(customer.mobileNumber || "").slice(-10);
      return customerLast10.length > 0 && customerLast10 === inputLast10;
    });

    return { exists };
  } catch (err) {
    captureError(err);
    return { exists: false, error: parseApiError(err) };
  }
};

export const editCustomer = async (
  id: string,
  formData: FormData,
  options?: CustomerBrandOptions
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);
    if (!id) return { error: "Invalid customer ID" };

    const { firstName, lastName, mobileNumber, email, dob, gender } =
      parseCustomerFormData(formData);

    const token = await getAuthToken();
    const query = options?.brandName
      ? `?brandName=${encodeURIComponent(options.brandName)}`
      : "";

    await apiPatch(`/api/customers/${id}${query}`, {
      firstName,
      lastName: lastName || undefined,
      mobileNumber,
      email,
      dob: dob || undefined,
      gender: gender || "Other",
    }, { token });

    revalidatePath("/admin/customers");
    revalidatePath("/admin/Instafarms-customer");
    revalidatePath("/admin/mago-customers");
    return { success: CUSTOMERS_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const deleteCustomer = async (
  id: string,
  options?: CustomerBrandOptions
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);
    if (!id) return { error: "Invalid customer ID" };

    const token = await getAuthToken();
    const query = options?.brandName
      ? `?brandName=${encodeURIComponent(options.brandName)}`
      : "";
    await apiDelete(`/api/customers/${id}${query}`, { token });

    revalidatePath("/admin/customers");
    revalidatePath("/admin/Instafarms-customer");
    revalidatePath("/admin/mago-customers");
    return { success: CUSTOMERS_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const getCustomerById = async (
  id: string,
  options?: CustomerBrandOptions
): Promise<ServerSearchResult<CustomerData>> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);
    if (!id) throw new Error("Invalid customer ID");

    const token = await getAuthToken();
    const query = options?.brandName
      ? `?brandName=${encodeURIComponent(options.brandName)}`
      : "";
    const response = await apiGet(`/api/customers/${id}${query}`, { token });

    if (!response.data) throw new Error(CUSTOMERS_ERRORS.notFound);
    return { data: response.data };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CUSTOMERS_ERRORS.fetchCustomerFailed };
  }
};

export const searchCustomer = async (
  formData: FormData,
  options?: CustomerBrandOptions
): Promise<ServerSearchResult<CustomerData[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

    const searchKey = formData.get("searchKey")?.toString() as CustomerSearchKey | undefined;
    const searchValue = parseString(formData.get("searchValue")?.toString());

    if (!searchValue) return { data: [] };
    if (!searchKey) throw new Error("Invalid search key.");

    const token = await getAuthToken();
    const response = await apiPost("/api/customers/search", {
      searchKey,
      searchValue,
      limit: 5,
      brandName: options?.brandName,
    }, { token });

    return { data: response.data };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CUSTOMERS_ERRORS.fetchFailed };
  }
};

export const getCustomers = async (
  pageNumber?: number,
  perPage?: number,
  searchKey?: CustomerSearchKey,
  searchValue?: string,
  options?: CustomerBrandOptions
) => {
  const admin = await isAdmin();
  if (!admin) throw new Error(CUSTOMERS_ERRORS.unauthorized);

  const token = await getAuthToken();

  if (pageNumber && perPage) {
    const body: Record<string, any> = {
      pageNumber,
      perPage,
      sortorder: "desc",
      orderBy: "createdAt",
    };

    // Case-insensitive, intermediate-letter matching
    if (searchKey && searchValue) {
      body.searchKey = searchKey;
      body.searchValue = searchValue.toLowerCase();
    }
    if (options?.brandName) {
      body.brandName = options.brandName;
    }

    const response = await apiPost("/api/customers/paginate", body, { token });
    return response.data;
  }

  const query = options?.brandName
    ? `?brandName=${encodeURIComponent(options.brandName)}`
    : "";
  const response = await apiGet(`/api/customers${query}`, { token });
  return response.data;
};
