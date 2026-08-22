/**
 * Constants for the per-property Operations Configuration panel
 * (`/admin/ops-config`). Pure data — no JSX, no logic, no imports.
 *
 * The panel is a thin authoring surface over the existing
 * `/api/ops/config/*` API (see apps/if-api/src/routes/ops-config.ts).
 */

// ── Navigation ───────────────────────────────────────────────────────────────

export const OPS_CONFIG_BREADCRUMBS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "#", label: "Ops Configuration" },
] as const;

export const OPS_CONFIG_TITLES = {
  list: "Ops Configuration",
  description:
    "Per-property physical model, operation catalog, standards and schedules for the Operations Engine.",
} as const;

/** Tab ids are used as the `?tab=` search param on /admin/ops-config. */
export const OPS_CONFIG_TABS = [
  { id: "activate", label: "Activate" },
  { id: "spaces", label: "Spaces" },
  { id: "assets", label: "Assets" },
  { id: "catalog", label: "Catalog" },
  { id: "operations", label: "Operations" },
  { id: "standards", label: "Standards" },
  { id: "overrides", label: "Overrides" },
  { id: "responsibilities", label: "Responsibilities" },
  { id: "schedules", label: "Schedules" },
  { id: "errors", label: "Generation Errors" },
] as const;

export type OpsConfigTabId = (typeof OPS_CONFIG_TABS)[number]["id"];

/**
 * Activation is the landing tab on purpose: a property that generates no work
 * is the normal starting state, and this is the tab that says so and fixes it.
 */
export const DEFAULT_OPS_CONFIG_TAB: OpsConfigTabId = "activate";

// ── Vocabularies (mirror the DB enums in packages/db/src/schema/ops.ts) ───────

export const OPERATION_CATEGORIES = [
  "HOUSEKEEPING",
  "AUDIT",
  "CHECK_IN",
  "CHECK_OUT",
  "MAINTENANCE",
  "COMPLIANCE",
  "DOCUMENTATION",
  "FINANCIAL",
  "REVIEW",
] as const;

export type OperationCategory = (typeof OPERATION_CATEGORIES)[number];

export const OPERATION_STATUSES = ["ACTIVE", "DEPRECATED"] as const;

export const SPACE_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const ASSET_STATUSES = ["ACTIVE", "DECOMMISSIONED"] as const;

export const CONFIG_STATUSES = ["DRAFT", "PUBLISHED", "RETIRED"] as const;

export const SCHEDULE_TRIGGER_TYPES = ["TIME", "EVENT"] as const;

/** Business events the engine can generate from (ops-runtime `businessEventBodySchema`). */
export const SCHEDULE_EVENT_TYPES = [
  "booking.confirmed",
  "booking.checked_in",
  "booking.checked_out",
  "booking.cancelled",
] as const;

/**
 * Evidence artifact kinds (mirrors `opsArtifactKindEnum`,
 * packages/db/src/schema/ops.ts). The API stores `evidenceRequirements` as an
 * unvalidated jsonb blob (`z.record(z.unknown())`), so a typo here is written
 * verbatim and silently never matches at submit time — this list is the only
 * thing keeping the authored kinds legal.
 */
export const OPS_ARTIFACT_KINDS = [
  "PHOTO",
  "VIDEO",
  "DOCUMENT",
  "SIGNATURE",
  "NUMERIC_READING",
  "NOTE",
] as const;

export type OpsArtifactKind = (typeof OPS_ARTIFACT_KINDS)[number];

export const OPS_ARTIFACT_KIND_LABELS: Record<OpsArtifactKind, string> = {
  PHOTO: "Photos",
  VIDEO: "Videos",
  DOCUMENT: "Documents",
  SIGNATURE: "Signatures",
  NUMERIC_READING: "Numeric readings",
  NOTE: "Notes",
};

// ── Authoring hints ──────────────────────────────────────────────────────────

/** What the runtime actually does with each block, stated honestly. */
export const EVIDENCE_HINTS = {
  minCount:
    "Minimum artifacts of each kind the caretaker must attach. 0 = not required. Enforced at submit — a short submission is rejected with 409.",
  gpsRequired:
    "Rejects a submission whose artifacts of the ticked kinds have no coordinates. Tick nothing and it falls back to photos only.",
  gpsKinds:
    "Only device-captured kinds carry coordinates — a hand-typed reading or note never will, so requiring GPS from them would reject every honest submission.",
  /**
   * Enforced as PROVENANCE, not freshness (ops-runtime-service.validateEvidence):
   * capture time + GPS together are the metadata only the app's live camera
   * path produces. capturedAt is never compared against now, because offline
   * submissions replay hours later and a freshness window would reject them.
   */
  liveCaptureOnly:
    "Rejects any photo, video, document or signature that arrives without the capture time and GPS the live camera records — that pair is what a gallery import cannot fake. Capture time is never checked for age, so offline submissions still replay fine.",
} as const;

/**
 * Kinds a device captures, so the only ones that can carry coordinates or a
 * capture time. Mirrors CAPTURED_ARTIFACT_KINDS in ops-runtime-service.ts —
 * the two lists must agree or the panel offers a setting the runtime ignores.
 */
export const OPS_CAPTURED_ARTIFACT_KINDS = [
  "PHOTO",
  "VIDEO",
  "DOCUMENT",
  "SIGNATURE",
] as const;

/** What the engine uses when `gpsKinds` is absent or empty. */
export const DEFAULT_GPS_KINDS = ["PHOTO"] as const;

/**
 * Kinds the CARETAKER APP can actually produce: its capture screens cover
 * photos, documents, meter readings and notes (mago-caretaker
 * app/task/[id]/capture.tsx — there is no video or signature variant).
 * Requiring anything else creates work no one in the field can submit — the
 * caretaker captures what they can and the engine 409s the submission.
 */
export const APP_CAPTURABLE_ARTIFACT_KINDS = [
  "PHOTO",
  "DOCUMENT",
  "NUMERIC_READING",
  "NOTE",
] as const;

export const EVIDENCE_UNCAPTURABLE_WARNING =
  "The caretaker app has no capture screen for this — a task requiring it cannot be submitted from the field." as const;

/** One-line summary shown when a profile requires nothing at all. */
export const EVIDENCE_NONE_LABEL = "none — any submission passes" as const;

/** The engine parses this grammar itself — there is no rrule library. */
export const RECURRENCE_HINT =
  "'DAILY' | 'WEEKLY:MON,THU' | 'MONTHLY:1,15'" as const;

export const TIME_OF_DAY_HINT = "HH:MM, property-local (V1: Asia/Kolkata)" as const;

export const METADATA_HINT =
  "Optional JSON object (serials, capacities, expiry dates). Leave blank for none." as const;

/** Bootstrap is idempotent — this slug reuses the existing Mago ops organization. */
export const DEFAULT_ORG_SLUG = "mago-dev" as const;

export const DEFAULT_ORG_NAME = "Mago Operations" as const;

// ── One-click activation ─────────────────────────────────────────────────────

/**
 * The names the activation flow reuses. They are the flow's IDEMPOTENCY KEYS:
 * re-running looks each object up by these natural keys instead of creating a
 * second copy. Changing a value here starts a new lineage — it does not rename
 * anything that already exists.
 */
export const ACTIVATION_DEFAULTS = {
  /** Seeded (and published) by POST /bootstrap; single EXECUTOR step. */
  workflowName: "W1 Execute Only",
  standardName: "Default Operations Standard",
  standardDescription:
    "Created by the Ops Configuration panel's one-click activation. Holds one entry per activated operation.",
  /** `${operation.code} — ${this}` is the per-operation profile name. */
  profileNameSuffix: "Default Profile",
  recurrence: "DAILY",
  timeOfDay: "09:00",
  /** Minutes after the occurrence that the instance is due. */
  dueOffsetMinutes: 240,
  /** Minutes before the occurrence that the instance is created. */
  leadMinutes: 120,
  /**
   * Activation used to create profiles with `evidenceRequirements: {}`, which
   * means a caretaker could submit with NO photo at all. One photo is the
   * floor for every operation we run, so activation now stamps it. Existing
   * PUBLISHED profiles are immutable and are still reused untouched — this
   * only applies to profiles activation itself creates.
   */
  evidenceRequirements: {
    requiredKinds: [{ kind: "PHOTO", minCount: 1 }],
  },
} as const;

/** Step keys reported by `activateOperationsForProperty`, in execution order. */
export const ACTIVATION_STEP_ORDER = [
  "organization",
  "catalogs",
  "workflow",
  "profiles",
  "standard",
  "entries",
  "publish",
  "assign",
  "schedules",
  "executor",
  "tick",
] as const;

export type ActivationStepKey = (typeof ACTIVATION_STEP_ORDER)[number];

export const ACTIVATION_STEP_LABELS: Record<ActivationStepKey, string> = {
  organization: "Operations organization",
  catalogs: "Asset & space catalogs",
  workflow: "Published workflow",
  profiles: "Published execution profile per operation",
  standard: "Operations standard",
  entries: "Standard entries (operation → profile)",
  publish: "Publish the standard",
  assign: "Assign the standard to this property",
  schedules: "Generation schedules",
  executor: "Executor resolvable (staff assignment)",
  tick: "Engine tick",
};

/** What each link of the chain means when it is MISSING. */
export const CHAIN_REQUIREMENT_LABELS = {
  organization: "an operations organization",
  operations: "at least one operation to run",
  activeStandard: "an active standard assigned to this property",
  standardEntries: "at least one operation → profile entry on that standard",
  publishedProfiles: "every mapped execution profile PUBLISHED",
  schedules: "at least one enabled schedule on an entry",
  executor: "an active CARETAKER staff assignment (the engine's executor)",
} as const;

// ── Empty states ─────────────────────────────────────────────────────────────

export const OPS_CONFIG_EMPTY = {
  organizations:
    "No operations organization exists yet. Run bootstrap to create one with the reference workflows and starter catalogs.",
  property: "Select a property to configure its operations.",
  spaces:
    "No spaces configured for this property. Add one row per real space — 'Bedroom 2 (Ground Floor)', not a count.",
  assets:
    "No assets configured for this property. Add one row per real asset — two pools means two rows ('Pool – Main', 'Pool – Kids').",
  assetTypes:
    "No asset types in the catalog. Asset types are configuration, not a migration — add one.",
  spaceTypes: "No space types in the catalog. Add one.",
  operations:
    "No operations defined for this organization. An operation is a unit of business activity (POOL_CLEANING, METER_READING).",
  overrides:
    "No overrides for this property. Overrides are exceptional by policy — the standard should cover the normal case.",
  responsibilityOverrides:
    "No responsibility overrides for this property. Without one, each responsibility falls back to the property's default staff (caretaker executes, primary supervisor reviews/approves). Add an override to make REVIEWER and APPROVER different people.",
  standards: "No standards defined for this organization.",
  activeStandard:
    "This property has NO active standard assignment, so the engine generates NO work for it. Assign a published standard to start generation.",
  schedules:
    "No schedules on this standard entry. Without a schedule nothing is generated on a timer.",
  generationErrors: "No unresolved generation errors.",
  workflows:
    "No workflows in this organization. A workflow is the responsibility sequence (execute → verify → approve) a profile runs.",
  profiles:
    "No execution profiles for this operation. A profile is HOW the operation runs; a standard can only point at a PUBLISHED one.",
  standardEntries:
    "This standard has no entries, so it maps no operations and can never be published.",
} as const;

// ── Errors ───────────────────────────────────────────────────────────────────

export const OPS_CONFIG_ERRORS = {
  unauthorized: "Unauthorized",
  loadFailed: "Failed to load operations configuration.",
  bootstrapFailed: "Failed to bootstrap the operations organization.",
  organizationRequired: "Please select an operations organization.",
  propertyRequired: "Please select a property.",
  labelRequired: "Please enter a label.",
  codeRequired: "Please enter a code.",
  nameRequired: "Please enter a name.",
  categoryRequired: "Please select a category.",
  spaceTypeRequired: "Please select a space type.",
  assetTypeRequired: "Please select an asset type.",
  operationRequired: "Please select an operation.",
  standardRequired: "Please select a standard.",
  reasonRequired: "An override requires a reason.",
  invalidMetadata: "Metadata must be a valid JSON object.",
  triggerTypeRequired: "Please select a trigger type.",
  recurrenceRequired: `TIME schedules need a recurrence (${RECURRENCE_HINT}) and a time of day.`,
  eventTypeRequired: "EVENT schedules need an event type.",
  standardProfileMapRequired: "Please select a standard entry.",
  operationCodeRequired: "Please enter the operation code to generate.",
  workflowRequired: "Please select a workflow.",
  responsibilityRequired: "Please select a responsibility.",
  assigneeRequired: "Please select the person to assign.",
  profileRequired: "Please select an execution profile.",
  stepsRequired: "A workflow needs at least one step.",
  executorStepRequired:
    "A workflow must have exactly one EXECUTOR step (V1 invariant).",
  operationsRequired: "Select at least one operation to activate.",
  activationFailed: "Activation stopped — see the step list for the failure.",
  generationErrorIdRequired: "Generation error id is missing.",
  invalidEvidenceMinCount:
    "Evidence minimums must be whole numbers between 0 and 20.",
  profileNotDraft:
    "Only DRAFT profiles can be edited — create a new version first.",
  /**
   * `GET /api/ops/config/standards/active` is registered AFTER
   * `GET /api/ops/config/standards/{id}`, so the param route shadows it and the
   * API answers a uuid ZodError for `id: "active"`. Detected explicitly so the
   * panel never reports "no standard" when it simply could not ask.
   */
  activeStandardUnreadable:
    "Could not read this property's active standard: the API's /standards/active route is shadowed by /standards/{id} (it answers a uuid validation error for id=\"active\"). The chain below is shown as UNKNOWN, not as empty.",
} as const;

// ── Success messages ─────────────────────────────────────────────────────────

export const OPS_CONFIG_SUCCESS = {
  bootstrapped: "Operations organization is ready.",
  assetTypeCreated: "Asset type created.",
  spaceTypeCreated: "Space type created.",
  spaceCreated: "Space created.",
  spaceUpdated: "Space updated.",
  assetCreated: "Asset created.",
  assetUpdated: "Asset updated.",
  assetDecommissioned: "Asset decommissioned.",
  assetRecommissioned: "Asset recommissioned.",
  operationCreated: "Operation created.",
  operationUpdated: "Operation updated.",
  overrideSaved: "Override saved.",
  overrideDeleted: "Override deleted.",
  scheduleCreated: "Schedule created.",
  scheduleEnabled: "Schedule enabled.",
  scheduleDisabled: "Schedule disabled.",
  standardAssigned: "Standard assigned to property.",
  instanceGenerated: "Operation instance generated.",
  engineTicked: "Engine tick complete.",
  workflowCreated: "Workflow created (DRAFT).",
  workflowPublished: "Workflow published.",
  profileCreated: "Execution profile created (DRAFT).",
  profileUpdated: "Execution profile updated.",
  profileEvidenceUpdated: "Evidence requirements saved to the DRAFT.",
  profileVersioned: "New DRAFT version created.",
  profilePublished: "Execution profile published.",
  standardCreated: "Standard created (DRAFT).",
  standardEntrySaved: "Standard entry saved.",
  standardPublished: "Standard published.",
  standardDefaulted:
    "Default standard set — new properties will inherit it automatically.",
  standardCloned: "Standard cloned (DRAFT).",
  generationErrorResolved: "Generation error marked resolved.",
  responsibilitySaved: "Responsibility assigned.",
  responsibilityUpdated: "Responsibility updated.",
  responsibilityDeleted: "Responsibility removed.",
  responsibilityOverrideSaved: "Responsibility override saved.",
  responsibilityOverrideRemoved: "Responsibility override removed.",
  activated: "Operations activated for this property.",
} as const;
