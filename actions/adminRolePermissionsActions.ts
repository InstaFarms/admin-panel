"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiGet, apiPost, apiPut } from "@/utils/api-utils";
import type {
  AdminPermissionMatrix,
  MyAdminPermission,
  ServerActionResult,
} from "@/utils/types";
import type { AdminPanelRole, AdminPermissionKey } from "@repo/db/types";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

export async function getRolePermissionMatrix(): Promise<AdminPermissionMatrix> {
  const token = await getAuthToken();
  const result = await apiGet<{ success: boolean; data: AdminPermissionMatrix }>(
    "/api/admin-role-permissions/matrix",
    { token }
  );

  if (!result.success) {
    throw new Error("Failed to fetch role-permission matrix");
  }

  return result.data;
}

export async function getMyAdminPermissions(): Promise<MyAdminPermission[]> {
  const token = await getAuthToken();
  const result = await apiGet<{ success: boolean; data: MyAdminPermission[] }>(
    "/api/admin-role-permissions/me",
    { token }
  );

  if (!result.success) {
    return [];
  }

  return result.data || [];
}

export async function syncDefaultPermissions(): Promise<ServerActionResult> {
  try {
    const token = await getAuthToken();
    const result = await apiPost<{ success: boolean; message?: string }>(
      "/api/admin-role-permissions/sync-defaults",
      {},
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to sync permissions");
    }

    revalidatePath("/admin/role-permissions");
    return { success: "Permissions synced successfully" };
  } catch (err: any) {
    captureError(err);
    return { error: err?.message || "Failed to sync permissions" };
  }
}

export async function resetRolePermissionsToDefaults(
  role: AdminPanelRole
): Promise<
  ServerActionResult<
    Array<{
      permissionKey: AdminPermissionKey;
      canView: boolean;
      canEdit: boolean;
    }>
  >
> {
  try {
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      message?: string;
      data?: {
        items: Array<{
          permissionKey: AdminPermissionKey;
          canView: boolean;
          canEdit: boolean;
        }>;
      };
    }>(`/api/admin-role-permissions/roles/${role}/reset-defaults`, {}, { token });

    if (!result.success) {
      throw new Error(result.message || "Failed to reset role permissions");
    }

    revalidatePath("/admin/role-permissions");
    return {
      success: result.message || "Role permissions reset to defaults",
      data: result.data?.items || [],
    };
  } catch (err: any) {
    captureError(err);
    return { error: err?.message || "Failed to reset role permissions" };
  }
}

export async function updateRolePermissions(
  role: AdminPanelRole,
  items: Array<{
    permissionKey: AdminPermissionKey;
    canView: boolean;
    canEdit: boolean;
  }>
): Promise<ServerActionResult> {
  try {
    const token = await getAuthToken();
    const result = await apiPut<{ success: boolean; message?: string }>(
      `/api/admin-role-permissions/roles/${role}`,
      { items },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to update role permissions");
    }

    revalidatePath("/admin/role-permissions");
    return { success: "Role permissions updated" };
  } catch (err: any) {
    captureError(err);
    return { error: err?.message || "Failed to update role permissions" };
  }
}
