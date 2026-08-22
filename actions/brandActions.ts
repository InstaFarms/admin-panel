"use server";

import { getApiAuthToken } from "@/utils/auth-utils";
import { apiGet } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

export async function getAllBrands(columns?: string[]) {
    try {
        const token = await getApiAuthToken();
        if (!token) throw new Error("Unauthorized");

        const query = columns && columns.length > 0 ? `?columns=${columns.join(",")}` : "";
        const json = await apiGet<any>(`/api/brands/all${query}`, { token });

        return json.success ? json.data : [];
    } catch (error) {
        console.error("Error fetching brands:", error);
        captureError(error);
        return [];
    }
}
