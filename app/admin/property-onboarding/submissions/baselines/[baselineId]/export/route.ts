import {
  createPropertyOnboardingWorkbook,
  propertyOnboardingExcelFilename,
  type PropertyOnboardingBaselineExport,
} from "@/lib/propertyOnboardingWorkbook";
import { ApiRequestError, apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BaselineResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
};

function asBaseline(
  value: Record<string, unknown> | undefined,
): PropertyOnboardingBaselineExport | null {
  if (!value || typeof value.id !== "string") return null;
  return {
    id: value.id,
    propertyId: typeof value.propertyId === "string" ? value.propertyId : null,
    propertyName:
      typeof value.propertyName === "string" ? value.propertyName : null,
    propertyCode:
      typeof value.propertyCode === "string" ? value.propertyCode : null,
    sourceSessionId:
      typeof value.sourceSessionId === "string" ? value.sourceSessionId : null,
    versionNumber:
      typeof value.versionNumber === "number" ? value.versionNumber : null,
    supersedesBaselineId:
      typeof value.supersedesBaselineId === "string"
        ? value.supersedesBaselineId
        : null,
    frozenBy: typeof value.frozenBy === "string" ? value.frozenBy : null,
    frozenAt:
      typeof value.frozenAt === "string" || value.frozenAt instanceof Date
        ? value.frozenAt
        : null,
    baselineCreatedAt:
      typeof value.baselineCreatedAt === "string" ||
      value.baselineCreatedAt instanceof Date
        ? value.baselineCreatedAt
        : null,
    baselineUpdatedAt:
      typeof value.baselineUpdatedAt === "string" ||
      value.baselineUpdatedAt instanceof Date
        ? value.baselineUpdatedAt
        : null,
    sessionStatus:
      typeof value.sessionStatus === "string" ? value.sessionStatus : null,
    sessionPropertySnapshot: value.sessionPropertySnapshot,
    baselineSnapshot: value.baselineSnapshot,
  };
}

/**
 * Downloads one immutable baseline through the Mago-scoped, permission-checked
 * Admin API. The route deliberately does not accept arbitrary snapshot content
 * from the browser or depend on the review queue's most-recent-100 limit.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ baselineId: string }> },
) {
  try {
    const { baselineId } = await params;
    if (!UUID_PATTERN.test(baselineId)) {
      return new Response("Onboarding baseline not found", { status: 404 });
    }
    const token = await getApiAuthToken();
    const response = await apiGet<BaselineResponse>(
      `/api/property-onboarding-admin/baselines/${encodeURIComponent(baselineId)}`,
      { token, appType: "MAGO_ADMIN" },
    );
    const baseline = asBaseline(response.data);

    if (!response.success || !baseline) {
      return new Response(response.message || "Onboarding baseline not found", {
        status: 404,
      });
    }

    const buffer = await createPropertyOnboardingWorkbook(baseline);
    const filename = propertyOnboardingExcelFilename(baseline);
    return new Response(buffer, {
      headers: {
        "cache-control": "private, no-store, max-age=0",
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Property Onboarding Export] Failed", error);
    const message =
      error instanceof Error ? error.message : "Onboarding export failed";
    if (message === "Authentication token not found") {
      return new Response("Sign in to download this onboarding export", {
        status: 401,
      });
    }
    if (error instanceof ApiRequestError && [401, 403].includes(error.status)) {
      return new Response(
        error.status === 401
          ? "Sign in to download this onboarding export"
          : "You do not have access to this onboarding export",
        { status: error.status },
      );
    }
    if (/baseline not found|not found or outside/i.test(message)) {
      return new Response("Onboarding baseline not found", { status: 404 });
    }
    return new Response("Unable to create onboarding export", { status: 500 });
  }
}
