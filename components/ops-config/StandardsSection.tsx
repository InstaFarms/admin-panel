"use client";

/**
 * Standards tab — the manual authoring path for the middle of the chain, for
 * when the Activate tab's opinionated defaults are not what you want.
 *
 * Three objects, in dependency order:
 *   WORKFLOW (responsibility sequence)
 *     → EXECUTION PROFILE (how one operation runs; needs a PUBLISHED workflow)
 *       → STANDARD + ENTRIES (which operation uses which PUBLISHED profile)
 *
 * Lifecycle is enforced by the API and mirrored here so the UI never offers an
 * action that will 409: published objects are IMMUTABLE (a profile is edited by
 * creating a new version), a profile publishes only after its workflow, and a
 * standard publishes only when it has entries and every profile is published.
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Label,
  Select,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  Textarea,
} from "flowbite-react";
import {
  HiOutlineClipboardCheck,
  HiOutlineCog,
  HiOutlineTemplate,
} from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  assignStandard,
  cloneStandard,
  createExecutionProfile,
  createStandard,
  createWorkflow,
  getExecutionProfiles,
  getOperations,
  getStandard,
  getStandards,
  getWorkflows,
  newProfileVersion,
  publishExecutionProfile,
  publishStandard,
  publishWorkflow,
  updateExecutionProfile,
  setDefaultStandard,
  setStandardEntry,
  type OpsExecutionProfile,
  type OpsOperation,
  type OpsStandard,
  type OpsStandardWithEntries,
  type OpsWorkflow,
} from "@/actions/opsConfigActions";
import {
  APP_CAPTURABLE_ARTIFACT_KINDS,
  DEFAULT_GPS_KINDS,
  EVIDENCE_HINTS,
  EVIDENCE_UNCAPTURABLE_WARNING,
  EVIDENCE_NONE_LABEL,
  OPS_ARTIFACT_KINDS,
  OPS_ARTIFACT_KIND_LABELS,
  OPS_CAPTURED_ARTIFACT_KINDS,
  type OpsArtifactKind,
} from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

// ---------------------------------------------------------------------------
// Evidence requirements
//
// `evidenceRequirements` is jsonb the API never validates (the route schema is
// z.record(z.unknown())), so this UI is the only thing that keeps the shape
// legal. What the runtime actually enforces, at submit, before any artifact row
// is written (ops-runtime-service.validateEvidence):
//   requiredKinds   → counts artifacts per kind, `have < minCount` ⇒ 409
//   gpsRequired     → artifacts of `gpsKinds` (default PHOTO) must carry coords
//   liveCaptureOnly → every CAPTURED artifact must carry capture time AND GPS,
//                     the pair only the app's live camera produces. Provenance,
//                     not freshness: capture time is never compared against now,
//                     so an offline submission replayed hours later still passes.
// The profile is snapshotted onto each instance at generation, so edits here
// never affect work that already exists.
// ---------------------------------------------------------------------------

const EVIDENCE_MAX_MIN_COUNT = 20;

type EvidenceDraft = {
  minCounts: Record<OpsArtifactKind, number>;
  gpsRequired: boolean;
  /** Empty ⇒ the engine's own fallback, PHOTO. */
  gpsKinds: OpsArtifactKind[];
  liveCaptureOnly: boolean;
};

function emptyEvidenceDraft(): EvidenceDraft {
  const minCounts = {} as Record<OpsArtifactKind, number>;
  for (const kind of OPS_ARTIFACT_KINDS) minCounts[kind] = 0;
  return {
    minCounts,
    gpsRequired: false,
    gpsKinds: [...DEFAULT_GPS_KINDS],
    liveCaptureOnly: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArtifactKind(value: unknown): value is OpsArtifactKind {
  return OPS_ARTIFACT_KINDS.some((kind) => kind === value);
}

/** False for kinds the caretaker app cannot capture (today: video, signature). */
function isAppCapturable(kind: OpsArtifactKind): boolean {
  return APP_CAPTURABLE_ARTIFACT_KINDS.some((k) => k === kind);
}

/**
 * Narrows whatever is actually stored on the profile. Legacy and hand-written
 * blobs exist (unknown kinds, string counts, missing arrays) — anything that
 * does not parse is dropped rather than rendered or crashed on.
 */
function parseEvidenceDraft(value: unknown): EvidenceDraft {
  const draft = emptyEvidenceDraft();
  if (!isRecord(value)) return draft;

  const requiredKinds = value.requiredKinds;
  if (Array.isArray(requiredKinds)) {
    for (const entry of requiredKinds) {
      if (!isRecord(entry) || !isArtifactKind(entry.kind)) continue;
      const raw = entry.minCount;
      const min = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(min) || min <= 0) continue;
      // Several entries for one kind is legal jsonb; the runtime checks each,
      // so the strictest one is what a caretaker actually has to satisfy.
      draft.minCounts[entry.kind] = Math.max(
        draft.minCounts[entry.kind],
        Math.min(Math.floor(min), EVIDENCE_MAX_MIN_COUNT),
      );
    }
  }
  // Only device-captured kinds are offered, so a stored NUMERIC_READING/NOTE
  // (hand-written jsonb) is dropped rather than shown as a tickable box the
  // editor could never reproduce. Nothing legal left ⇒ the engine's own PHOTO
  // fallback, which is exactly what such a profile behaves like today.
  const storedGpsKinds = value.gpsKinds;
  if (Array.isArray(storedGpsKinds)) {
    const kinds = OPS_CAPTURED_ARTIFACT_KINDS.filter((kind) =>
      storedGpsKinds.includes(kind),
    );
    draft.gpsKinds = kinds.length > 0 ? [...kinds] : [...DEFAULT_GPS_KINDS];
  }
  draft.gpsRequired = value.gpsRequired === true;
  draft.liveCaptureOnly = value.liveCaptureOnly === true;
  return draft;
}

/**
 * Builds the wire object, or `undefined` when nothing is required — PATCH is a
 * whole-object replace and create only forwards truthy keys, so omitting the
 * key is how "no requirements" is expressed.
 */
function buildEvidenceRequirements(
  draft: EvidenceDraft,
): Record<string, unknown> | undefined {
  const requiredKinds = OPS_ARTIFACT_KINDS.filter(
    (kind) => draft.minCounts[kind] > 0,
  ).map((kind) => ({ kind, minCount: draft.minCounts[kind] }));

  const body: Record<string, unknown> = {};
  if (requiredKinds.length > 0) body.requiredKinds = requiredKinds;
  if (draft.gpsRequired) {
    body.gpsRequired = true;
    // Only written when it differs from the engine's fallback, so a plain
    // photos-only profile keeps the small shape it has always had.
    if (!isDefaultGpsKinds(draft.gpsKinds)) body.gpsKinds = [...draft.gpsKinds];
  }
  if (draft.liveCaptureOnly) body.liveCaptureOnly = true;
  return Object.keys(body).length > 0 ? body : undefined;
}

function isDefaultGpsKinds(kinds: OpsArtifactKind[]): boolean {
  return (
    kinds.length === DEFAULT_GPS_KINDS.length &&
    DEFAULT_GPS_KINDS.every((kind) => kinds.includes(kind))
  );
}

/** Compact table summary, e.g. "2x PHOTO - GPS on PHOTO - live capture". */
function summarizeEvidence(value: unknown): string {
  const draft = parseEvidenceDraft(value);
  const parts = OPS_ARTIFACT_KINDS.filter(
    (kind) => draft.minCounts[kind] > 0,
  ).map((kind) => `${draft.minCounts[kind]}x ${kind}`);
  if (draft.gpsRequired) parts.push(`GPS on ${draft.gpsKinds.join("/")}`);
  if (draft.liveCaptureOnly) parts.push("live capture");
  return parts.length > 0 ? parts.join(" - ") : EVIDENCE_NONE_LABEL;
}

/** Shared editor — used by the create form and by the DRAFT row editor. */
function EvidenceFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: EvidenceDraft;
  onChange: (next: EvidenceDraft) => void;
}) {
  const uncapturable = OPS_ARTIFACT_KINDS.filter(
    (kind) => value.minCounts[kind] > 0 && !isAppCapturable(kind),
  );

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        Evidence required
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {EVIDENCE_HINTS.minCount}
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OPS_ARTIFACT_KINDS.map((kind) => (
          <div key={kind} className="flex items-center gap-2">
            <Label
              htmlFor={`${idPrefix}-min-${kind}`}
              className="flex-1 text-sm text-gray-700 dark:text-gray-200"
            >
              {OPS_ARTIFACT_KIND_LABELS[kind]}
              {isAppCapturable(kind) ? null : (
                <span
                  className="ml-1 cursor-help text-amber-600 dark:text-amber-400"
                  title={EVIDENCE_UNCAPTURABLE_WARNING}
                >
                  ⚠
                </span>
              )}
            </Label>
            <TextInput
              id={`${idPrefix}-min-${kind}`}
              type="number"
              min={0}
              max={EVIDENCE_MAX_MIN_COUNT}
              className="w-20"
              value={String(value.minCounts[kind])}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                const min = Number.isFinite(parsed)
                  ? Math.min(Math.max(parsed, 0), EVIDENCE_MAX_MIN_COUNT)
                  : 0;
                onChange({
                  ...value,
                  minCounts: { ...value.minCounts, [kind]: min },
                });
              }}
            />
          </div>
        ))}
      </div>

      {uncapturable.length > 0 ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          Requiring {uncapturable.map((k) => OPS_ARTIFACT_KIND_LABELS[k].toLowerCase()).join(" and ")}{" "}
          makes this profile unsubmittable: the caretaker app has no way to
          capture {uncapturable.length > 1 ? "them" : "it"}, so it blocks the
          task rather than letting the work be done and then rejected.
        </p>
      ) : null}

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
        <Checkbox
          className="mt-1"
          checked={value.gpsRequired}
          onChange={() =>
            onChange({ ...value, gpsRequired: !value.gpsRequired })
          }
        />
        <span>
          GPS required
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {EVIDENCE_HINTS.gpsRequired}
          </span>
        </span>
      </label>

      {value.gpsRequired ? (
        <div className="ml-6 mt-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {EVIDENCE_HINTS.gpsKinds}
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            {OPS_CAPTURED_ARTIFACT_KINDS.map((kind) => (
              <label
                key={kind}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200"
              >
                <Checkbox
                  checked={value.gpsKinds.includes(kind)}
                  onChange={() => {
                    const next = value.gpsKinds.includes(kind)
                      ? value.gpsKinds.filter((k) => k !== kind)
                      : // Rebuilt from the canonical list so the order is stable
                        // however the boxes were clicked.
                        OPS_CAPTURED_ARTIFACT_KINDS.filter(
                          (k) => k === kind || value.gpsKinds.includes(k),
                        );
                    onChange({ ...value, gpsKinds: [...next] });
                  }}
                />
                {OPS_ARTIFACT_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
          {value.gpsKinds.length === 0 ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Nothing ticked — the engine falls back to photos only.
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
        <Checkbox
          className="mt-1"
          checked={value.liveCaptureOnly}
          onChange={() =>
            onChange({ ...value, liveCaptureOnly: !value.liveCaptureOnly })
          }
        />
        <span>
          Live capture only
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {EVIDENCE_HINTS.liveCaptureOnly}
          </span>
        </span>
      </label>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  RETIRED: "gray",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge color={STATUS_COLORS[status] ?? "gray"} className="inline-flex w-fit">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

function WorkflowsCard({
  organizationId,
  workflows,
  onChanged,
}: {
  organizationId: string;
  workflows: OpsWorkflow[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shape, setShape] = useState<"EXECUTE" | "VERIFY" | "APPROVE">(
    "EXECUTE",
  );
  const [busy, startBusy] = useTransition();

  const handleCreate = useCallback(() => {
    if (!name.trim()) {
      toast.error("Give the workflow a name");
      return;
    }
    // Exactly one EXECUTOR step is a V1 invariant, so the shape picker only
    // ever adds REVIEWER/APPROVER on top of the single executor.
    const steps = [
      { seq: 1, responsibility: "EXECUTOR" as const, actionType: "EXECUTE" as const },
      ...(shape !== "EXECUTE"
        ? [
            {
              seq: 2,
              responsibility: "REVIEWER" as const,
              actionType: "VERIFY" as const,
            },
          ]
        : []),
      ...(shape === "APPROVE"
        ? [
            {
              seq: 3,
              responsibility: "APPROVER" as const,
              actionType: "APPROVE" as const,
            },
          ]
        : []),
    ];

    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            createWorkflow({
              organizationId,
              name: name.trim(),
              description: description.trim() || undefined,
              steps,
            }),
          ),
          {
            loading: "Creating workflow...",
            success: (message) => message || "Workflow created",
            error: (error: Error) => error.message || "Failed to create workflow",
          },
        )
        .then(() => {
          setOpen(false);
          setName("");
          setDescription("");
          return onChanged();
        })
        .catch(() => undefined);
    });
  }, [description, name, onChanged, organizationId, shape]);

  const handlePublish = useCallback(
    (id: string) => {
      startBusy(() => {
        toast
          .promise(parseServerActionResult(publishWorkflow(id)), {
            loading: "Publishing workflow...",
            success: (message) => message || "Workflow published",
            error: (error: Error) => error.message || "Failed to publish",
          })
          .then(() => onChanged())
          .catch(() => undefined);
      });
    },
    [onChanged],
  );

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineTemplate className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Workflows
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The responsibility sequence a profile runs. Exactly one EXECUTOR
              step; published workflows are immutable, and steps cannot be added
              afterwards.
            </p>
          </div>
        </div>
        <MyButton size="xs" color="light" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New workflow"}
        </MyButton>
      </div>

      {open ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="wf-name">Name</Label>
            <TextInput
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="W2 Execute + Verify"
            />
          </div>
          <div>
            <Label htmlFor="wf-shape">Steps</Label>
            <Select
              id="wf-shape"
              value={shape}
              onChange={(e) =>
                setShape(e.target.value as "EXECUTE" | "VERIFY" | "APPROVE")
              }
            >
              <option value="EXECUTE">Execute only</option>
              <option value="VERIFY">Execute + Verify</option>
              <option value="APPROVE">Execute + Verify + Approve</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="wf-desc">Description (optional)</Label>
            <Textarea
              id="wf-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <MyButton loading={busy} onClick={handleCreate}>
              Create workflow
            </MyButton>
          </div>
        </div>
      ) : null}

      {workflows.length === 0 ? (
        <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
          No workflows in this organization yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Version</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>
                  <span className="sr-only">Actions</span>
                </TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {workflows.map((workflow) => (
                <TableRow
                  key={workflow.id}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {workflow.name}
                  </TableCell>
                  <TableCell>v{workflow.version}</TableCell>
                  <TableCell>
                    <StatusBadge status={workflow.status} />
                  </TableCell>
                  <TableCell>
                    {workflow.status === "DRAFT" ? (
                      <MyButton
                        size="xs"
                        loading={busy}
                        onClick={() => handlePublish(workflow.id)}
                      >
                        Publish
                      </MyButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Execution profiles (per operation)
// ---------------------------------------------------------------------------

function ProfilesCard({
  operations,
  workflows,
  onChanged,
}: {
  operations: OpsOperation[];
  workflows: OpsWorkflow[];
  onChanged: () => Promise<void>;
}) {
  const publishedWorkflows = useMemo(
    () => workflows.filter((workflow) => workflow.status === "PUBLISHED"),
    [workflows],
  );

  const [operationId, setOperationId] = useState<string>("");
  const [profiles, setProfiles] = useState<OpsExecutionProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, startBusy] = useTransition();

  const [name, setName] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [perAsset, setPerAsset] = useState(false);
  const [perSpace, setPerSpace] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceDraft>(emptyEvidenceDraft);

  // Per-row evidence editing, DRAFT only — a PUBLISHED profile 409s on PATCH,
  // so the row offers "New version" instead and never an editor.
  const [editingId, setEditingId] = useState<string>("");
  const [editEvidence, setEditEvidence] = useState<EvidenceDraft>(
    emptyEvidenceDraft,
  );

  const operation = operations.find((row) => row.id === operationId) ?? null;

  const loadProfiles = useCallback(async (id: string) => {
    if (!id) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    try {
      setProfiles(await getExecutionProfiles(id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load profiles",
      );
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles(operationId);
    // Default the fan-out flags to the engine's own rule for this operation.
    const selected = operations.find((row) => row.id === operationId);
    setPerAsset(Boolean(selected?.requiredAssetTypeId));
    setPerSpace(
      !selected?.requiredAssetTypeId && Boolean(selected?.targetSpaceTypeId),
    );
    setName(selected ? `${selected.code} — Default Profile` : "");
    // A new operation means a new profile: start evidence from scratch too.
    setEvidence(emptyEvidenceDraft());
    setEditingId("");
  }, [loadProfiles, operationId, operations]);

  const refresh = useCallback(async () => {
    await loadProfiles(operationId);
    await onChanged();
  }, [loadProfiles, onChanged, operationId]);

  const handleCreate = useCallback(() => {
    if (!operationId) {
      toast.error("Pick an operation first");
      return;
    }
    if (!workflowId) {
      toast.error("Pick a PUBLISHED workflow");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            createExecutionProfile({
              operationId,
              workflowId,
              name: name.trim(),
              perAsset,
              perSpace,
              evidenceRequirements: buildEvidenceRequirements(evidence),
            }),
          ),
          {
            loading: "Creating profile...",
            success: (message) => message || "Profile created",
            error: (error: Error) => error.message || "Failed to create profile",
          },
        )
        .then(() => refresh())
        .catch(() => undefined);
    });
  }, [evidence, name, operationId, perAsset, perSpace, refresh, workflowId]);

  const handleSaveEvidence = useCallback(
    (profile: OpsExecutionProfile) => {
      if (profile.status !== "DRAFT") {
        toast.error("Only DRAFT profiles can be edited");
        return;
      }
      startBusy(() => {
        toast
          .promise(
            parseServerActionResult(
              updateExecutionProfile(profile.id, {
                // PATCH replaces the whole jsonb block, so this must be the
                // complete object. `undefined` is dropped by the action, which
                // would silently keep the old rules — send `{}` to clear.
                evidenceRequirements:
                  buildEvidenceRequirements(editEvidence) ?? {},
              }),
            ),
            {
              loading: "Saving evidence requirements...",
              success: (message) => message || "Profile updated",
              error: (error: Error) => error.message || "Failed to save",
            },
          )
          .then(() => {
            setEditingId("");
            return refresh();
          })
          .catch(() => undefined);
      });
    },
    [editEvidence, refresh],
  );

  const runAction = useCallback(
    (
      promise: Promise<{ success?: string; error?: string }>,
      loadingLabel: string,
    ) => {
      startBusy(() => {
        toast
          .promise(parseServerActionResult(promise), {
            loading: loadingLabel,
            success: (message) => message || "Done",
            error: (error: Error) => error.message || "Failed",
          })
          .then(() => refresh())
          .catch(() => undefined);
      });
    },
    [refresh],
  );

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <HiOutlineCog className="h-5 w-5" />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Execution profiles
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            HOW one operation runs. A standard can only point at a PUBLISHED
            profile, and a profile can only be published once its workflow is.
            Published profiles are immutable — edit by creating a new version.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="profile-operation">Operation</Label>
        <Select
          id="profile-operation"
          value={operationId}
          onChange={(e) => setOperationId(e.target.value)}
        >
          <option value="">— select an operation —</option>
          {operations.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} ({row.code})
            </option>
          ))}
        </Select>
      </div>

      {!operationId ? null : loading ? (
        <div className="flex justify-center py-6">
          <JarvisLoader />
        </div>
      ) : (
        <>
          {profiles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No profiles for {operation?.code}. Without one, no standard can map
              this operation and it can never generate work.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Name</TableHeadCell>
                    <TableHeadCell>Version</TableHeadCell>
                    <TableHeadCell>Fan-out</TableHeadCell>
                    <TableHeadCell>Evidence</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>
                      <span className="sr-only">Actions</span>
                    </TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {profiles.map((profile) => (
                    <Fragment key={profile.id}>
                    <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {profile.name}
                      </TableCell>
                      <TableCell>v{profile.version}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {profile.perAsset
                          ? "one task per asset"
                          : profile.perSpace
                            ? "one task per space"
                            : "one task per property"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {summarizeEvidence(profile.evidenceRequirements)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={profile.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {profile.status === "DRAFT" ? (
                            <>
                            <MyButton
                              size="xs"
                              color="light"
                              loading={busy}
                              onClick={() => {
                                if (editingId === profile.id) {
                                  setEditingId("");
                                  return;
                                }
                                setEditEvidence(
                                  parseEvidenceDraft(
                                    profile.evidenceRequirements,
                                  ),
                                );
                                setEditingId(profile.id);
                              }}
                            >
                              {editingId === profile.id
                                ? "Cancel"
                                : "Edit evidence"}
                            </MyButton>
                            <MyButton
                              size="xs"
                              loading={busy}
                              onClick={() =>
                                runAction(
                                  publishExecutionProfile(profile.id),
                                  "Publishing profile...",
                                )
                              }
                            >
                              Publish
                            </MyButton>
                            </>
                          ) : (
                            <MyButton
                              size="xs"
                              color="light"
                              loading={busy}
                              onClick={() =>
                                runAction(
                                  newProfileVersion(profile.id),
                                  "Creating new version...",
                                )
                              }
                            >
                              New version
                            </MyButton>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {editingId === profile.id ? (
                      <TableRow className="bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                        <TableCell colSpan={6}>
                          <EvidenceFields
                            idPrefix={`profile-evidence-${profile.id}`}
                            value={editEvidence}
                            onChange={setEditEvidence}
                          />
                          <div className="mt-2 flex gap-2">
                            <MyButton
                              size="xs"
                              loading={busy}
                              onClick={() => handleSaveEvidence(profile)}
                            >
                              Save evidence
                            </MyButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="profile-name">New profile name</Label>
              <TextInput
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-workflow">Workflow (PUBLISHED)</Label>
              <Select
                id="profile-workflow"
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
              >
                <option value="">— select —</option>
                {publishedWorkflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="profile-fanout">Fan-out</Label>
              <Select
                id="profile-fanout"
                value={perAsset ? "ASSET" : perSpace ? "SPACE" : "PROPERTY"}
                onChange={(e) => {
                  setPerAsset(e.target.value === "ASSET");
                  setPerSpace(e.target.value === "SPACE");
                }}
              >
                <option value="PROPERTY">One task per property</option>
                <option value="ASSET">One task per asset</option>
                <option value="SPACE">One task per space</option>
              </Select>
            </div>
            <div className="md:col-span-4">
              <EvidenceFields
                idPrefix="profile-evidence-new"
                value={evidence}
                onChange={setEvidence}
              />
            </div>
            <div className="md:col-span-4">
              <MyButton
                loading={busy}
                onClick={handleCreate}
                disabled={publishedWorkflows.length === 0}
              >
                Create profile (DRAFT)
              </MyButton>
              {publishedWorkflows.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  There are no PUBLISHED workflows yet — publish one above first.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Standards + entries
// ---------------------------------------------------------------------------

function StandardsCard({
  organizationId,
  propertyId,
  standards,
  operations,
  onChanged,
}: {
  organizationId: string;
  propertyId: string | null;
  standards: OpsStandard[];
  operations: OpsOperation[];
  onChanged: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<OpsStandardWithEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, startBusy] = useTransition();

  const [newName, setNewName] = useState("");
  const [entryOperationId, setEntryOperationId] = useState("");
  const [entryProfiles, setEntryProfiles] = useState<OpsExecutionProfile[]>([]);
  const [entryProfileId, setEntryProfileId] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      setDetail(await getStandard(id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load the standard",
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  // Only PUBLISHED profiles of the chosen operation can be mapped.
  useEffect(() => {
    if (!entryOperationId) {
      setEntryProfiles([]);
      setEntryProfileId("");
      return;
    }
    let active = true;
    getExecutionProfiles(entryOperationId)
      .then((rows) => {
        if (!active) return;
        const published = rows.filter((row) => row.status === "PUBLISHED");
        setEntryProfiles(published);
        setEntryProfileId(published[0]?.id ?? "");
      })
      .catch(() => {
        if (active) setEntryProfiles([]);
      });
    return () => {
      active = false;
    };
  }, [entryOperationId]);

  const refresh = useCallback(async () => {
    await loadDetail(selectedId);
    await onChanged();
  }, [loadDetail, onChanged, selectedId]);

  const operationById = useMemo(
    () => new Map(operations.map((row) => [row.id, row])),
    [operations],
  );

  const handleCreate = useCallback(() => {
    if (!newName.trim()) {
      toast.error("Give the standard a name");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            createStandard({ organizationId, name: newName.trim() }),
          ),
          {
            loading: "Creating standard...",
            success: (message) => message || "Standard created",
            error: (error: Error) => error.message || "Failed",
          },
        )
        .then(() => {
          setNewName("");
          return onChanged();
        })
        .catch(() => undefined);
    });
  }, [newName, onChanged, organizationId]);

  const handleAddEntry = useCallback(() => {
    if (!selectedId) return;
    if (!entryOperationId || !entryProfileId) {
      toast.error("Pick an operation and one of its PUBLISHED profiles");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            setStandardEntry({
              standardId: selectedId,
              operationId: entryOperationId,
              executionProfileId: entryProfileId,
              enabled: true,
            }),
          ),
          {
            loading: "Saving entry...",
            success: (message) => message || "Entry saved",
            error: (error: Error) => error.message || "Failed",
          },
        )
        .then(() => refresh())
        .catch(() => undefined);
    });
  }, [entryOperationId, entryProfileId, refresh, selectedId]);

  const runAction = useCallback(
    (
      promise: Promise<{ success?: string; error?: string }>,
      loadingLabel: string,
    ) => {
      startBusy(() => {
        toast
          .promise(parseServerActionResult(promise), {
            loading: loadingLabel,
            success: (message) => message || "Done",
            error: (error: Error) => error.message || "Failed",
          })
          .then(() => refresh())
          .catch(() => undefined);
      });
    },
    [refresh],
  );

  const handleClone = useCallback(() => {
    if (!detail) return;
    if (!cloneName.trim()) {
      toast.error("Give the clone a name");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            cloneStandard({ standardId: detail.id, name: cloneName.trim() }),
          ),
          {
            loading: "Cloning standard...",
            success: (message) => message || "Standard cloned",
            error: (error: Error) => error.message || "Failed to clone",
          },
        )
        .then(() => {
          setCloneOpen(false);
          setCloneName("");
          return onChanged();
        })
        .catch(() => undefined);
    });
  }, [cloneName, detail, onChanged]);

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <HiOutlineClipboardCheck className="h-5 w-5" />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Standards
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The operating manual a property inherits. Publish needs at least one
            entry and every mapped profile PUBLISHED; only PUBLISHED standards
            can be assigned, and assigning affects FUTURE instances only.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="std-new">New standard name</Label>
          <TextInput
            id="std-new"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Premium Villa Standard"
          />
        </div>
        <MyButton loading={busy} onClick={handleCreate}>
          Create (DRAFT)
        </MyButton>
      </div>

      <div>
        <Label htmlFor="std-select">Standard</Label>
        <Select
          id="std-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— select a standard —</option>
          {standards.map((standard) => (
            <option key={standard.id} value={standard.id}>
              {standard.name} ({standard.status}
              {standard.isDefault ? " · DEFAULT" : ""})
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <JarvisLoader />
        </div>
      ) : detail ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} />
            {detail.isDefault ? (
              <Badge color="indigo" className="inline-flex w-fit">
                DEFAULT
              </Badge>
            ) : null}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              v{detail.version} · {detail.entries?.length ?? 0} entries
            </span>
            {detail.status === "DRAFT" ? (
              <MyButton
                size="xs"
                loading={busy}
                onClick={() =>
                  runAction(publishStandard(detail.id), "Publishing standard...")
                }
              >
                Publish
              </MyButton>
            ) : propertyId ? (
              <MyButton
                size="xs"
                color="light"
                loading={busy}
                onClick={() =>
                  runAction(
                    assignStandard({ propertyId, standardId: detail.id }),
                    "Assigning standard...",
                  )
                }
              >
                Assign to the selected property
              </MyButton>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Select a property above to assign this standard.
              </span>
            )}
            {detail.status === "PUBLISHED" && !detail.isDefault ? (
              <MyButton
                size="xs"
                color="light"
                loading={busy}
                onClick={() =>
                  runAction(
                    setDefaultStandard(detail.id),
                    "Setting default standard...",
                  )
                }
              >
                Set as default
              </MyButton>
            ) : null}
            <MyButton
              size="xs"
              color="light"
              onClick={() => {
                setCloneOpen((open) => !open);
                setCloneName(`${detail.name} (copy)`);
              }}
            >
              {cloneOpen ? "Cancel clone" : "Clone"}
            </MyButton>
          </div>

          {detail.isDefault ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Newly created properties automatically inherit this standard.
            </p>
          ) : null}

          {cloneOpen ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="std-clone-name">Clone as</Label>
                <TextInput
                  id="std-clone-name"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder={`${detail.name} (copy)`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Copies the enabled entries and their schedules into a new
                  DRAFT. Property assignments are not copied.
                </p>
              </div>
              <MyButton loading={busy} onClick={handleClone}>
                Clone (DRAFT)
              </MyButton>
            </div>
          ) : null}

          {(detail.entries?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This standard has no entries, so it maps no operations and cannot
              be published.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Operation</TableHeadCell>
                    <TableHeadCell>Profile</TableHeadCell>
                    <TableHeadCell>Enabled</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {(detail.entries ?? []).map((entry) => {
                    const operation = operationById.get(entry.operationId);
                    return (
                      <TableRow
                        key={entry.id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {operation?.name ?? entry.operationId}
                          <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {operation?.code ?? ""}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {entry.executionProfileId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={entry.enabled ? "success" : "gray"}
                            className="inline-flex w-fit"
                          >
                            {entry.enabled ? "enabled" : "disabled"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 md:grid-cols-3">
            <div>
              <Label htmlFor="entry-op">Operation</Label>
              <Select
                id="entry-op"
                value={entryOperationId}
                onChange={(e) => setEntryOperationId(e.target.value)}
              >
                <option value="">— select —</option>
                {operations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({row.code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="entry-profile">Profile (PUBLISHED only)</Label>
              <Select
                id="entry-profile"
                value={entryProfileId}
                onChange={(e) => setEntryProfileId(e.target.value)}
              >
                {entryProfiles.length === 0 ? (
                  <option value="">— none published —</option>
                ) : null}
                {entryProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} v{profile.version}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <MyButton loading={busy} onClick={handleAddEntry}>
                Save entry
              </MyButton>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

export default function StandardsSection({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<OpsWorkflow[]>([]);
  const [standards, setStandards] = useState<OpsStandard[]>([]);
  const [operations, setOperations] = useState<OpsOperation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextWorkflows, nextStandards, nextOperations] = await Promise.all([
        getWorkflows(organizationId),
        getStandards(organizationId),
        getOperations(organizationId),
      ]);
      setWorkflows(nextWorkflows);
      setStandards(nextStandards);
      setOperations(nextOperations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load standards",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <JarvisLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        Build the chain in order: <strong>workflow</strong> →{" "}
        <strong>execution profile</strong> → <strong>standard + entries</strong>{" "}
        → publish → assign. The <strong>Activate</strong> tab does all of this in
        one press with sensible defaults — use this tab when you need a different
        workflow shape, fan-out or profile per operation.
      </div>

      <WorkflowsCard
        organizationId={organizationId}
        workflows={workflows}
        onChanged={load}
      />
      <ProfilesCard
        operations={operations}
        workflows={workflows}
        onChanged={load}
      />
      <StandardsCard
        organizationId={organizationId}
        propertyId={propertyId}
        standards={standards}
        operations={operations}
        onChanged={load}
      />
    </div>
  );
}
