"use server";

import { apiGet, apiPatch } from "../utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { captureError } from "@/lib/sentry";
import { revalidatePath } from "next/cache";

const base = "/api/property-onboarding-admin/requests";
const MAGO_ADMIN = "MAGO_ADMIN";

async function call<T>(fn: (token: string) => Promise<T>) {
  try {
    return await fn(await getApiAuthToken());
  } catch (error: any) {
    captureError(error);
    return {
      success: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Property onboarding review failed",
    };
  }
}

export async function getPropertyOnboardingReviewQueue(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return call((token) =>
    apiGet(`${base}${query}`, { token, appType: MAGO_ADMIN }),
  );
}

export async function getPropertyOnboardingSubmission(id: string) {
  return call((token) =>
    apiGet(`${base}/${encodeURIComponent(id)}`, {
      token,
      appType: MAGO_ADMIN,
    }),
  );
}

export async function reviewPropertyOnboardingSubmission(
  id: string,
  data: {
    decision: "APPROVE" | "CHANGES_REQUESTED" | "REJECT";
    reviewNote?: string;
  },
) {
  const result = await call((token) =>
    apiPatch(`${base}/${encodeURIComponent(id)}/review`, data, {
      token,
      appType: MAGO_ADMIN,
    }),
  );
  revalidatePath("/admin/property-onboarding");
  revalidatePath("/admin/property-onboarding/submissions");
  return result;
}
