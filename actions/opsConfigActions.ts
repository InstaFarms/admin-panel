"use server";

/**
 * Server actions for the per-property Operations Configuration panel
 * (`/admin/ops-config`).
 *
 * This module is the SOLE HTTP boundary between the admin panel and the
 * Operations Platform configuration API (`/api/ops/config/*`, see
 * apps/if-api/src/routes/ops-config.ts) plus the two runtime endpoints the
 * panel needs to prove configuration actually produces work
 * (`POST /api/ops/instances`, `POST /api/ops/engine/tick`).
 *
 * Conventions (mirrors actions/expenseCategoryActions.ts):
 *  - every export re-checks `isAdmin()`;
 *  - the bearer token is the httpOnly `jarvis-admin-token` cookie, read
 *    server-side only (there is deliberately no client fetch wrapper);
 *  - `X-App-Type: MAGO_ADMIN` — `/api/ops/config` runs `requireAuth`, which
 *    demands an admin app type, and the ops organization is Mago-scoped;
 *  - reads THROW (caught by error.tsx); mutations NEVER throw and return a
 *    `ServerActionResult`.
 */

import { revalidatePath } from "next/cache";

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";
import {
  ACTIVATION_DEFAULTS,
  CHAIN_REQUIREMENT_LABELS,
  OPERATION_CATEGORIES,
  OPS_CONFIG_ERRORS,
  OPS_CONFIG_SUCCESS,
  type ActivationStepKey,
  type OperationCategory,
} from "@/constants/opsConfig";

const OPS_CONFIG_PATH = "/admin/ops-config";
const APP_TYPE = "MAGO_ADMIN";

/** Every ops endpoint answers `{ success: true, data }`. */
type OpsEnvelope<T> = { success: boolean; data: T; message?: string };

// =============================================================================
// TYPES — hand-written to match packages/db/src/schema/ops.ts row shapes.
// =============================================================================

export type OpsConfigStatus = "DRAFT" | "PUBLISHED" | "RETIRED";
export type OpsTriggerType = "TIME" | "EVENT";
export type { OperationCategory };

export interface OpsOrganization {
  id: string;
  name: string;
  slug: string;
  status: string; // ACTIVE | SUSPENDED
  escalationChain: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface OpsAssetType {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  metadataSchema: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface OpsSpaceType {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsPropertySpace {
  id: string;
  propertyId: string;
  spaceTypeId: string;
  label: string;
  parentSpaceId: string | null;
  metadata: unknown;
  status: string; // ACTIVE | INACTIVE
  createdAt: string;
  updatedAt: string;
}

export interface OpsPropertyAsset {
  id: string;
  propertyId: string;
  assetTypeId: string;
  spaceId: string | null;
  label: string;
  metadata: unknown;
  status: string; // ACTIVE | DECOMMISSIONED
  createdAt: string;
  updatedAt: string;
}

export interface OpsOperation {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  category: OperationCategory;
  requiredAssetTypeId: string | null;
  targetSpaceTypeId: string | null;
  status: string; // ACTIVE | DEPRECATED
  createdAt: string;
  updatedAt: string;
}

export interface OpsOverride {
  id: string;
  propertyId: string;
  operationId: string;
  executionProfileId: string | null;
  enabled: boolean;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpsSchedule {
  id: string;
  standardProfileMapId: string;
  triggerType: OpsTriggerType;
  recurrence: string | null;
  timeOfDay: string | null;
  eventType: string | null;
  eventOffsetMinutes: number;
  condition: unknown;
  dueOffsetMinutes: number;
  leadMinutes: number;
  activeFrom: string | null;
  activeTo: string | null;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A row of `opsPropertyStandardAssignments` — null when the property has none. */
export interface OpsStandardAssignment {
  id: string;
  propertyId: string;
  standardId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsStandard {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  version: number;
  status: OpsConfigStatus;
  /** The org's onboarding default — new properties auto-inherit it. */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The inheritance join row: standard × operation → execution profile. */
export interface OpsStandardEntry {
  id: string;
  standardId: string;
  operationId: string;
  executionProfileId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpsStandardWithEntries extends OpsStandard {
  entries: OpsStandardEntry[];
}

/** Composed per-property schedule view (see getPropertySchedules). */
export interface OpsPropertyScheduleGroup {
  entry: OpsStandardEntry;
  operationId: string;
  schedules: OpsSchedule[];
}

export interface OpsGenerationError {
  id: string;
  scheduleId: string | null;
  propertyId: string | null;
  reason: string;
  payload: unknown;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OpsResponsibility =
  | "EXECUTOR"
  | "REVIEWER"
  | "APPROVER"
  | "OBSERVER"
  | "ESCALATION_CONTACT";

export type OpsStepAction =
  | "EXECUTE"
  | "VERIFY"
  | "APPROVE"
  | "OBSERVE"
  | "ESCALATE";

export type OpsOnReject = "RETURN_TO_EXECUTOR" | "ESCALATE" | "TERMINATE";

export type OpsPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface OpsWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  version: number;
  status: OpsConfigStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OpsWorkflowStep {
  id: string;
  workflowId: string;
  seq: number;
  responsibility: OpsResponsibility;
  actionType: OpsStepAction;
  required: boolean;
  onReject: OpsOnReject;
  maxResubmissions: number;
  escalation: unknown;
  createdAt: string;
  updatedAt: string;
}

/** `POST /workflows` and `GET /workflows/{id}` both answer the workflow + steps. */
export interface OpsWorkflowWithSteps extends OpsWorkflow {
  steps: OpsWorkflowStep[];
}

/** The step shape ACCEPTED by POST /workflows (ids/timestamps are server-side). */
export interface OpsWorkflowStepInput {
  seq: number;
  responsibility: OpsResponsibility;
  actionType: OpsStepAction;
  required?: boolean;
  onReject?: OpsOnReject;
  maxResubmissions?: number;
}

/** HOW an operation executes. Versioned + immutable once PUBLISHED. */
export interface OpsExecutionProfile {
  id: string;
  operationId: string;
  workflowId: string;
  name: string;
  evidenceRequirements: unknown;
  validationRules: unknown;
  aiConfig: unknown;
  sla: unknown;
  reminders: unknown;
  escalation: unknown;
  reviewPolicy: unknown;
  perAsset: boolean;
  perSpace: boolean;
  priority: OpsPriority;
  version: number;
  status: OpsConfigStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OpsExecutionProfileInput {
  operationId: string;
  workflowId: string;
  name: string;
  evidenceRequirements?: Record<string, unknown>;
  validationRules?: Record<string, unknown>;
  aiConfig?: Record<string, unknown>;
  sla?: Record<string, unknown>;
  reminders?: Record<string, unknown>[];
  escalation?: Record<string, unknown>;
  reviewPolicy?: Record<string, unknown>;
  perAsset?: boolean;
  perSpace?: boolean;
  priority?: OpsPriority;
}

/**
 * A V0 `staffPropertyAssignments` row — the table the ENGINE actually reads
 * (ops-engine-service.resolveResponsibility). A property with no active
 * CARETAKER row generates NO work and files NO_EXECUTOR_RESOLVABLE instead.
 * Responsibility mappings (below) write through to these rows.
 */
export interface OpsStaffAssignment {
  id: string;
  staffId: string;
  propertyId: string;
  role: "SUPERVISOR" | "CARETAKER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * An `opsResponsibilityMappings` row, decorated by the API with the names and
 * the live V0 state. `userId` is a users.id for EXECUTOR and a supervisors.id
 * for every other responsibility — that asymmetry is how `staffPropertyAssignments.staffId`
 * is populated, and the API rejects the wrong one.
 */
export interface OpsResponsibilityMapping {
  id: string;
  propertyId: string;
  propertyName?: string | null;
  responsibility: OpsResponsibility;
  userId: string;
  assigneeName?: string | null;
  assigneePhone?: string | null;
  /** The V0 role this mapping writes through as. */
  v0Role?: "SUPERVISOR" | "CARETAKER" | null;
  priority: number;
  active: boolean;
  /** Whether the staffPropertyAssignments row the engine reads is live. */
  v0AssignmentActive?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * An `opsResponsibilityMappings` row read as a RESPONSIBILITY OVERRIDE — the
 * DISTINCT concept the engine reads FIRST (ops-engine-service.resolveResponsibility).
 * Unlike the write-through mapping above, an override does NOT touch
 * staffPropertyAssignments, so it can pin a DIFFERENT person to REVIEWER vs
 * APPROVER at one property. `userId` is a users.id for EXECUTOR, a supervisors.id
 * otherwise (stored as-is, not cross-validated).
 */
export interface OpsResponsibilityOverride {
  id: string;
  propertyId: string;
  responsibility: OpsResponsibility;
  userId: string;
  assigneeName?: string | null;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A person assignable as a responsibility override at a property. */
export interface OpsResponsibilityCandidate {
  id: string;
  name: string | null;
  role: "CARETAKER" | "SUPERVISOR";
}

/** The authoritative "will this property generate assigned work?" diagnostic. */
export interface OpsResponsibilityStatus {
  propertyId: string;
  propertyName: string | null;
  organizationId: string | null;
  mappings: OpsResponsibilityMapping[];
  v0Assignments: OpsStaffAssignment[];
  /** responsibility → the user id the ENGINE would resolve (null = nobody). */
  resolved: Partial<Record<OpsResponsibility, string | null>>;
  canGenerate: boolean;
  /** e.g. NO_ACTIVE_STANDARD, NO_EXECUTOR_RESOLVABLE. */
  blockers: string[];
}

/** Why one operation can (or cannot) produce work anywhere. */
export interface OpsOperationReadiness {
  operation: OpsOperation;
  profileCount: number;
  publishedProfileCount: number;
  standards: {
    standardId: string;
    standardName: string;
    standardStatus: OpsConfigStatus;
    executionProfileId: string;
    enabled: boolean;
  }[];
}

// ── Chain state (the honest "can this property generate work?" read) ─────────

/**
 * One standard entry resolved all the way down: which operation, which profile,
 * and the schedules that actually fire. This is the unit the generation chain
 * is made of — `property → standard → ENTRY → schedule → instance`.
 */
export interface OpsChainEntry {
  entry: OpsStandardEntry;
  operation: OpsOperation | null;
  profile: OpsExecutionProfile | null;
  schedules: OpsSchedule[];
}

export interface OpsPropertyChainState {
  organization: OpsOrganization | null;
  assetTypeCount: number;
  spaceTypeCount: number;
  operations: OpsOperation[];
  /** Instance-per-row, never a count — two pools are two rows. */
  assets: OpsPropertyAsset[];
  spaces: OpsPropertySpace[];
  publishedWorkflows: OpsWorkflow[];
  standards: OpsStandard[];
  assignment: OpsStandardAssignment | null;
  activeStandard: OpsStandard | null;
  chain: OpsChainEntry[];
  staffAssignments: OpsStaffAssignment[];
  /** Null when the API predates the responsibilities endpoints. */
  responsibilityStatus: OpsResponsibilityStatus | null;
  /** True when the engine would find somebody to give the work to. */
  executorResolved: boolean;
  /**
   * Non-null when a chain fact could NOT be read (as opposed to being absent).
   * The UI must render UNKNOWN, never a green/absent verdict, when set.
   */
  activeStandardError: string | null;
  staffAssignmentsError: string | null;
  /** Human-readable list of what is missing, in chain order. Empty ⇒ ready. */
  missing: string[];
  /** True only when every link exists AND at least one schedule is enabled. */
  ready: boolean;
}

// ── Activation report ────────────────────────────────────────────────────────

export type ActivationStepStatus =
  | "CREATED"
  | "REUSED"
  | "OK"
  | "WARNING"
  | "SKIPPED"
  | "FAILED";

export interface ActivationStep {
  key: ActivationStepKey;
  status: ActivationStepStatus;
  detail: string;
}

export interface ActivationReport {
  steps: ActivationStep[];
  organizationId: string | null;
  workflowId: string | null;
  standardId: string | null;
  assignmentId: string | null;
  /** operationId → the PUBLISHED profile the standard entry points at. */
  profileIdByOperationId: Record<string, string>;
  scheduleIds: string[];
  /** Set when a step FAILED; the report is still returned so progress is visible. */
  failedAt: ActivationStepKey | null;
}

// =============================================================================
// INTERNALS
// =============================================================================

async function authorize(): Promise<string> {
  const admin = await isAdmin();
  if (!admin) throw new Error(OPS_CONFIG_ERRORS.unauthorized);
  return getApiAuthToken();
}

function opsOptions(token: string) {
  return { token, appType: APP_TYPE };
}

async function opsGet<T>(endpoint: string): Promise<T> {
  const token = await authorize();
  const response = await apiGet<OpsEnvelope<T>>(endpoint, opsOptions(token));
  return response.data;
}

async function opsPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const token = await authorize();
  const response = await apiPost<OpsEnvelope<T>>(
    endpoint,
    body,
    opsOptions(token),
  );
  return response.data;
}

async function opsPatch<T>(endpoint: string, body?: unknown): Promise<T> {
  const token = await authorize();
  const response = await apiPatch<OpsEnvelope<T>>(
    endpoint,
    body,
    opsOptions(token),
  );
  return response.data;
}

async function opsPut<T>(endpoint: string, body?: unknown): Promise<T> {
  const token = await authorize();
  const response = await apiPut<OpsEnvelope<T>>(
    endpoint,
    body,
    opsOptions(token),
  );
  return response.data;
}

async function opsDelete<T>(endpoint: string): Promise<T> {
  const token = await authorize();
  const response = await apiDelete<OpsEnvelope<T>>(endpoint, opsOptions(token));
  return response.data;
}

function parseError(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Mutation input. A `<form action={…}>` posts FormData; a controlled React
 * component calls the same action with a plain object. Both are accepted so
 * neither caller has to hand-build the other's shape.
 */
export type OpsActionPayload = FormData | Record<string, unknown>;

function rawValue(payload: OpsActionPayload, key: string): unknown {
  return payload instanceof FormData ? payload.get(key) : payload[key];
}

/** True when the caller supplied the key at all — the basis of partial PATCHes. */
function has(payload: OpsActionPayload, key: string): boolean {
  return payload instanceof FormData
    ? payload.has(key)
    : Object.prototype.hasOwnProperty.call(payload, key);
}

/** Trimmed string, or null for absent/blank/non-scalar values. */
function field(payload: OpsActionPayload, key: string): string | null {
  const value = rawValue(payload, key);
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return parseString(value.trim() || undefined);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/** Optional free-form JSON column (`metadata`, `condition`). Throws on garbage. */
function parseJsonObject(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(OPS_CONFIG_ERRORS.invalidMetadata);
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(OPS_CONFIG_ERRORS.invalidMetadata);
  }
  return parsed as Record<string, unknown>;
}

function parseNumber(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function isOperationCategory(value: string | null): value is OperationCategory {
  return (
    value !== null &&
    (OPERATION_CATEGORIES as readonly string[]).includes(value)
  );
}

function revalidateOpsConfig() {
  revalidatePath(OPS_CONFIG_PATH);
}

// =============================================================================
// READS — these THROW; the route segment's error.tsx renders the failure.
// =============================================================================

export async function getOrganizations(): Promise<OpsOrganization[]> {
  return (
    (await opsGet<OpsOrganization[]>("/api/ops/config/organizations")) ?? []
  );
}

export async function getAssetTypes(
  organizationId: string,
): Promise<OpsAssetType[]> {
  return (
    (await opsGet<OpsAssetType[]>(
      `/api/ops/config/asset-types?organizationId=${encodeURIComponent(organizationId)}`,
    )) ?? []
  );
}

export async function getSpaceTypes(
  organizationId: string,
): Promise<OpsSpaceType[]> {
  return (
    (await opsGet<OpsSpaceType[]>(
      `/api/ops/config/space-types?organizationId=${encodeURIComponent(organizationId)}`,
    )) ?? []
  );
}

export async function getPropertySpaces(
  propertyId: string,
): Promise<OpsPropertySpace[]> {
  return (
    (await opsGet<OpsPropertySpace[]>(
      `/api/ops/config/property-spaces?propertyId=${encodeURIComponent(propertyId)}`,
    )) ?? []
  );
}

export async function getPropertyAssets(
  propertyId: string,
): Promise<OpsPropertyAsset[]> {
  return (
    (await opsGet<OpsPropertyAsset[]>(
      `/api/ops/config/property-assets?propertyId=${encodeURIComponent(propertyId)}`,
    )) ?? []
  );
}

export async function getOperations(
  organizationId: string,
): Promise<OpsOperation[]> {
  return (
    (await opsGet<OpsOperation[]>(
      `/api/ops/config/operations?organizationId=${encodeURIComponent(organizationId)}`,
    )) ?? []
  );
}

export async function getOverrides(propertyId: string): Promise<OpsOverride[]> {
  return (
    (await opsGet<OpsOverride[]>(
      `/api/ops/config/overrides?propertyId=${encodeURIComponent(propertyId)}`,
    )) ?? []
  );
}

/**
 * The property's active standard assignment, or `null` when it has none.
 * `null` is not an error and must be surfaced honestly: a property with no
 * active standard generates NO V1 work at all.
 */
export async function getActiveStandard(
  propertyId: string,
): Promise<OpsStandardAssignment | null> {
  try {
    return (
      (await opsGet<OpsStandardAssignment | null>(
        `/api/ops/config/standards/active?propertyId=${encodeURIComponent(propertyId)}`,
      )) ?? null
    );
  } catch (err) {
    // `/standards/active` is registered after `/standards/{id}`, so the param
    // route wins and the API validates "active" as a uuid. Re-throw with the
    // real cause instead of letting a routing bug read as "no standard".
    if (isRouteShadowingError(err)) {
      throw new Error(OPS_CONFIG_ERRORS.activeStandardUnreadable);
    }
    throw err;
  }
}

/** The signature of the /standards/active ↔ /standards/{id} route collision. */
function isRouteShadowingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Invalid uuid") || message.includes("invalid_string");
}

export async function getWorkflows(
  organizationId: string,
): Promise<OpsWorkflow[]> {
  return (
    (await opsGet<OpsWorkflow[]>(
      `/api/ops/config/workflows?organizationId=${encodeURIComponent(organizationId)}`,
    )) ?? []
  );
}

export async function getWorkflow(id: string): Promise<OpsWorkflowWithSteps> {
  return opsGet<OpsWorkflowWithSteps>(
    `/api/ops/config/workflows/${encodeURIComponent(id)}`,
  );
}

/** Every version of every profile for one operation, newest version first. */
export async function getExecutionProfiles(
  operationId: string,
): Promise<OpsExecutionProfile[]> {
  return (
    (await opsGet<OpsExecutionProfile[]>(
      `/api/ops/config/profiles?operationId=${encodeURIComponent(operationId)}`,
    )) ?? []
  );
}

/**
 * The V0 staff assignments the engine resolves responsibilities from. There is
 * deliberately no ops-side responsibility mapping API (ops-config.ts closes
 * with that note), so this is the single source of truth for "who executes".
 */
export async function getStaffAssignments(
  propertyId: string,
): Promise<OpsStaffAssignment[]> {
  const data = await opsGet<{ assignments: OpsStaffAssignment[] } | null>(
    `/api/field-ops/assignments?propertyId=${encodeURIComponent(propertyId)}`,
  );
  return data?.assignments ?? [];
}

/**
 * The engine's own verdict on one property: who it would resolve for each
 * responsibility, whether it `canGenerate`, and the `blockers` if not. Prefer
 * this over counting staff rows — it applies the identical resolution logic.
 */
export async function getResponsibilityStatus(
  propertyId: string,
): Promise<OpsResponsibilityStatus> {
  return opsGet<OpsResponsibilityStatus>(
    `/api/ops/config/responsibilities/status?propertyId=${encodeURIComponent(propertyId)}`,
  );
}

export async function getResponsibilities(input: {
  propertyId?: string;
  organizationId?: string;
  responsibility?: OpsResponsibility;
  includeInactive?: boolean;
}): Promise<OpsResponsibilityMapping[]> {
  const params = new URLSearchParams();
  if (input.propertyId) params.set("propertyId", input.propertyId);
  if (input.organizationId) params.set("organizationId", input.organizationId);
  if (input.responsibility) params.set("responsibility", input.responsibility);
  // The API parses this as the literal string "true"/"false", not a boolean.
  if (input.includeInactive) params.set("includeInactive", "true");

  return (
    (await opsGet<OpsResponsibilityMapping[]>(
      `/api/ops/config/responsibilities?${params.toString()}`,
    )) ?? []
  );
}

/** Why one operation can (or cannot) generate: profiles + the standards using it. */
export async function getOperationReadiness(
  operationId: string,
): Promise<OpsOperationReadiness> {
  return opsGet<OpsOperationReadiness>(
    `/api/ops/config/operations/${encodeURIComponent(operationId)}/readiness`,
  );
}

export async function getStandards(
  organizationId: string,
): Promise<OpsStandard[]> {
  return (
    (await opsGet<OpsStandard[]>(
      `/api/ops/config/standards?organizationId=${encodeURIComponent(organizationId)}`,
    )) ?? []
  );
}

export async function getStandard(id: string): Promise<OpsStandardWithEntries> {
  return opsGet<OpsStandardWithEntries>(
    `/api/ops/config/standards/${encodeURIComponent(id)}`,
  );
}

export async function getSchedulesForEntry(
  standardProfileMapId: string,
): Promise<OpsSchedule[]> {
  return (
    (await opsGet<OpsSchedule[]>(
      `/api/ops/config/schedules?standardProfileMapId=${encodeURIComponent(standardProfileMapId)}`,
    )) ?? []
  );
}

/**
 * Composed read: the schedules that actually apply to a property.
 *
 * There is no per-property schedule endpoint — schedules hang off standard
 * ENTRIES, so the only route from a property to its schedules is
 * assignment → standard → entries → schedules. The N+1 fan-out is required,
 * not accidental. Returns `[]` when the property has no active standard.
 */
export async function getPropertySchedules(
  propertyId: string,
): Promise<OpsPropertyScheduleGroup[]> {
  const assignment = await getActiveStandard(propertyId);
  if (!assignment) return [];

  const standard = await getStandard(assignment.standardId);
  const entries = standard.entries ?? [];

  return Promise.all(
    entries.map(async (entry) => ({
      entry,
      operationId: entry.operationId,
      schedules: await getSchedulesForEntry(entry.id),
    })),
  );
}

/** The loud-failure queue: properties that could not generate work. */
export async function getGenerationErrors(): Promise<OpsGenerationError[]> {
  return (
    (await opsGet<OpsGenerationError[]>("/api/ops/admin/generation-errors")) ??
    []
  );
}

/**
 * The whole generation chain for one property, in one read.
 *
 *   property → ACTIVE standard assignment → standard ENTRIES (operation →
 *   PUBLISHED execution profile) → SCHEDULES → (engine tick) → instances
 *
 * Every link is reported as present, absent, or UNKNOWN — a link that could not
 * be READ is never reported as absent, because "you have no standard" and "I
 * could not ask whether you have a standard" are different facts and only one
 * of them is fixed by pressing Activate.
 *
 * This THROWS only when the organization-level reads fail (the route segment's
 * error.tsx renders that); per-link failures are captured in the result.
 */
export async function getPropertyChainState(
  organizationId: string,
  propertyId: string,
): Promise<OpsPropertyChainState> {
  const [
    organizations,
    assetTypes,
    spaceTypes,
    operations,
    assets,
    spaces,
    workflows,
    standards,
  ] = await Promise.all([
    getOrganizations(),
    getAssetTypes(organizationId),
    getSpaceTypes(organizationId),
    getOperations(organizationId),
    getPropertyAssets(propertyId),
    getPropertySpaces(propertyId),
    getWorkflows(organizationId),
    getStandards(organizationId),
  ]);

  let assignment: OpsStandardAssignment | null = null;
  let activeStandardError: string | null = null;
  try {
    assignment = await getActiveStandard(propertyId);
  } catch (err) {
    activeStandardError = parseError(
      err,
      OPS_CONFIG_ERRORS.activeStandardUnreadable,
    );
  }

  // The engine's own resolution logic, not a staff-row head-count.
  let responsibilityStatus: OpsResponsibilityStatus | null = null;
  let staffAssignments: OpsStaffAssignment[] = [];
  let staffAssignmentsError: string | null = null;
  try {
    responsibilityStatus = await getResponsibilityStatus(propertyId);
    staffAssignments = responsibilityStatus?.v0Assignments ?? [];
  } catch (err) {
    // Fall back to the raw V0 rows so an older API still yields a real answer.
    try {
      staffAssignments = await getStaffAssignments(propertyId);
    } catch {
      staffAssignmentsError = parseError(
        err,
        "Could not read this property's staff assignments.",
      );
    }
  }
  const executorResolved = responsibilityStatus
    ? Boolean(responsibilityStatus.resolved?.EXECUTOR)
    : staffAssignments.some(
        (row) => row.role === "CARETAKER" && row.isActive !== false,
      );

  // The chain below the assignment only exists if there IS an assignment.
  let chain: OpsChainEntry[] = [];
  let activeStandard: OpsStandard | null = null;
  if (assignment) {
    activeStandard =
      standards.find((standard) => standard.id === assignment.standardId) ??
      null;
    const withEntries = await getStandard(assignment.standardId);
    const operationById = new Map(operations.map((op) => [op.id, op]));
    chain = await Promise.all(
      (withEntries.entries ?? []).map(async (entry) => {
        const [schedules, profiles] = await Promise.all([
          getSchedulesForEntry(entry.id),
          getExecutionProfiles(entry.operationId),
        ]);
        return {
          entry,
          operation: operationById.get(entry.operationId) ?? null,
          profile:
            profiles.find(
              (profile) => profile.id === entry.executionProfileId,
            ) ?? null,
          schedules,
        };
      }),
    );
  }

  const missing: string[] = [];
  if (!organizationId) missing.push(CHAIN_REQUIREMENT_LABELS.organization);
  if (operations.length === 0) missing.push(CHAIN_REQUIREMENT_LABELS.operations);
  if (!activeStandardError && !assignment) {
    missing.push(CHAIN_REQUIREMENT_LABELS.activeStandard);
  }
  if (assignment && chain.length === 0) {
    missing.push(CHAIN_REQUIREMENT_LABELS.standardEntries);
  }
  if (chain.some((link) => link.profile?.status !== "PUBLISHED")) {
    missing.push(CHAIN_REQUIREMENT_LABELS.publishedProfiles);
  }
  if (
    assignment &&
    chain.length > 0 &&
    !chain.some((link) => link.schedules.some((schedule) => schedule.enabled))
  ) {
    missing.push(CHAIN_REQUIREMENT_LABELS.schedules);
  }
  if (!staffAssignmentsError && !executorResolved) {
    missing.push(CHAIN_REQUIREMENT_LABELS.executor);
  }

  return {
    organization:
      organizations.find((org) => org.id === organizationId) ?? null,
    assetTypeCount: assetTypes.length,
    spaceTypeCount: spaceTypes.length,
    operations,
    assets,
    spaces,
    publishedWorkflows: workflows.filter(
      (workflow) => workflow.status === "PUBLISHED",
    ),
    standards,
    assignment,
    activeStandard,
    chain,
    staffAssignments,
    responsibilityStatus,
    executorResolved,
    activeStandardError,
    staffAssignmentsError,
    missing,
    ready:
      missing.length === 0 && !activeStandardError && !staffAssignmentsError,
  };
}

// =============================================================================
// WRITES — these NEVER throw; they return ServerActionResult.
// =============================================================================

/**
 * Idempotent: creates (or finds) the organization plus the three reference
 * workflows and starter catalogs. Re-running with the same slug reuses the
 * existing org.
 */
export async function bootstrapOps(input: {
  organizationName: string;
  organizationSlug: string;
}): Promise<ServerActionResult<OpsOrganization>> {
  try {
    const organizationName = input.organizationName?.trim();
    const organizationSlug = input.organizationSlug?.trim();
    if (!organizationName) return { error: OPS_CONFIG_ERRORS.nameRequired };
    if (!organizationSlug) return { error: OPS_CONFIG_ERRORS.codeRequired };

    const data = await opsPost<{ organization: OpsOrganization }>(
      "/api/ops/config/bootstrap",
      { organizationName, organizationSlug },
    );
    revalidateOpsConfig();
    return {
      success: OPS_CONFIG_SUCCESS.bootstrapped,
      data: data?.organization,
    };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, OPS_CONFIG_ERRORS.bootstrapFailed) };
  }
}

export async function createAssetType(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsAssetType>> {
  try {
    const organizationId = field(formData, "organizationId");
    const code = field(formData, "code");
    const name = field(formData, "name");
    if (!organizationId) return { error: OPS_CONFIG_ERRORS.organizationRequired };
    if (!code) return { error: OPS_CONFIG_ERRORS.codeRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };

    const metadataSchema = parseJsonObject(
      rawValue(formData, "metadataSchema"),
    );

    const data = await opsPost<OpsAssetType>("/api/ops/config/asset-types", {
      organizationId,
      code,
      name,
      ...(metadataSchema ? { metadataSchema } : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.assetTypeCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create asset type.") };
  }
}

export async function createSpaceType(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsSpaceType>> {
  try {
    const organizationId = field(formData, "organizationId");
    const code = field(formData, "code");
    const name = field(formData, "name");
    if (!organizationId) return { error: OPS_CONFIG_ERRORS.organizationRequired };
    if (!code) return { error: OPS_CONFIG_ERRORS.codeRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };

    const data = await opsPost<OpsSpaceType>("/api/ops/config/space-types", {
      organizationId,
      code,
      name,
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.spaceTypeCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create space type.") };
  }
}

/**
 * One row per REAL space. "Bedroom 2 (Ground Floor)" is a row; "4 bedrooms" is
 * four rows. Never a count column.
 */
export async function createPropertySpace(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsPropertySpace>> {
  try {
    const propertyId = field(formData, "propertyId");
    const spaceTypeId = field(formData, "spaceTypeId");
    const label = field(formData, "label");
    const parentSpaceId = field(formData, "parentSpaceId");
    if (!propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!spaceTypeId) return { error: OPS_CONFIG_ERRORS.spaceTypeRequired };
    if (!label) return { error: OPS_CONFIG_ERRORS.labelRequired };

    const metadata = parseJsonObject(rawValue(formData, "metadata"));

    const data = await opsPost<OpsPropertySpace>(
      "/api/ops/config/property-spaces",
      {
        propertyId,
        spaceTypeId,
        label,
        ...(parentSpaceId ? { parentSpaceId } : {}),
        ...(metadata ? { metadata } : {}),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.spaceCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create space.") };
  }
}

export async function updatePropertySpace(
  id: string,
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsPropertySpace>> {
  try {
    if (!id) return { error: "Space id is missing." };

    // PATCH semantics: only send what the caller actually supplied, so a
    // status-only toggle never blanks the label.
    const body: Record<string, unknown> = {};
    if (has(formData, "label")) {
      const label = field(formData, "label");
      if (!label) return { error: OPS_CONFIG_ERRORS.labelRequired };
      body.label = label;
    }
    if (has(formData, "spaceTypeId")) {
      const spaceTypeId = field(formData, "spaceTypeId");
      if (!spaceTypeId) return { error: OPS_CONFIG_ERRORS.spaceTypeRequired };
      body.spaceTypeId = spaceTypeId;
    }
    if (has(formData, "parentSpaceId")) {
      body.parentSpaceId = field(formData, "parentSpaceId");
    }
    if (has(formData, "status")) {
      const status = field(formData, "status");
      if (status === "ACTIVE" || status === "INACTIVE") body.status = status;
    }
    if (has(formData, "metadata")) {
      body.metadata = parseJsonObject(rawValue(formData, "metadata")) ?? null;
    }

    const data = await opsPatch<OpsPropertySpace>(
      `/api/ops/config/property-spaces/${encodeURIComponent(id)}`,
      body,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.spaceUpdated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update space.") };
  }
}

/**
 * One row per REAL asset. Two pools = two rows ("Pool – Main", "Pool – Kids").
 * A property without a cricket pitch simply has no such row.
 */
export async function createPropertyAsset(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsPropertyAsset>> {
  try {
    const propertyId = field(formData, "propertyId");
    const assetTypeId = field(formData, "assetTypeId");
    const label = field(formData, "label");
    const spaceId = field(formData, "spaceId");
    if (!propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!assetTypeId) return { error: OPS_CONFIG_ERRORS.assetTypeRequired };
    if (!label) return { error: OPS_CONFIG_ERRORS.labelRequired };

    const metadata = parseJsonObject(rawValue(formData, "metadata"));

    const data = await opsPost<OpsPropertyAsset>(
      "/api/ops/config/property-assets",
      {
        propertyId,
        assetTypeId,
        label,
        ...(spaceId ? { spaceId } : {}),
        ...(metadata ? { metadata } : {}),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.assetCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create asset.") };
  }
}

export async function updatePropertyAsset(
  id: string,
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsPropertyAsset>> {
  try {
    if (!id) return { error: "Asset id is missing." };

    const body: Record<string, unknown> = {};
    if (has(formData, "label")) {
      const label = field(formData, "label");
      if (!label) return { error: OPS_CONFIG_ERRORS.labelRequired };
      body.label = label;
    }
    if (has(formData, "assetTypeId")) {
      const assetTypeId = field(formData, "assetTypeId");
      if (!assetTypeId) return { error: OPS_CONFIG_ERRORS.assetTypeRequired };
      body.assetTypeId = assetTypeId;
    }
    if (has(formData, "spaceId")) {
      body.spaceId = field(formData, "spaceId");
    }
    if (has(formData, "status")) {
      const status = field(formData, "status");
      if (status === "ACTIVE" || status === "DECOMMISSIONED") {
        body.status = status;
      }
    }
    if (has(formData, "metadata")) {
      body.metadata = parseJsonObject(rawValue(formData, "metadata")) ?? null;
    }

    const data = await opsPatch<OpsPropertyAsset>(
      `/api/ops/config/property-assets/${encodeURIComponent(id)}`,
      body,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.assetUpdated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update asset.") };
  }
}

/** Retire an asset without deleting its history (status → DECOMMISSIONED). */
export async function decommissionAsset(
  id: string,
): Promise<ServerActionResult<OpsPropertyAsset>> {
  try {
    if (!id) return { error: "Asset id is missing." };
    const data = await opsPost<OpsPropertyAsset>(
      `/api/ops/config/property-assets/${encodeURIComponent(id)}/decommission`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.assetDecommissioned, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to decommission asset.") };
  }
}

export async function recommissionAsset(
  id: string,
): Promise<ServerActionResult<OpsPropertyAsset>> {
  try {
    if (!id) return { error: "Asset id is missing." };
    const data = await opsPost<OpsPropertyAsset>(
      `/api/ops/config/property-assets/${encodeURIComponent(id)}/recommission`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.assetRecommissioned, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to recommission asset.") };
  }
}

export async function createOperation(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsOperation>> {
  try {
    const organizationId = field(formData, "organizationId");
    const code = field(formData, "code");
    const name = field(formData, "name");
    const description = field(formData, "description");
    const category = field(formData, "category");
    const requiredAssetTypeId = field(formData, "requiredAssetTypeId");
    const targetSpaceTypeId = field(formData, "targetSpaceTypeId");
    if (!organizationId) return { error: OPS_CONFIG_ERRORS.organizationRequired };
    if (!code) return { error: OPS_CONFIG_ERRORS.codeRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };
    if (!isOperationCategory(category))
      return { error: OPS_CONFIG_ERRORS.categoryRequired };

    const data = await opsPost<OpsOperation>("/api/ops/config/operations", {
      organizationId,
      code,
      name,
      category,
      ...(description ? { description } : {}),
      ...(requiredAssetTypeId ? { requiredAssetTypeId } : {}),
      ...(targetSpaceTypeId ? { targetSpaceTypeId } : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.operationCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create operation.") };
  }
}

/** `code` is immutable by design — it anchors years of reporting. */
export async function updateOperation(
  id: string,
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsOperation>> {
  try {
    if (!id) return { error: "Operation id is missing." };

    const body: Record<string, unknown> = {};
    if (has(formData, "name")) {
      const name = field(formData, "name");
      if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };
      body.name = name;
    }
    if (has(formData, "description")) {
      body.description = field(formData, "description") ?? "";
    }
    if (has(formData, "requiredAssetTypeId")) {
      body.requiredAssetTypeId = field(formData, "requiredAssetTypeId");
    }
    if (has(formData, "targetSpaceTypeId")) {
      body.targetSpaceTypeId = field(formData, "targetSpaceTypeId");
    }
    if (has(formData, "status")) {
      const status = field(formData, "status");
      if (status === "ACTIVE" || status === "DEPRECATED") body.status = status;
    }

    const data = await opsPatch<OpsOperation>(
      `/api/ops/config/operations/${encodeURIComponent(id)}`,
      body,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.operationUpdated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update operation.") };
  }
}

/**
 * Destructive upsert by (property, operation): the backend coerces an omitted
 * `executionProfileId` to null and an omitted `enabled` to true
 * (ops-config-service.ts:542-543), so the COMPLETE triple is always sent.
 * A reason is mandatory (handbook 2.3).
 */
export async function upsertOverride(input: {
  propertyId: string;
  operationId: string;
  executionProfileId: string | null;
  enabled: boolean;
  reason: string;
}): Promise<ServerActionResult<OpsOverride>> {
  try {
    const { propertyId, operationId } = input;
    const reason = input.reason?.trim();
    if (!propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!operationId) return { error: OPS_CONFIG_ERRORS.operationRequired };
    if (!reason) return { error: OPS_CONFIG_ERRORS.reasonRequired };

    const data = await opsPost<OpsOverride>("/api/ops/config/overrides", {
      propertyId,
      operationId,
      executionProfileId: input.executionProfileId ?? null,
      enabled: input.enabled,
      reason,
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.overrideSaved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to save override.") };
  }
}

export async function deleteOverride(
  id: string,
): Promise<ServerActionResult<OpsOverride>> {
  try {
    if (!id) return { error: "Override id is missing." };
    const data = await opsDelete<OpsOverride>(
      `/api/ops/config/overrides/${encodeURIComponent(id)}`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.overrideDeleted, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to delete override.") };
  }
}

export async function createSchedule(
  formData: OpsActionPayload,
): Promise<ServerActionResult<OpsSchedule>> {
  try {
    const standardProfileMapId = field(formData, "standardProfileMapId");
    const triggerType = field(formData, "triggerType");
    const recurrence = field(formData, "recurrence");
    const timeOfDay = field(formData, "timeOfDay");
    const eventType = field(formData, "eventType");
    const activeFrom = field(formData, "activeFrom");
    const activeTo = field(formData, "activeTo");
    if (!standardProfileMapId)
      return { error: OPS_CONFIG_ERRORS.standardProfileMapRequired };
    if (triggerType !== "TIME" && triggerType !== "EVENT")
      return { error: OPS_CONFIG_ERRORS.triggerTypeRequired };
    if (triggerType === "TIME" && (!recurrence || !timeOfDay))
      return { error: OPS_CONFIG_ERRORS.recurrenceRequired };
    if (triggerType === "EVENT" && !eventType)
      return { error: OPS_CONFIG_ERRORS.eventTypeRequired };

    const eventOffsetMinutes = parseNumber(field(formData, "eventOffsetMinutes"));
    const dueOffsetMinutes = parseNumber(field(formData, "dueOffsetMinutes"));
    const leadMinutes = parseNumber(field(formData, "leadMinutes"));
    const condition = parseJsonObject(rawValue(formData, "condition"));

    const data = await opsPost<OpsSchedule>("/api/ops/config/schedules", {
      standardProfileMapId,
      triggerType,
      ...(recurrence ? { recurrence } : {}),
      ...(timeOfDay ? { timeOfDay } : {}),
      ...(eventType ? { eventType } : {}),
      ...(eventOffsetMinutes !== undefined ? { eventOffsetMinutes } : {}),
      ...(dueOffsetMinutes !== undefined ? { dueOffsetMinutes } : {}),
      ...(leadMinutes !== undefined ? { leadMinutes } : {}),
      ...(condition ? { condition } : {}),
      ...(activeFrom ? { activeFrom } : {}),
      ...(activeTo ? { activeTo } : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.scheduleCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create schedule.") };
  }
}

/** `enabled` is the ONLY patchable schedule field — the generation kill-switch. */
export async function setScheduleEnabled(
  id: string,
  enabled: boolean,
): Promise<ServerActionResult<OpsSchedule>> {
  try {
    if (!id) return { error: "Schedule id is missing." };
    const data = await opsPatch<OpsSchedule>(
      `/api/ops/config/schedules/${encodeURIComponent(id)}/enabled`,
      { enabled },
    );
    revalidateOpsConfig();
    return {
      success: enabled
        ? OPS_CONFIG_SUCCESS.scheduleEnabled
        : OPS_CONFIG_SUCCESS.scheduleDisabled,
      data,
    };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update schedule.") };
  }
}

/**
 * Only PUBLISHED standards can be assigned. Closes any currently-active
 * assignment and opens the new one; affects FUTURE instances only.
 */
export async function assignStandard(input: {
  propertyId: string;
  standardId: string;
}): Promise<ServerActionResult<OpsStandardAssignment>> {
  try {
    if (!input.propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!input.standardId) return { error: OPS_CONFIG_ERRORS.standardRequired };

    const data = await opsPost<OpsStandardAssignment>(
      "/api/ops/config/standards/assign",
      { propertyId: input.propertyId, standardId: input.standardId },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardAssigned, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to assign standard.") };
  }
}

/**
 * "Make it show up now": ad-hoc generation through the identical pipeline
 * (snapshots, workflow, dedup) — no side door. `requestId` is the caller
 * idempotency key, minted per invocation.
 */
export async function generateInstanceNow(input: {
  propertyId: string;
  operationCode: string;
  dueAt?: string;
}): Promise<ServerActionResult<unknown>> {
  try {
    const operationCode = input.operationCode?.trim();
    if (!input.propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!operationCode)
      return { error: OPS_CONFIG_ERRORS.operationCodeRequired };

    const data = await opsPost<unknown>("/api/ops/instances", {
      propertyId: input.propertyId,
      operationCode,
      requestId: crypto.randomUUID(),
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.instanceGenerated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to generate instance.") };
  }
}

/**
 * Runs a scheduler tick now. Idempotent. Required locally because
 * OPS_ENGINE_ENABLED is false on the dev API — saving configuration alone
 * never produces work.
 */
export async function tickOpsEngine(): Promise<ServerActionResult<unknown>> {
  try {
    const data = await opsPost<unknown>("/api/ops/engine/tick");
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.engineTicked, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to run the engine tick.") };
  }
}

/**
 * Clears a row from the loud-failure queue. This records that a HUMAN fixed the
 * cause (usually by assigning a caretaker) — it does not retry generation, so
 * pair it with an engine tick.
 */
export async function resolveGenerationError(
  id: string,
): Promise<ServerActionResult<OpsGenerationError>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.generationErrorIdRequired };
    const data = await opsPost<OpsGenerationError>(
      `/api/ops/admin/generation-errors/${encodeURIComponent(id)}/resolve`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.generationErrorResolved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to resolve the generation error.") };
  }
}

// =============================================================================
// WRITES — the authoring chain that was previously unreachable from the panel:
// workflow → execution profile → standard (+entries) → publish → assign.
// =============================================================================

/**
 * Creates a DRAFT workflow with its steps in one call (steps cannot be added
 * later — there is no step API). V1 invariant: EXACTLY one EXECUTOR step,
 * checked here so the caller gets a field error rather than a 409.
 */
export async function createWorkflow(input: {
  organizationId: string;
  name: string;
  description?: string;
  steps: OpsWorkflowStepInput[];
}): Promise<ServerActionResult<OpsWorkflowWithSteps>> {
  try {
    const name = input.name?.trim();
    if (!input.organizationId)
      return { error: OPS_CONFIG_ERRORS.organizationRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };
    const steps = input.steps ?? [];
    if (steps.length === 0) return { error: OPS_CONFIG_ERRORS.stepsRequired };
    if (steps.filter((step) => step.responsibility === "EXECUTOR").length !== 1) {
      return { error: OPS_CONFIG_ERRORS.executorStepRequired };
    }

    const data = await opsPost<OpsWorkflowWithSteps>(
      "/api/ops/config/workflows",
      {
        organizationId: input.organizationId,
        name,
        ...(input.description?.trim()
          ? { description: input.description.trim() }
          : {}),
        // Renumber defensively: `seq` is 1-based and the API rejects 0.
        steps: steps.map((step, index) => ({
          seq: step.seq ?? index + 1,
          responsibility: step.responsibility,
          actionType: step.actionType,
          ...(step.required !== undefined ? { required: step.required } : {}),
          ...(step.onReject ? { onReject: step.onReject } : {}),
          ...(step.maxResubmissions !== undefined
            ? { maxResubmissions: step.maxResubmissions }
            : {}),
        })),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.workflowCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create workflow.") };
  }
}

/** DRAFT → PUBLISHED. Idempotent: the API returns an already-published workflow. */
export async function publishWorkflow(
  id: string,
): Promise<ServerActionResult<OpsWorkflowWithSteps>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.workflowRequired };
    const data = await opsPost<OpsWorkflowWithSteps>(
      `/api/ops/config/workflows/${encodeURIComponent(id)}/publish`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.workflowPublished, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to publish workflow.") };
  }
}

/**
 * Creates a DRAFT execution profile. `perAsset` / `perSpace` are the fan-out
 * flags: with `perAsset` and an operation that requires an asset type, the
 * engine emits ONE INSTANCE PER ASSET ROW — two pools produce two tasks, never
 * one task "for 2 pools".
 */
export async function createExecutionProfile(
  input: OpsExecutionProfileInput,
): Promise<ServerActionResult<OpsExecutionProfile>> {
  try {
    const name = input.name?.trim();
    if (!input.operationId) return { error: OPS_CONFIG_ERRORS.operationRequired };
    if (!input.workflowId) return { error: OPS_CONFIG_ERRORS.workflowRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };

    const data = await opsPost<OpsExecutionProfile>("/api/ops/config/profiles", {
      operationId: input.operationId,
      workflowId: input.workflowId,
      name,
      ...(input.evidenceRequirements
        ? { evidenceRequirements: input.evidenceRequirements }
        : {}),
      ...(input.validationRules
        ? { validationRules: input.validationRules }
        : {}),
      ...(input.aiConfig ? { aiConfig: input.aiConfig } : {}),
      ...(input.sla ? { sla: input.sla } : {}),
      ...(input.reminders ? { reminders: input.reminders } : {}),
      ...(input.escalation ? { escalation: input.escalation } : {}),
      ...(input.reviewPolicy ? { reviewPolicy: input.reviewPolicy } : {}),
      ...(input.perAsset !== undefined ? { perAsset: input.perAsset } : {}),
      ...(input.perSpace !== undefined ? { perSpace: input.perSpace } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.profileCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create execution profile.") };
  }
}

/** DRAFT profiles only — the API 409s on a PUBLISHED one (use newProfileVersion). */
export async function updateExecutionProfile(
  id: string,
  input: Partial<OpsExecutionProfileInput>,
): Promise<ServerActionResult<OpsExecutionProfile>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.profileRequired };
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) body[key] = value;
    }
    const data = await opsPatch<OpsExecutionProfile>(
      `/api/ops/config/profiles/${encodeURIComponent(id)}`,
      body,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.profileUpdated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update execution profile.") };
  }
}

/** The edit path for PUBLISHED config: copy to a DRAFT at version+1. */
export async function newProfileVersion(
  id: string,
): Promise<ServerActionResult<OpsExecutionProfile>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.profileRequired };
    const data = await opsPost<OpsExecutionProfile>(
      `/api/ops/config/profiles/${encodeURIComponent(id)}/new-version`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.profileVersioned, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create a new profile version.") };
  }
}

/** Precondition enforced by the API: the profile's workflow must be PUBLISHED. */
export async function publishExecutionProfile(
  id: string,
): Promise<ServerActionResult<OpsExecutionProfile>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.profileRequired };
    const data = await opsPost<OpsExecutionProfile>(
      `/api/ops/config/profiles/${encodeURIComponent(id)}/publish`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.profilePublished, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to publish execution profile.") };
  }
}

export async function createStandard(input: {
  organizationId: string;
  name: string;
  description?: string;
}): Promise<ServerActionResult<OpsStandard>> {
  try {
    const name = input.name?.trim();
    if (!input.organizationId)
      return { error: OPS_CONFIG_ERRORS.organizationRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };

    const data = await opsPost<OpsStandard>("/api/ops/config/standards", {
      organizationId: input.organizationId,
      name,
      ...(input.description?.trim()
        ? { description: input.description.trim() }
        : {}),
    });
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardCreated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create standard.") };
  }
}

/**
 * The inheritance join: upsert operation → execution profile inside a standard.
 * The profile must belong to the operation (the API 409s otherwise).
 */
export async function setStandardEntry(input: {
  standardId: string;
  operationId: string;
  executionProfileId: string;
  enabled?: boolean;
}): Promise<ServerActionResult<OpsStandardEntry>> {
  try {
    if (!input.standardId) return { error: OPS_CONFIG_ERRORS.standardRequired };
    if (!input.operationId) return { error: OPS_CONFIG_ERRORS.operationRequired };
    if (!input.executionProfileId)
      return { error: OPS_CONFIG_ERRORS.profileRequired };

    const data = await opsPut<OpsStandardEntry>(
      `/api/ops/config/standards/${encodeURIComponent(input.standardId)}/entries`,
      {
        operationId: input.operationId,
        executionProfileId: input.executionProfileId,
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardEntrySaved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to save standard entry.") };
  }
}

/**
 * Make a PUBLISHED standard the organization's default: newly created
 * properties auto-inherit it. Setting a new default demotes the previous one
 * (at most one default per organization).
 */
export async function setDefaultStandard(
  id: string,
): Promise<ServerActionResult<OpsStandardWithEntries>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.standardRequired };
    const data = await opsPost<OpsStandardWithEntries>(
      `/api/ops/config/standards/${encodeURIComponent(id)}/default`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardDefaulted, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to set the default standard.") };
  }
}

/**
 * Clone a standard into a fresh DRAFT copy (enabled entries + their schedules;
 * property assignments are NOT copied). Edit, publish, then assign the clone.
 */
export async function cloneStandard(input: {
  standardId: string;
  name: string;
}): Promise<ServerActionResult<OpsStandardWithEntries>> {
  try {
    const name = input.name?.trim();
    if (!input.standardId) return { error: OPS_CONFIG_ERRORS.standardRequired };
    if (!name) return { error: OPS_CONFIG_ERRORS.nameRequired };
    const data = await opsPost<OpsStandardWithEntries>(
      `/api/ops/config/standards/${encodeURIComponent(input.standardId)}/clone`,
      { name },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardCloned, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to clone standard.") };
  }
}

/** Preconditions: at least one entry, and every referenced profile PUBLISHED. */
export async function publishStandard(
  id: string,
): Promise<ServerActionResult<OpsStandardWithEntries>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.standardRequired };
    const data = await opsPost<OpsStandardWithEntries>(
      `/api/ops/config/standards/${encodeURIComponent(id)}/publish`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.standardPublished, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to publish standard.") };
  }
}

// =============================================================================
// RESPONSIBILITIES — who the engine gives the work to.
// These write THROUGH to `staffPropertyAssignments`, which is what the engine
// reads; without an EXECUTOR the engine files NO_EXECUTOR_RESOLVABLE instead of
// creating tasks, so this is the last link of the chain.
// =============================================================================

/**
 * Upsert by (property, responsibility, user) — re-posting reactivates rather
 * than duplicating, so this is safe to re-run.
 *
 * `userId` is a **users.id for EXECUTOR** and a **supervisors.id for every
 * other responsibility**. Sending the wrong table's id is rejected by the API.
 */
export async function setResponsibility(input: {
  propertyId: string;
  responsibility: OpsResponsibility;
  userId: string;
  priority?: number;
  active?: boolean;
}): Promise<ServerActionResult<OpsResponsibilityMapping>> {
  try {
    if (!input.propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!input.responsibility)
      return { error: OPS_CONFIG_ERRORS.responsibilityRequired };
    if (!input.userId) return { error: OPS_CONFIG_ERRORS.assigneeRequired };

    const data = await opsPost<OpsResponsibilityMapping>(
      "/api/ops/config/responsibilities",
      {
        propertyId: input.propertyId,
        responsibility: input.responsibility,
        userId: input.userId,
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.responsibilitySaved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to assign the responsibility.") };
  }
}

/** `active: false` also stands down the V0 assignment when nothing else needs it. */
export async function updateResponsibility(
  id: string,
  input: { priority?: number; active?: boolean },
): Promise<ServerActionResult<OpsResponsibilityMapping>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.responsibilityRequired };
    const body: Record<string, unknown> = {};
    if (input.priority !== undefined) body.priority = input.priority;
    if (input.active !== undefined) body.active = input.active;

    const data = await opsPatch<OpsResponsibilityMapping>(
      `/api/ops/config/responsibilities/${encodeURIComponent(id)}`,
      body,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.responsibilityUpdated, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update the responsibility.") };
  }
}

/** Removes the mapping outright — PATCH `active:false` keeps the history. */
export async function deleteResponsibility(
  id: string,
): Promise<ServerActionResult<OpsResponsibilityMapping>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.responsibilityRequired };
    const data = await opsDelete<OpsResponsibilityMapping>(
      `/api/ops/config/responsibilities/${encodeURIComponent(id)}`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.responsibilityDeleted, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to delete the responsibility.") };
  }
}

// ── Responsibility OVERRIDES ──────────────────────────────────────────────────
// DISTINCT from the write-through responsibilities above. These endpoints write
// ONLY the opsResponsibilityMappings row (no staffPropertyAssignments) and are
// the explicit per-responsibility override the engine reads FIRST — so REVIEWER
// and APPROVER can be DIFFERENT people at one property.

/** Active overrides at a property, in the engine's resolution order. */
export async function getResponsibilityOverrides(
  propertyId: string,
): Promise<OpsResponsibilityOverride[]> {
  return (
    (await opsGet<OpsResponsibilityOverride[]>(
      `/api/ops/config/responsibility-overrides?propertyId=${encodeURIComponent(propertyId)}`,
    )) ?? []
  );
}

/** People assignable as an override at a property (named, with V0 role). */
export async function getResponsibilityCandidates(
  propertyId: string,
): Promise<OpsResponsibilityCandidate[]> {
  return (
    (await opsGet<OpsResponsibilityCandidate[]>(
      `/api/ops/config/responsibility-candidates?propertyId=${encodeURIComponent(propertyId)}`,
    )) ?? []
  );
}

/**
 * Pin a DISTINCT person to a responsibility at a property. Idempotent upsert by
 * (property, responsibility, user). `userId` must be a users.id for EXECUTOR and
 * a supervisors.id otherwise — it is stored as-is and NOT cross-validated.
 */
export async function setResponsibilityOverride(input: {
  propertyId: string;
  responsibility: OpsResponsibility;
  userId: string;
  priority?: number;
}): Promise<ServerActionResult<OpsResponsibilityOverride>> {
  try {
    if (!input.propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
    if (!input.responsibility)
      return { error: OPS_CONFIG_ERRORS.responsibilityRequired };
    if (!input.userId) return { error: OPS_CONFIG_ERRORS.assigneeRequired };

    const data = await opsPost<OpsResponsibilityOverride>(
      "/api/ops/config/responsibility-overrides",
      {
        propertyId: input.propertyId,
        responsibility: input.responsibility,
        userId: input.userId,
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.responsibilityOverrideSaved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to save the responsibility override.") };
  }
}

/** Soft-remove an override (active:false) — the property falls back to the V0 default. */
export async function removeResponsibilityOverride(
  id: string,
): Promise<ServerActionResult<{ id: string }>> {
  try {
    if (!id) return { error: OPS_CONFIG_ERRORS.responsibilityRequired };
    const data = await opsDelete<{ id: string }>(
      `/api/ops/config/responsibility-overrides/${encodeURIComponent(id)}`,
    );
    revalidateOpsConfig();
    return { success: OPS_CONFIG_SUCCESS.responsibilityOverrideRemoved, data };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to remove the responsibility override.") };
  }
}

// =============================================================================
// ONE-CLICK ACTIVATION
// =============================================================================

export interface ActivateOperationsScheduleInput {
  triggerType: OpsTriggerType;
  recurrence?: string;
  timeOfDay?: string;
  eventType?: string;
  eventOffsetMinutes?: number;
  dueOffsetMinutes?: number;
  leadMinutes?: number;
}

export interface ActivateOperationsInput {
  organizationId: string;
  propertyId: string;
  /** The operations to switch on at this property. */
  operationIds: string[];
  /** Defaults to the bootstrap workflow "W1 Execute Only". */
  workflowName?: string;
  /** Defaults to "Default Operations Standard". */
  standardName?: string;
  /** Defaults to a DAILY 09:00 TIME schedule on every entry. */
  schedule?: ActivateOperationsScheduleInput;
  /** Defaults to true — configuration alone never produces work. */
  runTick?: boolean;
}

/**
 * The API takes `timeOfDay` as "HH:MM" but stores a postgres `time` and reads
 * it back as "HH:MM:SS" — comparing the raw strings would never match and would
 * duplicate a schedule on every re-run.
 */
function sameTimeOfDay(a: string | null, b: string | undefined): boolean {
  return (a ?? "").slice(0, 5) === (b ?? "").slice(0, 5);
}

/** Does this existing schedule already express the requested rule? */
function scheduleMatches(
  schedule: OpsSchedule,
  wanted: ActivateOperationsScheduleInput,
): boolean {
  if (schedule.triggerType !== wanted.triggerType) return false;
  if (wanted.triggerType === "TIME") {
    return (
      schedule.recurrence === wanted.recurrence &&
      sameTimeOfDay(schedule.timeOfDay, wanted.timeOfDay)
    );
  }
  return (
    schedule.eventType === wanted.eventType &&
    schedule.eventOffsetMinutes === (wanted.eventOffsetMinutes ?? 0)
  );
}

/**
 * Take a property from ZERO to GENERATING WORK in one call.
 *
 * The engine only creates an instance when the ENTIRE chain exists:
 *
 *   organization + catalogs
 *     → PUBLISHED workflow
 *       → PUBLISHED execution profile per operation
 *         → standard whose ENTRIES map operation → profile
 *           → standard PUBLISHED and ASSIGNED to the property
 *             → SCHEDULE on each entry
 *               → engine tick
 *
 * An admin should not have to know that. This walks the whole chain, creating
 * only what is missing.
 *
 * IDEMPOTENT by construction: every object is looked up by its natural key
 * (workflow/standard by name, profile by `${code} — Default Profile`, schedule
 * by its rule) before anything is created, and each publish/assign endpoint is
 * itself a no-op when already in the target state. Re-running after a partial
 * failure resumes rather than duplicates.
 *
 * Returns the step-by-step report EVEN ON FAILURE (`data` is always populated),
 * so the UI can show exactly how far the chain got and which link broke.
 */
export async function activateOperationsForProperty(
  input: ActivateOperationsInput,
): Promise<ServerActionResult<ActivationReport>> {
  const report: ActivationReport = {
    steps: [],
    organizationId: null,
    workflowId: null,
    standardId: null,
    assignmentId: null,
    profileIdByOperationId: {},
    scheduleIds: [],
    failedAt: null,
  };
  const push = (
    key: ActivationStepKey,
    status: ActivationStepStatus,
    detail: string,
  ) => {
    report.steps.push({ key, status, detail });
  };
  const fail = (
    key: ActivationStepKey,
    err: unknown,
    fallback: string,
  ): ServerActionResult<ActivationReport> => {
    const message = parseError(err, fallback);
    push(key, "FAILED", message);
    report.failedAt = key;
    captureError(err);
    revalidateOpsConfig();
    return { error: message, data: report };
  };

  try {
    await authorize();
  } catch (err) {
    return { error: parseError(err, OPS_CONFIG_ERRORS.unauthorized) };
  }

  if (!input.propertyId) return { error: OPS_CONFIG_ERRORS.propertyRequired };
  if (!input.organizationId)
    return { error: OPS_CONFIG_ERRORS.organizationRequired };

  const operationIds = Array.from(
    new Set((input.operationIds ?? []).filter(Boolean)),
  );
  if (operationIds.length === 0)
    return { error: OPS_CONFIG_ERRORS.operationsRequired };

  const workflowName =
    input.workflowName?.trim() || ACTIVATION_DEFAULTS.workflowName;
  const standardName =
    input.standardName?.trim() || ACTIVATION_DEFAULTS.standardName;
  const wantedSchedule: ActivateOperationsScheduleInput = input.schedule ?? {
    triggerType: "TIME",
    recurrence: ACTIVATION_DEFAULTS.recurrence,
    timeOfDay: ACTIVATION_DEFAULTS.timeOfDay,
  };
  if (wantedSchedule.triggerType === "TIME") {
    if (!wantedSchedule.recurrence || !wantedSchedule.timeOfDay) {
      return { error: OPS_CONFIG_ERRORS.recurrenceRequired };
    }
  } else if (!wantedSchedule.eventType) {
    return { error: OPS_CONFIG_ERRORS.eventTypeRequired };
  }

  // ── 1. Organization ────────────────────────────────────────────────────────
  let organization: OpsOrganization;
  try {
    const organizations = await getOrganizations();
    const found = organizations.find((org) => org.id === input.organizationId);
    if (!found) throw new Error("Organization not found");
    organization = found;
    report.organizationId = organization.id;
    push("organization", "REUSED", `${organization.name} (${organization.slug})`);
  } catch (err) {
    return fail("organization", err, "Failed to resolve the ops organization.");
  }

  // ── 2. Catalogs + reference workflows (bootstrap only when something is missing) ──
  let workflows: OpsWorkflow[];
  try {
    let [assetTypes, spaceTypes] = await Promise.all([
      getAssetTypes(organization.id),
      getSpaceTypes(organization.id),
    ]);
    workflows = await getWorkflows(organization.id);

    const needsBootstrap =
      assetTypes.length === 0 ||
      spaceTypes.length === 0 ||
      !workflows.some((workflow) => workflow.name === workflowName);

    if (needsBootstrap) {
      // Bootstrap keys off the SLUG, so this finds this very organization.
      await opsPost<unknown>("/api/ops/config/bootstrap", {
        organizationName: organization.name,
        organizationSlug: organization.slug,
      });
      [assetTypes, spaceTypes, workflows] = await Promise.all([
        getAssetTypes(organization.id),
        getSpaceTypes(organization.id),
        getWorkflows(organization.id),
      ]);
      push(
        "catalogs",
        "CREATED",
        `Bootstrapped — ${assetTypes.length} asset types, ${spaceTypes.length} space types, ${workflows.length} workflows.`,
      );
    } else {
      push(
        "catalogs",
        "REUSED",
        `${assetTypes.length} asset types, ${spaceTypes.length} space types already present.`,
      );
    }
  } catch (err) {
    return fail("catalogs", err, "Failed to ensure the ops catalogs.");
  }

  // ── 3. A PUBLISHED workflow ────────────────────────────────────────────────
  try {
    let workflow = workflows.find((row) => row.name === workflowName) ?? null;
    let created = false;
    if (!workflow) {
      workflow = await opsPost<OpsWorkflowWithSteps>(
        "/api/ops/config/workflows",
        {
          organizationId: organization.id,
          name: workflowName,
          description:
            "Created by one-click activation: a single EXECUTOR step.",
          steps: [{ seq: 1, responsibility: "EXECUTOR", actionType: "EXECUTE" }],
        },
      );
      created = true;
    }
    if (workflow.status !== "PUBLISHED") {
      workflow = await opsPost<OpsWorkflowWithSteps>(
        `/api/ops/config/workflows/${encodeURIComponent(workflow.id)}/publish`,
      );
    }
    report.workflowId = workflow.id;
    push(
      "workflow",
      created ? "CREATED" : "REUSED",
      `"${workflow.name}" is ${workflow.status}.`,
    );
  } catch (err) {
    return fail("workflow", err, "Failed to ensure a published workflow.");
  }

  // ── 4. A PUBLISHED execution profile per selected operation ────────────────
  let selectedOperations: OpsOperation[];
  try {
    const operations = await getOperations(organization.id);
    selectedOperations = operationIds.map((id) => {
      const operation = operations.find((row) => row.id === id);
      if (!operation) throw new Error(`Operation ${id} not found`);
      return operation;
    });

    const notes: string[] = [];
    for (const operation of selectedOperations) {
      const wantedName = `${operation.code} — ${ACTIVATION_DEFAULTS.profileNameSuffix}`;
      const existing = await getExecutionProfiles(operation.id);
      // Newest version first, so this picks the live one when several exist.
      let profile =
        existing.find(
          (row) => row.name === wantedName && row.status === "PUBLISHED",
        ) ?? null;

      if (profile) {
        notes.push(`${operation.code}: reused v${profile.version}`);
      } else {
        const draft =
          existing.find(
            (row) => row.name === wantedName && row.status === "DRAFT",
          ) ?? null;
        profile =
          draft ??
          (await opsPost<OpsExecutionProfile>("/api/ops/config/profiles", {
            operationId: operation.id,
            workflowId: report.workflowId,
            name: wantedName,
            // Fan-out mirrors the engine's own rule: an asset-gated operation
            // runs ONCE PER ASSET ROW (two pools ⇒ two instances), otherwise a
            // space-gated one runs once per space, otherwise once per property.
            perAsset: Boolean(operation.requiredAssetTypeId),
            perSpace:
              !operation.requiredAssetTypeId &&
              Boolean(operation.targetSpaceTypeId),
            // Without this the profile requires ZERO evidence and a caretaker
            // can close the task with no photo. It is stamped at CREATE only —
            // a reused draft/published profile is left exactly as authored,
            // which keeps re-running activation idempotent.
            evidenceRequirements: ACTIVATION_DEFAULTS.evidenceRequirements,
          }));
        profile = await opsPost<OpsExecutionProfile>(
          `/api/ops/config/profiles/${encodeURIComponent(profile.id)}/publish`,
        );
        notes.push(
          `${operation.code}: ${draft ? "published existing draft" : "created + published"} v${profile.version}`,
        );
      }
      report.profileIdByOperationId[operation.id] = profile.id;
    }
    push("profiles", "OK", notes.join("; "));
  } catch (err) {
    return fail("profiles", err, "Failed to ensure published execution profiles.");
  }

  // ── 5. The standard ────────────────────────────────────────────────────────
  let standard: OpsStandard;
  try {
    const standards = await getStandards(organization.id);
    const existing = standards.find((row) => row.name === standardName) ?? null;
    standard =
      existing ??
      (await opsPost<OpsStandard>("/api/ops/config/standards", {
        organizationId: organization.id,
        name: standardName,
        description: ACTIVATION_DEFAULTS.standardDescription,
      }));
    report.standardId = standard.id;
    push(
      "standard",
      existing ? "REUSED" : "CREATED",
      `"${standard.name}" (${standard.status}).`,
    );
  } catch (err) {
    return fail("standard", err, "Failed to ensure the standard.");
  }

  // ── 6. Entries: operation → profile (upsert, so re-running is a no-op) ─────
  let entries: OpsStandardEntry[];
  try {
    entries = [];
    for (const operation of selectedOperations) {
      entries.push(
        await opsPut<OpsStandardEntry>(
          `/api/ops/config/standards/${encodeURIComponent(standard.id)}/entries`,
          {
            operationId: operation.id,
            executionProfileId: report.profileIdByOperationId[operation.id],
            enabled: true,
          },
        ),
      );
    }
    push(
      "entries",
      "OK",
      `${entries.length} entr${entries.length === 1 ? "y" : "ies"} mapped.`,
    );
  } catch (err) {
    return fail("entries", err, "Failed to write the standard entries.");
  }

  // ── 7. Publish the standard (no-op when already PUBLISHED) ────────────────
  try {
    if (standard.status !== "PUBLISHED") {
      const published = await opsPost<OpsStandardWithEntries>(
        `/api/ops/config/standards/${encodeURIComponent(standard.id)}/publish`,
      );
      push("publish", "CREATED", `"${published.name}" is now ${published.status}.`);
    } else {
      push("publish", "REUSED", `"${standard.name}" was already PUBLISHED.`);
    }
  } catch (err) {
    return fail("publish", err, "Failed to publish the standard.");
  }

  // ── 8. Assign it to THIS property ─────────────────────────────────────────
  try {
    let alreadyAssigned = false;
    try {
      const current = await getActiveStandard(input.propertyId);
      alreadyAssigned = current?.standardId === standard.id;
      if (alreadyAssigned) report.assignmentId = current?.id ?? null;
    } catch {
      // The active-standard read is unavailable (route shadowing). Assigning is
      // safe regardless: it closes any open assignment and opens this one.
      alreadyAssigned = false;
    }

    if (!alreadyAssigned) {
      const assignment = await opsPost<OpsStandardAssignment>(
        "/api/ops/config/standards/assign",
        { propertyId: input.propertyId, standardId: standard.id },
      );
      report.assignmentId = assignment?.id ?? null;
      push(
        "assign",
        "CREATED",
        `Assigned "${standard.name}" — FUTURE instances only.`,
      );
    } else {
      push("assign", "REUSED", `"${standard.name}" was already active here.`);
    }
  } catch (err) {
    return fail("assign", err, "Failed to assign the standard to the property.");
  }

  // ── 9. A schedule on every entry ──────────────────────────────────────────
  try {
    let createdCount = 0;
    let reusedCount = 0;
    for (const entry of entries) {
      const existing = await getSchedulesForEntry(entry.id);
      const match = existing.find((row) => scheduleMatches(row, wantedSchedule));
      if (match) {
        // A matching-but-disabled schedule is still "missing" in practice.
        if (!match.enabled) {
          await opsPatch<OpsSchedule>(
            `/api/ops/config/schedules/${encodeURIComponent(match.id)}/enabled`,
            { enabled: true },
          );
        }
        report.scheduleIds.push(match.id);
        reusedCount += 1;
        continue;
      }
      const schedule = await opsPost<OpsSchedule>("/api/ops/config/schedules", {
        standardProfileMapId: entry.id,
        triggerType: wantedSchedule.triggerType,
        ...(wantedSchedule.triggerType === "TIME"
          ? {
              recurrence: wantedSchedule.recurrence,
              timeOfDay: wantedSchedule.timeOfDay,
            }
          : {
              eventType: wantedSchedule.eventType,
              eventOffsetMinutes: wantedSchedule.eventOffsetMinutes ?? 0,
            }),
        dueOffsetMinutes:
          wantedSchedule.dueOffsetMinutes ?? ACTIVATION_DEFAULTS.dueOffsetMinutes,
        leadMinutes:
          wantedSchedule.leadMinutes ?? ACTIVATION_DEFAULTS.leadMinutes,
      });
      report.scheduleIds.push(schedule.id);
      createdCount += 1;
    }
    push(
      "schedules",
      createdCount > 0 ? "CREATED" : "REUSED",
      `${createdCount} created, ${reusedCount} already present.`,
    );
  } catch (err) {
    return fail("schedules", err, "Failed to create the schedules.");
  }

  // ── 10. Executor check — a WARNING, never a failure ───────────────────────
  // Configuration is complete without it, but the engine files
  // NO_EXECUTOR_RESOLVABLE instead of creating work, so say so out loud.
  try {
    let executorId: string | null = null;
    let blockers: string[] = [];
    try {
      // The engine's own resolution, not a head-count of staff rows.
      const status = await getResponsibilityStatus(input.propertyId);
      executorId = status.resolved?.EXECUTOR ?? null;
      blockers = status.blockers ?? [];
    } catch {
      const staff = await getStaffAssignments(input.propertyId);
      executorId =
        staff.find((row) => row.role === "CARETAKER" && row.isActive !== false)
          ?.staffId ?? null;
    }

    if (!executorId) {
      push(
        "executor",
        "WARNING",
        "No EXECUTOR resolvable — the engine has nobody to give the work to and will file NO_EXECUTOR_RESOLVABLE instead of generating. Assign a caretaker (Responsibilities / Staff Assignments); activation cannot invent one.",
      );
    } else {
      push(
        "executor",
        blockers.length > 0 ? "WARNING" : "OK",
        blockers.length > 0
          ? `Executor resolves, but the engine still reports: ${blockers.join(", ")}.`
          : "The engine resolves an EXECUTOR for this property.",
      );
    }
  } catch (err) {
    push(
      "executor",
      "WARNING",
      parseError(err, "Could not check staff assignments for this property."),
    );
  }

  // ── 11. Tick — saving configuration alone never creates work ──────────────
  if (input.runTick === false) {
    push("tick", "SKIPPED", "Not requested — no work generated yet.");
  } else {
    try {
      const stats = await opsPost<Record<string, unknown>>(
        "/api/ops/engine/tick",
      );
      push(
        "tick",
        "OK",
        stats && typeof stats === "object"
          ? `Engine tick: ${JSON.stringify(stats)}`
          : "Engine tick complete.",
      );
    } catch (err) {
      // The chain IS built at this point; only the immediate tick failed.
      push("tick", "WARNING", parseError(err, "Engine tick failed."));
    }
  }

  revalidateOpsConfig();
  return { success: OPS_CONFIG_SUCCESS.activated, data: report };
}
