"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiDelete, apiGet, apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

async function getToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("jarvis-admin-token")?.value;
    return token;
}

export async function previewBulkUpdate(data: any) {
    const token = await getToken();
    try {
        const result = await apiPost<{ data?: any }>(`/api/bulk/preview`, data, {
            token,
            cache: "no-store",
        });
        return { success: true, data: result.data };
    } catch (error: any) {
        console.error("Bulk Preview Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function executeBulkUpdate(data: any, revalidatePathStr?: string) {
    const token = await getToken();
    try {
        const result = await apiPost<any>(`/api/bulk/execute`, data, {
            token,
            cache: "no-store",
        });
        if (revalidatePathStr) revalidatePath(revalidatePathStr);
        revalidatePath("/admin/properties/bulk-update"); // Keep for backward compatibility or global view
        return { success: true, data: result, message: result.message };
    } catch (error: any) {
        console.error("Bulk Execute Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function fetchBulkLogs(brandId?: string) {
    const token = await getToken();
    try {
        const url = brandId ? `/api/bulk?brandId=${brandId}` : `/api/bulk`;
        const result = await apiGet<{ data?: any }>(url, {
            token,
            cache: "no-store",
        });
        return { success: true, data: result.data };
    } catch (error: any) {
        console.error("Fetch Bulk Logs Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function deleteBulkLog(id: string) {
    const token = await getToken();
    try {
        const result = await apiDelete<any>(`/api/bulk/${id}`, { token });
        revalidatePath("/admin/properties/bulk-update");
        return { success: result.message || "Log deleted successfully" };
    } catch (error: any) {
        console.error("Delete Bulk Log Error:", error);
        captureError(error);
        return { error: error.message };
    }
}

export async function executePermanentBulkUpdate(data: any, revalidatePathStr?: string) {
    const token = await getToken();
    try {
        const result = await apiPost<any>(`/api/bulk/permanent-execute`, data, {
            token,
            cache: "no-store",
        });
        if (revalidatePathStr) revalidatePath(revalidatePathStr);
        revalidatePath("/admin/properties/permanent-price-update");
        return { success: true, data: result, message: result.message };
    } catch (error: any) {
        console.error("Permanent Bulk Execute Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function fetchPermanentLogs(brandId?: string) {
    const token = await getToken();
    try {
        const url = brandId ? `/api/bulk/permanent-logs?brandId=${brandId}` : `/api/bulk/permanent-logs`;
        const result = await apiGet<{ data?: any }>(url, {
            token,
            cache: "no-store",
        });
        return { success: true, data: result.data };
    } catch (error: any) {
        console.error("Fetch Permanent Logs Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function revertPermanentBulkUpdate(id: string) {
    const token = await getToken();
    try {
        const result = await apiPost<any>(`/api/bulk/permanent-revert/${id}`, {}, {
            token,
            cache: "no-store",
        });
        revalidatePath("/admin/properties/permanent-price-update");
        return { success: true, message: result.message };
    } catch (error: any) {
        console.error("Revert Permanent Bulk Error:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}
