"use server";

import { apiGet, apiPost, apiPatch, apiDelete, buildQueryString } from "../utils/api-utils";

import { getApiAuthToken } from "@/utils/auth-utils";

import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/sentry";

type AuditMasterType = "area-categories" | "checklist-categories" | "checklist-items" | "issue-types";

export async function getAuditMasterData(type: AuditMasterType, params: any) {
    try {
        const token = await getApiAuthToken();
        console.log(`[getAuditMasterData] Token present: Yes, Type: ${type}`);
        const queryString = buildQueryString(params);
        const response = await apiGet(`/api/audit-master/${type}/paginate${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error(`Error fetching ${type}:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function getAuditMasterItem(type: AuditMasterType, id: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiGet(`/api/audit-master/${type}/${id}`, { token });
        return response;
    } catch (error: any) {
        console.error(`Error fetching ${type} item:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function createAuditMasterItem(type: AuditMasterType, data: any) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost(`/api/audit-master/${type}`, data, { token });
        revalidatePath(`/admin/audit-master/${type}`);
        return response;
    } catch (error: any) {
        console.error(`Error creating ${type}:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function updateAuditMasterItem(type: AuditMasterType, id: string, data: any) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/audit-master/${type}/${id}`, data, { token });
        revalidatePath(`/admin/audit-master/${type}`);
        return response;
    } catch (error: any) {
        console.error(`Error updating ${type}:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function bulkImportAuditMasterItems(type: AuditMasterType, rows: Record<string, any>[], replaceExisting: boolean) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost(`/api/audit-master/${type}/bulk-import`, { rows, replaceExisting }, { token });
        revalidatePath(`/admin/audit-master/${type}`);
        return response;
    } catch (error: any) {
        console.error(`Error bulk-importing ${type}:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}

export async function deleteAuditMasterItem(type: AuditMasterType, id: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiDelete(`/api/audit-master/${type}/${id}`, { token });
        revalidatePath(`/admin/audit-master/${type}`);
        return response;
    } catch (error: any) {
        console.error(`Error deleting ${type}:`, error);
        captureError(error);
        return { success: false, message: error.message };
    }
}
