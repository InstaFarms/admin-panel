"use server";

import { cookies } from "next/headers";

import { apiGet, apiPut } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { captureError } from "@/lib/sentry";
import type { ServerActionResult } from "@/utils/types";
import type {
  MilestoneRevenueBasis,
  MilestoneSetupStatus,
} from "@/constants/propertyCommercialConfig";

export type AgreementModelOption = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isRentBasisModel: boolean;
  isExpensesBasisModel: boolean;
  isActive: boolean;
};

export type AgreementConfig = {
  id: string;
  propertyId: string;
  agreementModelId: string;
  agreementModelName: string;
  agreementModelCode: string;
  milestoneEnabled: boolean;
  milestoneSetupId: string | null;
  rent: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export type MilestoneSetup = {
  id: string;
  propertyId: string;
  name: string;
  revenueBasis: MilestoneRevenueBasis;
  status: MilestoneSetupStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MilestoneSetupLine = {
  id?: string | null;
  milestoneSetupId?: string;
  milestoneNumber: number;
  label: string;
  minRevenue: number;
  maxRevenue: number | null;
  commissionPercentage: number;
  sortOrder: number;
};

export type AgreementMilestoneConfig = {
  agreementConfig: AgreementConfig | null;
  setup: MilestoneSetup | null;
  lines: MilestoneSetupLine[];
  hasBookingSnapshotReferences?: boolean;
  propertyCreatedAt?: string | null;
};

export type SaveAgreementMilestoneConfigInput = {
  propertyId: string;
  agreementConfigId?: string | null;
  agreementModelId: string;
  milestoneEnabled: boolean;
  rent?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  setup?: {
    id?: string | null;
    name: string;
    revenueBasis: MilestoneRevenueBasis;
    status?: MilestoneSetupStatus;
    effectiveFrom: string;
    effectiveTo?: string | null;
  } | null;
  lines?: MilestoneSetupLine[];
};

export type MonthlyMilestoneTracker = {
  id: string;
  propertyId: string;
  month: string;
  milestoneSetupId: string | null;
  status: "OPEN" | "CLOSED" | "ADJUSTED";
  provisionalCommissionRate: number | null;
  finalCommissionRate: number | null;
  provisionalMilestoneNumber: number | null;
  finalMilestoneNumber: number | null;
  revenueWithGst: number;
  revenueWithoutGst: number;
  commissionableBaseTotal: number;
  commissionCharged: number;
  commissionGstCharged: number;
  commissionAdjustment: number;
  commissionGstAdjustment: number;
  ownerCreditAmount: number;
  closedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MilestoneRevenueLedger = {
  id: string;
  propertyId: string;
  milestoneTrackerId: string | null;
  month: string;
  entryType: "CREDIT" | "DEBIT";
  sourceType:
    | "BOOKING"
    | "CANCELLATION"
    | "POSITIVE_ADJUSTMENT"
    | "NEGATIVE_ADJUSTMENT"
    | "NOTIONAL_REVENUE"
    | "MANUAL_CORRECTION"
    | "OWNER_BLOCK_RENT";
  sourceId: string;
  bookingId: string | null;
  blockedInventoryId: string | null;
  blockReason: string | null;
  revenueAmountInclGst: number;
  revenueAmountExclGst: number;
  notionalDays: number | null;
  notionalRatePerDay: number | null;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("Unauthorized");
  return token;
}

async function assertAdmin() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
}

/**
 * Errors thrown out of a Server Action are redacted by Next.js in production —
 * the client only ever receives "An error occurred in the Server Components
 * render...". That hid genuinely actionable validation messages from admins on
 * the Agreement & Milestone panel (e.g. the brand/agreement-model policy, which
 * deliberately spells out the operator's options). Every action below therefore
 * RETURNS its failure as a value so the real message reaches the UI.
 */
function toActionError(error: unknown, fallback: string): string {
  captureError(error);
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export async function getAgreementModelOptions(): Promise<
  ServerActionResult<AgreementModelOption[]>
> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiGet<{
      success?: boolean;
      data: AgreementModelOption[];
      message?: string;
    }>("/api/admin/agreement-models?status=ACTIVE&limit=100", { token });
    return { data: result.data ?? [] };
  } catch (error) {
    return {
      error: toActionError(error, "Failed to load agreement models."),
      data: [],
    };
  }
}

export async function getAgreementMilestoneConfig(
  propertyId: string,
): Promise<ServerActionResult<AgreementMilestoneConfig | null>> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiGet<{
      success: boolean;
      data: AgreementMilestoneConfig;
      message?: string;
    }>(`/api/admin/properties/${propertyId}/agreement-milestone/config`, {
      token,
    });
    return { data: result.data ?? null };
  } catch (error) {
    return {
      error: toActionError(error, "Failed to load agreement configuration."),
      data: null,
    };
  }
}

export async function saveAgreementMilestoneConfig(
  input: SaveAgreementMilestoneConfigInput,
): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPut<{
      success: boolean;
      data: unknown;
      message?: string;
    }>("/api/admin/properties/agreement-milestone/config", input, { token });
    if (!result.success) {
      throw new Error(result.message || "Save failed");
    }
    return { success: "Agreement and milestone config saved.", data: result.data };
  } catch (error) {
    return {
      error: toActionError(
        error,
        "Failed to save agreement and milestone config.",
      ),
    };
  }
}

export async function getMonthlyMilestoneTrackers(
  propertyId: string,
): Promise<ServerActionResult<MonthlyMilestoneTracker[]>> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiGet<{
      success: boolean;
      data: MonthlyMilestoneTracker[];
      message?: string;
    }>(`/api/admin/properties/${propertyId}/agreement-milestone/trackers`, {
      token,
    });
    return { data: result.data ?? [] };
  } catch (error) {
    return {
      error: toActionError(error, "Failed to load milestone trackers."),
      data: [],
    };
  }
}

export async function getMilestoneRevenueLedger(
  propertyId: string,
): Promise<ServerActionResult<MilestoneRevenueLedger[]>> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiGet<{
      success: boolean;
      data: MilestoneRevenueLedger[];
      message?: string;
    }>(`/api/admin/properties/${propertyId}/agreement-milestone/ledger`, {
      token,
    });
    return { data: result.data ?? [] };
  } catch (error) {
    return {
      error: toActionError(error, "Failed to load milestone ledger."),
      data: [],
    };
  }
}
