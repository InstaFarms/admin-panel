"use server";

import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";

import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/sentry";

export async function getSupervisors() {
    try {
        const token = await getApiAuthToken();
        const response = await apiGet("/api/supervisors", { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching supervisors:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function createSupervisor(data: { name: string; phone: string; email: string; role: string; isActive: boolean }) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost("/api/supervisors", data, { token });
        revalidatePath("/admin/supervisors");
        return response;
    } catch (error: any) {
        console.error("Error creating supervisor:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function updateSupervisor(id: string, data: { name?: string; phone?: string; email?: string; role?: string; isActive?: boolean }) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/supervisors/${id}`, data, { token });
        revalidatePath("/admin/supervisors");
        return response;
    } catch (error: any) {
        console.error("Error updating supervisor:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function deleteSupervisor(id: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiDelete(`/api/supervisors/${id}`, { token });
        revalidatePath("/admin/supervisors");
        return response;
    } catch (error: any) {
        console.error("Error deleting supervisor:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}
