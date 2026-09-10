"use server";

import { apiDelete, apiGet, apiPatch, apiPost } from "../utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/sentry";

const path = "/admin/audit-master/templates";

async function withTemplateApi<T>(operation: (token: string) => Promise<T>) {
  try {
    const token = await getApiAuthToken();
    return await operation(token);
  } catch (error: any) {
    captureError(error);
    return { success: false, message: error.message } as T;
  }
}

export async function getAuditTemplates() {
  return withTemplateApi<any>((token) =>
    apiGet("/api/audit-properties/templates", { token })
  );
}

export async function createAuditTemplate(data: any) {
  const result = await withTemplateApi<any>((token) =>
    apiPost("/api/audit-properties/templates", data, { token })
  );
  revalidatePath(path);
  return result;
}

export async function updateAuditTemplate(id: string, data: any) {
  const result = await withTemplateApi<any>((token) =>
    apiPatch(`/api/audit-properties/templates/${id}`, data, { token })
  );
  revalidatePath(path);
  return result;
}

export async function deleteAuditTemplate(id: string) {
  const result = await withTemplateApi<any>((token) =>
    apiDelete(`/api/audit-properties/templates/${id}`, { token })
  );
  revalidatePath(path);
  return result;
}

// Copies a template's areas + checklist items onto a property. The API inserts
// fresh rows and stores no pointer back to the template, so later edits to the
// master template never change an already-configured property.
export async function applyAuditTemplate(propertyId: string, templateId?: string) {
  const result = await withTemplateApi<any>((token) =>
    apiPost("/api/audit-properties/templates/apply", { propertyId, templateId }, { token })
  );
  revalidatePath(`/admin/properties/${propertyId}`);
  return result;
}
