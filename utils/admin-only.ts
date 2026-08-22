import "server-only";
import { cookies } from "next/headers";
import type { AdminPanelRole, AdminPermissionKey } from "@repo/db/types";
import { apiGet } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

const VERIFY_RETRY_ATTEMPTS = 3;
const VERIFY_RETRY_DELAY_MS = 300;

/** A genuine, non-timing-related rejection (wrong account, malformed response) - never retried. */
class NonRetryableAuthError extends Error {}

async function verifyAdminOnce(token: string) {
  const apiUrl =
    process.env.NEXT_PUBLIC_DEV_BASE_URL || "http://localhost:3001";

  const response = await fetch(`${apiUrl}/api/auth/verify-admin`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-App-Type": "INSTAFARMS_ADMIN",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData.message || "").toLowerCase();

    // A real "not an admin" rejection is a permission denial, not a timing
    // issue - fail immediately instead of retrying it.
    if (
      response.status === 403 ||
      message.includes("not an admin") ||
      message.includes("no admin access")
    ) {
      throw new NonRetryableAuthError(
        "This account does not have admin access.",
      );
    }

    if (
      response.status === 401 &&
      (message.includes("expired") || message.includes("invalid token"))
    ) {
      throw new Error("Your session has expired. Please login again.");
    }

    throw new Error(errorData.message || "Authentication failed");
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    console.error("[isAdmin] Invalid API response:", result);
    throw new NonRetryableAuthError(result.message || "Invalid authentication");
  }

  return {
    id: result.data.uid,
    email: result.data.email,
    phoneNumber: result.data.phoneNumber,
    firstName: result.data.name?.split(" ")[0] || "",
    lastName: result.data.name?.split(" ").slice(1).join(" ") || "",
    panelRole: result.data.panelRole,
  };
}

/**
 * Verifies admin JWT with backend. Call from server components/layout and server actions.
 * Optional: wrap with React cache() to dedupe within a single request when types support it.
 *
 * Retries transient failures a couple of times: a token issued moments ago (right
 * after OTP verification) can briefly fail here if this endpoint hasn't caught up
 * yet, which otherwise bounces the user straight back to the login page instead of
 * to the dashboard they just logged into.
 */
export async function isAdmin() {
  const cookie = await cookies();
  const token = cookie.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("You are not logged in.");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= VERIFY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await verifyAdminOnce(token);
    } catch (error) {
      lastError = error;
      if (
        error instanceof NonRetryableAuthError ||
        attempt === VERIFY_RETRY_ATTEMPTS
      ) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, VERIFY_RETRY_DELAY_MS * attempt),
      );
    }
  }

  if (lastError instanceof Error) {
    if (lastError.message !== "You are not logged in.") {
      console.error("[isAdmin] Error:", lastError.message);
    }
    throw lastError;
  }

  console.error("[isAdmin] Unexpected auth error:", lastError);
  throw new Error("Authentication error. Please logout and login again.");
}

/**
 * Server components/actions that read the database directly must apply the
 * same role permission as the API. Otherwise a deep link could bypass the
 * sidebar and API-level wallet protection.
 */
export async function getAdminPermissionState(
  permissionKey: AdminPermissionKey,
) {
  const admin = await isAdmin();
  const panelRole = admin.panelRole as AdminPanelRole | null | undefined;
  if (!panelRole) {
    return { admin, canView: false, canEdit: false };
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("jarvis-admin-token")?.value;
    if (!token) {
      throw new Error("No authentication token found");
    }

    const result = await apiGet("/api/admin-role-permissions/me", { token });
    if (!result.success) {
      throw new Error(result.message || "Failed to fetch permissions");
    }

    const rows = result.data as Array<{
      permissionKey: AdminPermissionKey;
      canView: boolean;
      canEdit: boolean;
    }>;
    const row = rows.find((r) => r.permissionKey === permissionKey);

    return {
      admin,
      canView: row?.canView ?? false,
      canEdit: row?.canEdit ?? false,
    };
  } catch (error) {
    captureError(error);
    return { admin, canView: false, canEdit: false };
  }
}

export async function requireAdminPermission(
  permissionKey: AdminPermissionKey,
  action: "view" | "edit",
) {
  const state = await getAdminPermissionState(permissionKey);
  if (
    (action === "view" && !state.canView) ||
    (action === "edit" && !state.canEdit)
  ) {
    throw new Error(
      "You do not have permission to access Wallet & Settlements.",
    );
  }
  return state.admin;
}
