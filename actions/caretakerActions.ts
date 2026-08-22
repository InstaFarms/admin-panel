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

export async function addCaretaker(caretaker: {
  propertyId: string;
  caretakerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiPost(
      `/api/properties/${caretaker.propertyId}/caretakers/assign`,
      { caretakerId: caretaker.caretakerId },
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/caretakers");
    return { success: "User added as caretaker." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function removeCaretaker(caretaker: {
  propertyId: string;
  caretakerId: string;
}): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    await apiDelete(
      `/api/properties/${caretaker.propertyId}/caretakers/${caretaker.caretakerId}`,
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/users/caretakers");
    return { success: "Caretaker Removed" };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function updateCaretakerProperties(
  caretakerId: string,
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
      `/api/caretakers/${caretakerId}/properties`,
      { token }
    );

    const currentPropertyIds = (currentAssignmentsData.data || []).map((p: any) => p.entityId || p.propertyId);

    // Find properties to add and remove
    const propertiesToAdd = propertyIds.filter(id => !currentPropertyIds.includes(id));
    const propertiesToRemove = currentPropertyIds.filter(id => !propertyIds.includes(id));

    // Remove old properties
    for (const propertyId of propertiesToRemove) {
      await apiDelete(
        `/api/properties/${propertyId}/caretakers/${caretakerId}`,
        { token }
      );
    }

    // Add new properties
    for (const propertyId of propertiesToAdd) {
      await apiPost(
        `/api/properties/${propertyId}/caretakers/assign`,
        { caretakerId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/caretakers");
    return { success: "Caretaker properties updated successfully." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function createCaretakerWithProperties(
  caretakerData: {
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
      caretakerData,
      { token }
    );

    const userId = createUserData.data?.id;

    // Assign properties to caretaker
    for (const propertyId of propertyIds) {
      await apiPost(
        `/api/properties/${propertyId}/caretakers/assign`,
        { caretakerId: userId },
        { token }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users/caretakers");
    return { success: propertyIds.length > 0 ? "Caretaker created with properties." : "Caretaker created." };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "API Error." };
    }
  }
}

export async function checkCaretakerRoleExists(
  caretakerId: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();
    const response = await apiGet<{ data?: Array<{ propertyId?: string | null }> }>(
      `/api/caretakers/${caretakerId}/properties`,
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
