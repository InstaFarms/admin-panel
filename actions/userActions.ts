"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { parseString, parseUserFormData } from "@/utils/server-utils";
import { ServerActionResult, ServerSearchResult } from "@/utils/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
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

export const createUser = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const { firstName, lastName, mobileNumber, whatsappNumber, email } =
      parseUserFormData(formData);

    const createData = {
      firstName,
      lastName,
      mobileNumber,
      whatsappNumber,
      email,
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPost("/api/users/admin", createData, {
      token,
    });

    revalidatePath("/admin/users");
    return { success: "User created." };
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

export const editUser = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const { firstName, lastName, mobileNumber, whatsappNumber, email } =
      parseUserFormData(formData);

    if (!id) {
      throw new Error("Invalid id.");
    }

    const updateData = {
      firstName,
      lastName,
      mobileNumber,
      whatsappNumber,
      email,
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPatch(`/api/users/admin/${id}`, updateData, {
      token,
    });

    revalidatePath("/admin/users");
    return { success: "User data updated." };
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

export const checkUserMobileExists = async (
  mobileNumber: string,
  userId?: string,
): Promise<{ exists: boolean; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();
    const response = await apiPost("/api/users/admin/search", {
      searchValue: mobileNumber,
      searchKey: "Mobile",
    }, {
      token,
    });

    const toDigits = (value: string) => value.replace(/\D/g, "");
    const inputLast10 = toDigits(mobileNumber).slice(-10);

    const exists = ((response.data as any[]) || []).some((user) => {
      if (userId && user.id === userId) return false;
      const userLast10 = toDigits(user.mobileNumber || "").slice(-10);
      return userLast10.length > 0 && userLast10 === inputLast10;
    });

    return { exists };
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    return {
      exists: false,
      error: err instanceof Error ? err.message : "Server Error.",
    };
  }
};

export const deleteUser = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    if (!id) {
      throw new Error("Invalid id.");
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiDelete(`/api/users/admin/${id}`, {
      token,
    });

    revalidatePath("/admin/users");
    return { success: "User deleted." };
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

export const getUser = async (
  id: string,
): Promise<ServerSearchResult<any>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!id) {
      return { error: "Invalid id." };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    const response = await apiGet(`/api/users/admin/${id}`, {
      token,
    });
    
    return { data: response.data as any };
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

export const searchUser = async (
  formData: FormData,
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const searchKeys = ["Name", "Email", "Mobile"] as const;
    const searchKey = searchKeys.find(
      (x) => x === formData.get("searchKey")?.toString(),
    );
    const searchValue = parseString(formData.get("searchValue")?.toString());
    const role = formData.get("role")?.toString(); // New parameter for role filtering

    if (!searchValue) {
      return { data: [] };
    }

    if (!searchKey) {
      throw new Error("Invalid search key.");
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    // Use role-specific search if role is provided
    if (role && ["Owner", "Manager", "Caretaker"].includes(role)) {
      const response = await apiPost("/api/users/admin/search-by-role", {
        searchValue,
        searchKey,
        role: role as "Owner" | "Manager" | "Caretaker",
      }, {
        token,
      });
      return { data: response.data };
    }

    // Default search for all users
    const response = await apiPost("/api/users/admin/search", {
      searchValue,
      searchKey,
    }, {
      token,
    });
    return { data: response.data };
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
