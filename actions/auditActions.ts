"use server";

import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";

import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/sentry";

export async function getPropertyAuditSessions(propertyId: string) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString({ propertyId });
        const response = await apiGet(`/api/audit-properties/property-sessions${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching property audit sessions:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function getAuditAreas(propertyId: string, entityId?: string) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString({ propertyId, entityId });
        const response = await apiGet(`/api/audit-properties/areas${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching audit areas:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function createAuditArea(data: { propertyId: string; entityId?: string; areaCategoryId: string; areaName: string; weight: number; isSystemArea: boolean; isActive: boolean }) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost("/api/audit-properties/areas", data, { token });
        revalidatePath(`/admin/properties/${data.propertyId}`);
        return response;
    } catch (error: any) {
        console.error("Error creating audit area:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function deleteAuditArea(propertyId: string, id: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiDelete(`/api/audit-properties/areas/${id}`, { token });
        revalidatePath(`/admin/properties/${propertyId}`);
        return response;
    } catch (error: any) {
        console.error("Error deleting audit area:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function getAuditAreaItems(auditAreaId: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiGet(`/api/audit-properties/items/${auditAreaId}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching audit area items:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function addAuditChecklistItem(propertyId: string, type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", data: any) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost(`/api/audit-properties/items/${type}`, data, { token });
        revalidatePath(`/admin/properties/${propertyId}`);
        return response;
    } catch (error: any) {
        console.error("Error adding audit checklist item:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function updateAuditChecklistItem(propertyId: string, type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string, data: any) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/audit-properties/items/${type}/${id}`, data, { token });
        revalidatePath(`/admin/properties/${propertyId}`);
        return response;
    } catch (error: any) {
        console.error("Error updating audit checklist item:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function deleteAuditChecklistItem(propertyId: string, type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiDelete(`/api/audit-properties/items/${type}/${id}`, { token });
        revalidatePath(`/admin/properties/${propertyId}`);
        return response;
    } catch (error: any) {
        console.error("Error deleting audit checklist item:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function validateAuditReportImport(sessions: any[]) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost("/api/audit-properties/audit-report-import/validate", { sessions }, { token });
        return response;
    } catch (error: any) {
        console.error("Error validating audit report import:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function applyAuditReportImport(
    sessions: any[],
    overrides: Record<string, string>,
    forceReimportPropertyIds: string[]
) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost(
            "/api/audit-properties/audit-report-import/apply",
            { sessions, overrides, forceReimportPropertyIds },
            { token }
        );
        return response;
    } catch (error: any) {
        console.error("Error applying audit report import:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function bulkValidateAuditConfigImport(properties: any[]) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost("/api/audit-properties/config/bulk-validate", { properties }, { token });
        return response;
    } catch (error: any) {
        console.error("Error validating bulk audit config import:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function bulkApplyAuditConfigImport(properties: any[]) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost("/api/audit-properties/config/bulk-apply", { properties }, { token });
        return response;
    } catch (error: any) {
        console.error("Error applying bulk audit config import:", error);
        captureError(error);
        return { success: false, message: error.message };
    }
}
