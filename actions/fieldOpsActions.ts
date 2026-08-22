"use server";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";
import { cookies } from "next/headers";

// Helper function to get admin auth token from cookies (same pattern as bookingActions)
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

// ---------------------------------------------------------------------------
// Shared types (mirrors the field-ops backend contract)
// ---------------------------------------------------------------------------

export interface GuestIdCollection {
  expectedCount: number;
  collectedCount: number;
  status: string;
}

export interface GuestIdCapture {
  id: string;
  mediaUrl: string;
  createdAt: string;
}

export interface GuestIdsData {
  collection: GuestIdCollection | null;
  captures: GuestIdCapture[];
}

export interface MeterConfig {
  propertyId: string;
  bookingDayExpectedUnits: number;
  nonBookingDayExpectedUnits: number;
}

export interface TaskTemplate {
  id: string;
  propertyId: string;
  title: string;
  kind: string;
  isActive?: boolean;
  /** Present when a supervisor filed this via POST /field-ops/tasks/requests. */
  config?: {
    pendingRequest?: boolean;
    requestedBy?: string;
    requestNote?: string | null;
    requestedAt?: string;
  } | null;
  createdAt?: string;
}

export type StaffRole = "CARETAKER" | "SUPERVISOR";

export interface StaffAssignment {
  id: string;
  staffId: string;
  role: StaffRole;
  propertyId: string;
  staffName?: string | null;
  isActive?: boolean;
  /** Engine assigns generated work to the primary first (deterministic). */
  isPrimary?: boolean;
  createdAt?: string;
}

export interface FieldOpsResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function toError(error: unknown, fallback: string): FieldOpsResult<never> {
  console.error(`[Admin Panel] ${fallback}:`, error);
  captureError(error);
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// ---------------------------------------------------------------------------
// 1. Collected Guest IDs (booking detail)
// ---------------------------------------------------------------------------

export const getBookingGuestIds = async (
  bookingId: string,
): Promise<FieldOpsResult<GuestIdsData>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiGet<{
      success?: boolean;
      message?: string;
      data?: GuestIdsData;
    }>(
      `/api/field-ops/admin/guest-ids?bookingId=${encodeURIComponent(bookingId)}`,
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to load guest IDs");
    }

    return {
      success: true,
      data: {
        collection: response?.data?.collection ?? null,
        captures: response?.data?.captures ?? [],
      },
    };
  } catch (error) {
    return toError(error, "Error loading guest IDs");
  }
};

// ---------------------------------------------------------------------------
// 2. Meter threshold config
// ---------------------------------------------------------------------------

export const getMeterConfig = async (
  propertyId: string,
): Promise<FieldOpsResult<MeterConfig | null>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiGet<{
      success?: boolean;
      message?: string;
      data?: MeterConfig | null;
    }>(
      `/api/field-ops/meters/config?propertyId=${encodeURIComponent(propertyId)}`,
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to load meter config");
    }

    return { success: true, data: response?.data ?? null };
  } catch (error) {
    return toError(error, "Error loading meter config");
  }
};

export const updateMeterConfig = async (payload: {
  propertyId: string;
  bookingDayExpectedUnits: number;
  nonBookingDayExpectedUnits: number;
}): Promise<FieldOpsResult<MeterConfig>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiPut<{
      success?: boolean;
      message?: string;
      data?: MeterConfig;
    }>(`/api/field-ops/meters/config`, payload, { token });

    if (response?.success === false) {
      throw new Error(response.message || "Failed to save meter config");
    }

    return { success: true, data: response?.data ?? (payload as MeterConfig) };
  } catch (error) {
    return toError(error, "Error saving meter config");
  }
};

// ---------------------------------------------------------------------------
// 3. Daily / event task templates
// ---------------------------------------------------------------------------

export const getTaskTemplates = async (
  propertyId: string,
): Promise<FieldOpsResult<TaskTemplate[]>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    // includeInactive: the admin view must show deactivated definitions —
    // that's where pending supervisor requests live until activated here.
    // NOTE: the endpoint returns { forDate, tasks } (not a bare array).
    const response = await apiGet<{
      success?: boolean;
      message?: string;
      data?: { forDate?: string; tasks?: TaskTemplate[] };
    }>(
      `/api/field-ops/tasks?propertyId=${encodeURIComponent(propertyId)}&includeInactive=true`,
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to load task templates");
    }

    return { success: true, data: response?.data?.tasks ?? [] };
  } catch (error) {
    return toError(error, "Error loading task templates");
  }
};

export const updateTaskTemplate = async (
  taskDefinitionId: string,
  patch: {
    title?: string;
    kind?: string;
    isActive?: boolean;
  },
): Promise<FieldOpsResult<TaskTemplate>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiPatch<{
      success?: boolean;
      message?: string;
      data?: { task?: TaskTemplate };
    }>(`/api/field-ops/tasks/${encodeURIComponent(taskDefinitionId)}`, patch, {
      token,
    });

    if (response?.success === false) {
      throw new Error(response.message || "Failed to update task template");
    }

    return { success: true, data: response?.data?.task };
  } catch (error) {
    return toError(error, "Error updating task template");
  }
};

export const createTaskTemplate = async (payload: {
  propertyId: string;
  title: string;
  kind: string;
}): Promise<FieldOpsResult<TaskTemplate>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiPost<{
      success?: boolean;
      message?: string;
      data?: TaskTemplate;
    }>(`/api/field-ops/tasks`, payload, { token });

    if (response?.success === false) {
      throw new Error(response.message || "Failed to create task template");
    }

    return { success: true, data: response?.data };
  } catch (error) {
    return toError(error, "Error creating task template");
  }
};

// ---------------------------------------------------------------------------
// 4. Staff <-> property assignments
// ---------------------------------------------------------------------------

export const getAssignments = async (
  propertyId: string,
): Promise<FieldOpsResult<StaffAssignment[]>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    // The route answers { data: { assignments: [...] } }, NOT a bare array. This
    // was typed as `data?: StaffAssignment[]` and returned straight through, so
    // the caller received an object and its `.filter` threw — which crashed the
    // whole Field Ops screen the moment a property was selected.
    const response = await apiGet<{
      success?: boolean;
      message?: string;
      data?: { assignments?: StaffAssignment[] } | StaffAssignment[];
    }>(
      `/api/field-ops/assignments?propertyId=${encodeURIComponent(propertyId)}`,
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to load assignments");
    }

    // Tolerate both shapes so a future flattening of the route cannot break this again.
    const payload = response?.data;
    const assignments = Array.isArray(payload)
      ? payload
      : (payload?.assignments ?? []);

    return { success: true, data: assignments };
  } catch (error) {
    return toError(error, "Error loading assignments");
  }
};

export const createAssignment = async (payload: {
  staffId: string;
  role: StaffRole;
  propertyId: string;
}): Promise<FieldOpsResult<StaffAssignment>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiPost<{
      success?: boolean;
      message?: string;
      data?: StaffAssignment;
    }>(`/api/field-ops/assignments`, payload, { token });

    if (response?.success === false) {
      throw new Error(response.message || "Failed to create assignment");
    }

    return { success: true, data: response?.data };
  } catch (error) {
    return toError(error, "Error creating assignment");
  }
};

export const deleteAssignment = async (
  assignmentId: string,
): Promise<FieldOpsResult<never>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    // The backend serves DELETE /field-ops/assignments/{id} (soft-deactivate).
    // The previous body-triple form hit a route that doesn't exist → 404.
    const response = await apiDelete<{
      success?: boolean;
      message?: string;
    }>(`/api/field-ops/assignments/${encodeURIComponent(assignmentId)}`, {
      token,
    });

    if (response?.success === false) {
      throw new Error(response.message || "Failed to remove assignment");
    }

    return { success: true };
  } catch (error) {
    return toError(error, "Error removing assignment");
  }
};

export const setPrimaryAssignment = async (
  assignmentId: string,
): Promise<FieldOpsResult<StaffAssignment>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiPost<{
      success?: boolean;
      message?: string;
      data?: { assignment?: StaffAssignment };
    }>(
      `/api/field-ops/assignments/${encodeURIComponent(assignmentId)}/primary`,
      {},
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to set primary assignment");
    }

    return { success: true, data: response?.data?.assignment };
  } catch (error) {
    return toError(error, "Error setting primary assignment");
  }
};

// ---------------------------------------------------------------------------
// 5. Property activity feed (READ-ONLY)
//    Surfaces the caretaker's recent work for a property — the same data
//    supervisors/owners see, but admins are global (no ownership restriction).
//    Backend: GET /field-ops/admin/property/{propertyId}/feed (tag FieldOps · Admin).
// ---------------------------------------------------------------------------

export interface ActivityTask {
  id: string;
  title: string;
  kind: string;
  forDate: string;
  mediaUrl: string | null;
  latitude: string | null;
  longitude: string | null;
  ocrText: string | null;
  aiPoolStatus: "CLEAN" | "DIRTY" | "UNSURE" | null;
  aiPoolReason: string | null;
  supervisorVerdict: "CLEAN" | "DIRTY" | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ActivityMeter {
  id: string;
  readingValue: number;
  previousValue: number | null;
  consumption: number | null;
  isBookingDay: boolean;
  isAnomaly: boolean;
  needsReview: boolean;
  ocrReading: number | null;
  reviewedAt: string | null;
  mediaUrl: string | null;
  forDate: string;
  createdAt: string;
}

export interface ActivityGuestIds {
  bookingId: string;
  expectedCount: number;
  collectedCount: number;
  status: string;
  createdAt: string;
}

export interface ActivityDeposit {
  bookingId: string;
  direction: "COLLECTED" | "RETURNED";
  amount: number;
  method: string;
  proofMediaUrl: string | null;
  createdAt: string;
}

export interface ActivityDoc {
  bookingId: string;
  mediaUrl: string | null;
  ocrText?: string | null;
  createdAt: string;
}

export interface PropertyActivityFeed {
  property: { id: string; propertyName: string };
  tasks: ActivityTask[];
  meters: ActivityMeter[];
  guestIds: ActivityGuestIds[];
  deposits: ActivityDeposit[];
  declarations: ActivityDoc[];
  reviews: ActivityDoc[];
}

/**
 * Read-only caretaker-activity feed for a property, for the admin panel.
 * Delegates to the admin (global) feed endpoint.
 */
export const getPropertyActivityFeed = async (
  propertyId: string,
): Promise<FieldOpsResult<PropertyActivityFeed>> => {
  try {
    await isAdmin();
    const token = await getAuthToken();

    const response = await apiGet<{
      success?: boolean;
      message?: string;
      data?: PropertyActivityFeed;
    }>(
      `/api/field-ops/admin/property/${encodeURIComponent(propertyId)}/feed`,
      { token },
    );

    if (response?.success === false) {
      throw new Error(response.message || "Failed to load activity feed");
    }

    return { success: true, data: response.data };
  } catch (error) {
    return toError(error, "Error loading activity feed");
  }
};
