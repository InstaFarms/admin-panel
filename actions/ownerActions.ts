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

export async function addOwner(owner: {
  propertyId: string;
  ownerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiPost(
      `/api/properties/${owner.propertyId}/owners/assign`,
      { ownerId: owner.ownerId },
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/owners");
    return { success: "User added as owner." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function removeOwner(owner: {
  propertyId: string;
  ownerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiDelete(
      `/api/properties/${owner.propertyId}/owners/${owner.ownerId}`,
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/owners");
    return { success: "Owner Removed" };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function updateOwnerProperties(
  ownerId: string,
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
      `/api/owners/${ownerId}/properties`,
      { token }
    );

    const currentPropertyIds = (currentAssignmentsData.data || []).map((p: any) => p.entityId || p.propertyId);

    // Find properties to add and remove
    const propertiesToAdd = propertyIds.filter(id => !currentPropertyIds.includes(id));
    const propertiesToRemove = currentPropertyIds.filter(id => !propertyIds.includes(id));

    // Remove old properties
    for (const propertyId of propertiesToRemove) {
      await apiDelete(
        `/api/properties/${propertyId}/owners/${ownerId}`,
        { token }
      );
    }

    // Add new properties
    for (const propertyId of propertiesToAdd) {
      await apiPost(
        `/api/properties/${propertyId}/owners/assign`,
        { ownerId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/owners");
    return { success: "Owner properties updated successfully." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function createOwnerWithProperties(
  ownerData: {
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
      ownerData,
      { token }
    );

    const userId = createUserData.data?.id;

    // Assign properties to owner
    for (const propertyId of propertyIds) {
      await apiPost(
        `/api/properties/${propertyId}/owners/assign`,
        { ownerId: userId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/owners");
    return { success: propertyIds.length > 0 ? "Owner created with properties." : "Owner created." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function checkOwnerRoleExists(
  ownerId: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();
    const response = await apiGet<{ data?: Array<{ propertyId?: string | null }> }>(
      `/api/owners/${ownerId}/properties`,
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
