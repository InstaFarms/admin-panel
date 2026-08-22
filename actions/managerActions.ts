"use server";

import { isAdmin } from "@/utils/admin-only";
import { ServerActionResult } from "@/utils/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiGet, apiPost, apiDelete } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

// Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

export async function addManager(manager: {
  propertyId: string;
  managerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiPost(
      `/api/properties/${manager.propertyId}/managers/assign`,
      { managerId: manager.managerId },
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/managers");
    return { success: "User added as manager." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function removeManager(manager: {
  propertyId: string;
  managerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiDelete(
      `/api/properties/${manager.propertyId}/managers/${manager.managerId}`,
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/managers");
    return { success: "Manager Removed" };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}
export async function updateManagerProperties(
  managerId: string,
  propertyIds: string[]
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    // Get current property assignments from API
    const currentAssignmentsData = await apiGet<{ data: Array<{ entityId?: string; propertyId?: string }> }>(
      `/api/managers/${managerId}/properties`,
      { token }
    );

    const currentPropertyIds = (currentAssignmentsData.data || []).map((p: any) => p.entityId || p.propertyId);

    // Find properties to add and remove
    const propertiesToAdd = propertyIds.filter(id => !currentPropertyIds.includes(id));
    const propertiesToRemove = currentPropertyIds.filter(id => !propertyIds.includes(id));

    // Remove old properties
    for (const propertyId of propertiesToRemove) {
      await apiDelete(
        `/api/properties/${propertyId}/managers/${managerId}`,
        { token }
      );
    }

    // Add new properties
    for (const propertyId of propertiesToAdd) {
      await apiPost(
        `/api/properties/${propertyId}/managers/assign`,
        { managerId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/managers");
    return { success: "Manager properties updated successfully." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function createManagerWithProperties(
  managerData: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
    whatsappNumber?: string;
  },
  propertyIds: string[]
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    // Create user via API
    const createUserData = await apiPost<{ data: { id: string } }>(
      "/api/users/admin",
      managerData,
      { token }
    );

    const userId = createUserData.data?.id;

    // Assign properties to manager
    for (const propertyId of propertyIds) {
      await apiPost(
        `/api/properties/${propertyId}/managers/assign`,
        { managerId: userId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/managers");
    return { success: propertyIds.length > 0 ? "Manager created with properties." : "Manager created." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function checkManagerRoleExists(
  managerId: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();
    const response = await apiGet<{ data?: Array<{ propertyId?: string | null }> }>(
      `/api/managers/${managerId}/properties`,
      { token }
    );

    const properties = response.data || [];
    return { exists: properties.length > 0 };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { exists: false, error: err.message };
    } else {
      return { exists: false, error: "API Error." };
    }
  }
}
