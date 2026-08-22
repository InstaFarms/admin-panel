"use client";

/**
 * Operations tab — which operations exist, whether each APPLIES to this
 * property, and the per-property override that turns one off.
 *
 * Applicability is not derived HERE. It is asked of the engine
 * (ops-engine-service.explainApplicability, served alongside the property's
 * responsibility status) and rendered verbatim.
 *
 * This tab used to compute it client-side from the required asset type alone
 * and claim that was "exactly the rule the engine uses". It was not: the engine
 * also honours the V0 admin gates — METER_READING needs the property's meter
 * configuration, a linked task deactivated in the tasks admin is a kill-switch
 * — so a property with a meter and no meter configuration was drawn as APPLIES
 * while every tick generated nothing. A second copy of a rule is how that
 * happened; there is now one copy, on the server. When the server does not
 * answer (an older API), the verdict renders UNKNOWN — never a guess.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Checkbox,
  Label,
  Select,
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
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineClipboardList,
  HiOutlinePlus,
} from "react-icons/hi";

import ConfirmModal from "@/components/ConfirmModal";
import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  createOperation,
  deleteOverride,
  getAssetTypes,
  getOperations,
  getOverrides,
  getResponsibilityStatus,
  getSpaceTypes,
  updateOperation,
  upsertOverride,
  type OpsAssetType,
  type OpsOperation,
  type OpsOverride,
  type OpsResponsibilityStatus,
  type OpsSpaceType,
} from "@/actions/opsConfigActions";
import {
  OPERATION_CATEGORIES,
  type OperationCategory,
} from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

const CATEGORY_COLORS: Record<string, string> = {
  HOUSEKEEPING: "info",
  AUDIT: "purple",
  CHECK_IN: "success",
  CHECK_OUT: "warning",
  MAINTENANCE: "indigo",
  COMPLIANCE: "failure",
  DOCUMENTATION: "gray",
  FINANCIAL: "pink",
  REVIEW: "dark",
};

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

/**
 * The engine's verdict for ONE operation at this property, exactly as the
 * server sends it (packages/services/ops-engine-service.ts → OpsApplicability).
 * Nothing in this file recomputes any part of it.
 */
export type OpsApplicabilityVerdict = {
  operationId: string;
  operationCode: string;
  operationName?: string;
  applies: boolean;
  reason: string;
  blockers: string[];
  targets: { kind: string; id: string | null; label: string }[];
  provisional?: boolean;
};

/**
 * Pull the verdicts off the property status payload, keyed by operation.
 *
 * Deliberately defensive: an API that predates the field yields an EMPTY map
 * and every row renders UNKNOWN. That is the honest answer — the previous
 * behaviour, inventing a verdict from the asset list alone, is the defect.
 */
export function applicabilityByOperation(
  status: OpsResponsibilityStatus | null,
): Map<string, OpsApplicabilityVerdict> {
  const rows = (
    status as unknown as {
      operationApplicability?: OpsApplicabilityVerdict[];
    } | null
  )?.operationApplicability;
  const map = new Map<string, OpsApplicabilityVerdict>();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row?.operationId) map.set(row.operationId, row);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// One operation row + its expandable editor.
// ---------------------------------------------------------------------------

function OperationRow({
  operation,
  override,
  verdict,
  requiredTypeLabel,
  assetTypes,
  spaceTypes,
  propertyId,
  onChanged,
  onRequestClear,
}: {
  operation: OpsOperation;
  override: OpsOverride | undefined;
  /** The engine's answer. `undefined` ⇒ the server did not answer: UNKNOWN. */
  verdict: OpsApplicabilityVerdict | undefined;
  requiredTypeLabel: string | null;
  assetTypes: OpsAssetType[];
  spaceTypes: OpsSpaceType[];
  propertyId: string;
  onChanged: () => Promise<void>;
  onRequestClear: (override: OpsOverride, operationName: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const [enabled, setEnabled] = useState(override?.enabled ?? true);
  const [reason, setReason] = useState(override?.reason ?? "");
  const [savingOverride, startSaveOverride] = useTransition();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(operation.name);
  const [editDescription, setEditDescription] = useState(
    operation.description ?? "",
  );
  const [editRequired, setEditRequired] = useState(
    operation.requiredAssetTypeId ?? "",
  );
  const [editTargetSpace, setEditTargetSpace] = useState(
    operation.targetSpaceTypeId ?? "",
  );
  const [savingEdit, startSaveEdit] = useTransition();

  useEffect(() => {
    setEnabled(override?.enabled ?? true);
    setReason(override?.reason ?? "");
  }, [override?.enabled, override?.reason]);

  const handleSaveOverride = useCallback(() => {
    if (!reason.trim()) {
      toast.error("An override needs a reason — it is mandatory");
      return;
    }
    startSaveOverride(() => {
      toast
        .promise(
          parseServerActionResult(
            // ALWAYS send the complete quadruple: the backend coerces an
            // omitted executionProfileId to null, silently wiping it.
            upsertOverride({
              propertyId,
              operationId: operation.id,
              executionProfileId: override?.executionProfileId ?? null,
              enabled,
              reason: reason.trim(),
            }),
          ),
          {
            loading: "Saving override...",
            success: (message) => message || "Override saved",
            error: (error: Error) => error.message || "Failed to save override",
          },
        )
        .then(() => onChanged())
        .catch(() => undefined);
    });
  }, [
    enabled,
    onChanged,
    operation.id,
    override?.executionProfileId,
    propertyId,
    reason,
  ]);

  const handleSaveEdit = useCallback(() => {
    const name = editName.trim();
    if (!name) {
      toast.error("A name is required");
      return;
    }
    const formData = new FormData();
    formData.append("name", name);
    if (editDescription.trim()) {
      formData.append("description", editDescription.trim());
    }
    // Omitted => the action sends null, which clears the binding.
    if (editRequired) formData.append("requiredAssetTypeId", editRequired);
    if (editTargetSpace) formData.append("targetSpaceTypeId", editTargetSpace);

    startSaveEdit(() => {
      toast
        .promise(
          parseServerActionResult(updateOperation(operation.id, formData)),
          {
            loading: "Saving operation...",
            success: (message) => message || "Operation updated",
            error: (error: Error) =>
              error.message || "Failed to update operation",
          },
        )
        .then(() => {
          setEditing(false);
          return onChanged();
        })
        .catch(() => undefined);
    });
  }, [
    editDescription,
    editName,
    editRequired,
    editTargetSpace,
    onChanged,
    operation.id,
  ]);

  const overrideBadge = !override ? (
    <Badge color="gray" className="inline-flex w-fit">
      Standard
    </Badge>
  ) : override.enabled ? (
    <Badge color="info" className="inline-flex w-fit">
      Override · on
    </Badge>
  ) : (
    <Badge color="failure" className="inline-flex w-fit">
      Override · off
    </Badge>
  );

  return (
    <>
      <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
        <TableCell>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex items-start gap-2 text-left"
          >
            {open ? (
              <HiOutlineChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
            ) : (
              <HiOutlineChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
            )}
            <span>
              <span className="block font-medium text-gray-900 dark:text-white">
                {operation.name}
              </span>
              <span className="block font-mono text-xs text-gray-500 dark:text-gray-400">
                {operation.code}
              </span>
            </span>
          </button>
        </TableCell>
        <TableCell>
          <Badge
            color={CATEGORY_COLORS[operation.category] ?? "gray"}
            className="inline-flex w-fit"
          >
            {operation.category}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
          {requiredTypeLabel ?? (
            <span className="text-gray-400">— (applies everywhere)</span>
          )}
        </TableCell>
        <TableCell>
          {!verdict ? (
            <Badge color="gray" className="inline-flex w-fit">
              UNKNOWN
            </Badge>
          ) : verdict.applies ? (
            <Badge color="success" className="inline-flex w-fit">
              APPLIES
            </Badge>
          ) : (
            <Badge color="warning" className="inline-flex w-fit">
              NOT APPLICABLE
            </Badge>
          )}
          <span className="mt-1 block max-w-xs text-xs text-gray-500 dark:text-gray-400">
            {verdict
              ? verdict.reason
              : "The engine's verdict for this property could not be read — this is not the same as “does not apply”."}
          </span>
        </TableCell>
        <TableCell>{overrideBadge}</TableCell>
      </TableRow>

      {open ? (
        <TableRow className="bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
          <TableCell colSpan={5}>
            <div className="flex flex-col gap-5 py-2">
              <div className="flex flex-col gap-3">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Property override
                </h6>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`enabled-${operation.id}`}
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <Label htmlFor={`enabled-${operation.id}`}>
                    Enabled at this property
                  </Label>
                </div>
                <div>
                  <Label htmlFor={`reason-${operation.id}`}>
                    Reason (required)
                  </Label>
                  <Textarea
                    id={`reason-${operation.id}`}
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. This property has no pool."
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Unchecking <strong>Enabled</strong> (with{" "}
                  <span className="font-mono">executionProfileId: null</span>) is
                  the sanctioned way to say &quot;this property does not do
                  X&quot; — the configuration stays, generation stops. Saving
                  always resends the current execution profile, because a partial
                  save would silently wipe it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <MyButton
                    size="sm"
                    loading={savingOverride}
                    onClick={handleSaveOverride}
                  >
                    Save override
                  </MyButton>
                  {override ? (
                    <MyButton
                      size="sm"
                      color="light"
                      onClick={() => onRequestClear(override, operation.name)}
                    >
                      Clear override (return to standard)
                    </MyButton>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Operation definition (organization-wide)
                  </h6>
                  <MyButton
                    size="xs"
                    color="light"
                    onClick={() => setEditing((value) => !value)}
                  >
                    {editing ? "Cancel" : "Edit"}
                  </MyButton>
                </div>

                {editing ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor={`name-${operation.id}`}>Name</Label>
                      <TextInput
                        id={`name-${operation.id}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`desc-${operation.id}`}>Description</Label>
                      <TextInput
                        id={`desc-${operation.id}`}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`req-${operation.id}`}>
                        Requires asset type
                      </Label>
                      <Select
                        id={`req-${operation.id}`}
                        value={editRequired}
                        onChange={(e) => setEditRequired(e.target.value)}
                      >
                        <option value="">— none (applies everywhere)</option>
                        {assetTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({type.code})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`space-${operation.id}`}>
                        Target space type
                      </Label>
                      <Select
                        id={`space-${operation.id}`}
                        value={editTargetSpace}
                        onChange={(e) => setEditTargetSpace(e.target.value)}
                      >
                        <option value="">— none</option>
                        {spaceTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({type.code})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <MyButton
                        size="sm"
                        loading={savingEdit}
                        onClick={handleSaveEdit}
                      >
                        Save operation
                      </MyButton>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        The operation <strong>code</strong> is immutable — it
                        anchors years of reporting — so it is not editable here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {operation.description || (
                      <span className="text-gray-400">No description.</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------

function CreateOperationForm({
  organizationId,
  assetTypes,
  spaceTypes,
  onCreated,
}: {
  organizationId: string;
  assetTypes: OpsAssetType[];
  spaceTypes: OpsSpaceType[];
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<OperationCategory>("HOUSEKEEPING");
  const [requiredAssetTypeId, setRequiredAssetTypeId] = useState("");
  const [targetSpaceTypeId, setTargetSpaceTypeId] = useState("");
  const [creating, startCreate] = useTransition();

  const handleCreate = useCallback(() => {
    const cleanCode = normalizeCode(code);
    const cleanName = name.trim();
    if (!cleanCode) {
      toast.error("A code is required");
      return;
    }
    if (!cleanName) {
      toast.error("A name is required");
      return;
    }

    const formData = new FormData();
    formData.append("organizationId", organizationId);
    formData.append("code", cleanCode);
    formData.append("name", cleanName);
    formData.append("category", category);
    if (description.trim()) formData.append("description", description.trim());
    if (requiredAssetTypeId) {
      formData.append("requiredAssetTypeId", requiredAssetTypeId);
    }
    if (targetSpaceTypeId) {
      formData.append("targetSpaceTypeId", targetSpaceTypeId);
    }

    startCreate(() => {
      toast
        .promise(parseServerActionResult(createOperation(formData)), {
          loading: "Creating operation...",
          success: (message) => message || "Operation created",
          error: (error: Error) => error.message || "Failed to create operation",
        })
        .then(() => {
          setCode("");
          setName("");
          setDescription("");
          setRequiredAssetTypeId("");
          setTargetSpaceTypeId("");
          setOpen(false);
          return onCreated();
        })
        .catch(() => undefined);
    });
  }, [
    category,
    code,
    description,
    name,
    onCreated,
    organizationId,
    requiredAssetTypeId,
    targetSpaceTypeId,
  ]);

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h5 className="text-base font-semibold text-gray-900 dark:text-white">
          New operation
        </h5>
        <MyButton size="xs" color="light" onClick={() => setOpen((v) => !v)}>
          <HiOutlinePlus className="mr-1 h-4 w-4" />
          {open ? "Close" : "Add"}
        </MyButton>
      </div>

      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="op-code">Code (immutable once created)</Label>
            <TextInput
              id="op-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => setCode(normalizeCode(code))}
              placeholder="CRICKET_PITCH_ROLLING"
            />
          </div>
          <div>
            <Label htmlFor="op-name">Name</Label>
            <TextInput
              id="op-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Roll the cricket pitch"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="op-desc">Description</Label>
            <Textarea
              id="op-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="op-category">Category</Label>
            <Select
              id="op-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as OperationCategory)}
            >
              {OPERATION_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="op-required">Requires asset type</Label>
            <Select
              id="op-required"
              value={requiredAssetTypeId}
              onChange={(e) => setRequiredAssetTypeId(e.target.value)}
            >
              <option value="">— none (applies everywhere)</option>
              {assetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="op-space">Target space type</Label>
            <Select
              id="op-space"
              value={targetSpaceTypeId}
              onChange={(e) => setTargetSpaceTypeId(e.target.value)}
            >
              <option value="">— none</option>
              {spaceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <MyButton loading={creating} onClick={handleCreate}>
              Create operation
            </MyButton>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

export default function OperationsSection({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OpsOperation[]>([]);
  const [overrides, setOverrides] = useState<OpsOverride[]>([]);
  const [assetTypes, setAssetTypes] = useState<OpsAssetType[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<OpsSpaceType[]>([]);
  // The engine's applicability verdicts, fetched — never computed here.
  const [status, setStatus] = useState<OpsResponsibilityStatus | null>(null);
  // The confirm modal lives outside the table: flowbite's Modal renders inline,
  // and a <div> inside <tbody> is invalid DOM.
  const [clearTarget, setClearTarget] = useState<{
    override: OpsOverride;
    operationName: string;
  } | null>(null);
  const [clearing, startClear] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ops, propertyOverrides, aTypes, sTypes] = await Promise.all([
        getOperations(organizationId),
        getOverrides(propertyId),
        getAssetTypes(organizationId),
        getSpaceTypes(organizationId),
      ]);
      setOperations(ops);
      setOverrides(propertyOverrides);
      setAssetTypes(aTypes);
      setSpaceTypes(sTypes);
      // Kept out of the Promise.all: losing the engine's verdict must degrade
      // this column to UNKNOWN, not blank the whole tab.
      try {
        setStatus(await getResponsibilityStatus(propertyId));
      } catch {
        setStatus(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load operations",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const overrideByOperation = useMemo(() => {
    const map = new Map<string, OpsOverride>();
    for (const override of overrides) map.set(override.operationId, override);
    return map;
  }, [overrides]);

  const assetTypeById = useMemo(() => {
    const map = new Map<string, OpsAssetType>();
    for (const type of assetTypes) map.set(type.id, type);
    return map;
  }, [assetTypes]);

  /** The engine's verdict per operation. Absent ⇒ UNKNOWN, never a guess. */
  const verdictByOperation = useMemo(
    () => applicabilityByOperation(status),
    [status],
  );

  const handleClearOverride = useCallback(() => {
    if (!clearTarget) return;
    startClear(() => {
      toast
        .promise(
          parseServerActionResult(deleteOverride(clearTarget.override.id)),
          {
            loading: "Clearing override...",
            success: (message) => message || "Override cleared",
            error: (error: Error) => error.message || "Failed to clear override",
          },
        )
        .then(() => {
          setClearTarget(null);
          return load();
        })
        .catch(() => undefined);
    });
  }, [clearTarget, load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <strong>Applicability is the engine&apos;s answer, asked live.</strong>{" "}
        This column is not computed in the browser — it is the verdict the
        generation engine itself would reach for this property, so it cannot
        disagree with what a tick actually produces. It covers the required
        asset (no ACTIVE asset of the type ⇒ no work) <em>and</em> the
        controls in the older admin screens: meter readings need this
        property&apos;s meter configuration, and a linked task deactivated in
        the tasks admin stays off. Each row says which of those it is.
      </div>

      <CreateOperationForm
        organizationId={organizationId}
        assetTypes={assetTypes}
        spaceTypes={spaceTypes}
        onCreated={load}
      />

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Operations &amp; overrides
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click a row to set what this property does and does not do.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <JarvisLoader size="lg" />
          </div>
        ) : operations.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No operations defined for this organization yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Operation</TableHeadCell>
                  <TableHeadCell>Category</TableHeadCell>
                  <TableHeadCell>Requires asset type</TableHeadCell>
                  <TableHeadCell>At this property</TableHeadCell>
                  <TableHeadCell>Override</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {operations.map((operation) => {
                  const requiredType = operation.requiredAssetTypeId
                    ? assetTypeById.get(operation.requiredAssetTypeId)
                    : undefined;
                  return (
                    <OperationRow
                      key={operation.id}
                      operation={operation}
                      override={overrideByOperation.get(operation.id)}
                      verdict={verdictByOperation.get(operation.id)}
                      requiredTypeLabel={
                        operation.requiredAssetTypeId
                          ? requiredType
                            ? `${requiredType.name} (${requiredType.code})`
                            : operation.requiredAssetTypeId
                          : null
                      }
                      assetTypes={assetTypes}
                      spaceTypes={spaceTypes}
                      propertyId={propertyId}
                      onChanged={load}
                      onRequestClear={(override, operationName) =>
                        setClearTarget({ override, operationName })
                      }
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ConfirmModal
        showModal={clearTarget !== null}
        tone="danger"
        title="Clear override?"
        confirmationText={`"${clearTarget?.operationName ?? ""}" will fall back to whatever the assigned standard says for this property.`}
        confirmLabel="Clear override"
        loading={clearing}
        acceptCallback={handleClearOverride}
        closeCallback={() => setClearTarget(null)}
      />
    </div>
  );
}
