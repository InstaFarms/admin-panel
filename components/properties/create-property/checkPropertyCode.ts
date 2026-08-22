"use server";

import { getApiAuthToken } from "@/utils/auth-utils";
import { apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export async function checkPropertyCodeExists(code: string): Promise<boolean> {
  try {
    const token = await getApiAuthToken();
    if (!token) return false;

    const result = await apiPost<{ data?: unknown[]; list?: unknown[] }>(
      "/api/properties/admin/search",
      { searchBy: "propertyCode", searchKey: code, perPage: 5 },
      { token },
    );

    const rows = result?.data ?? result?.list ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return false;

    return rows.some(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        String((p as Record<string, unknown>).propertyCode ?? "").toUpperCase() ===
          code.toUpperCase(),
    );
  } catch (err) {
    captureError(err);
    return false;
  }
}
