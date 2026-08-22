"use server";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from "../utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { revalidatePath } from "next/cache";
import { captureError } from "@/lib/sentry";

export type OnboardingMasterKind = "levels" | "locations" | "area-types";
const base = "/api/property-onboarding-admin";

async function call<T>(
  fn: (token: string) => Promise<T>,
): Promise<T | { success: false; message: string }> {
  try {
    return await fn(await getApiAuthToken());
  } catch (error: any) {
    captureError(error);
    return { success: false, message: error.message };
  }
}

export async function getOnboardingReadiness() {
  return call((token) => apiGet(`${base}/readiness`, { token }));
}
export async function getOnboardingMaster(kind: OnboardingMasterKind) {
  return call((token) => apiGet(`${base}/${kind}`, { token }));
}
export async function createOnboardingMaster(
  kind: OnboardingMasterKind,
  data: any,
) {
  const result = await call((token) =>
    apiPost(`${base}/${kind}`, data, { token }),
  );
  revalidatePath("/admin/property-onboarding");
  return result;
}
export async function updateOnboardingMaster(
  kind: OnboardingMasterKind,
  id: string,
  data: any,
) {
  const result = await call((token) =>
    apiPatch(`${base}/${kind}/${id}`, data, { token }),
  );
  revalidatePath("/admin/property-onboarding");
  return result;
}
export async function getOnboardingTemplates() {
  return call((token) => apiGet(`${base}/templates/all`, { token }));
}
export async function createOnboardingTemplate(data: any) {
  const result = await call((token) =>
    apiPost(`${base}/templates/manage`, data, { token }),
  );
  revalidatePath("/admin/property-onboarding/templates");
  return result;
}
export async function updateOnboardingTemplate(id: string, data: any) {
  const result = await call((token) =>
    apiPut(`${base}/templates/${id}`, data, { token }),
  );
  revalidatePath("/admin/property-onboarding/templates");
  return result;
}
export async function deactivateOnboardingTemplate(id: string) {
  const result = await call((token) =>
    apiDelete(`${base}/templates/${id}`, { token }),
  );
  revalidatePath("/admin/property-onboarding/templates");
  return result;
}
