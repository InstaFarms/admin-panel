"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiTrash } from "react-icons/hi";

import {
  getAgreementMilestoneConfig,
  getAgreementModelOptions,
  getMilestoneRevenueLedger,
  getMonthlyMilestoneTrackers,
  saveAgreementMilestoneConfig,
} from "@/actions/agreementMilestoneActions";
import type {
  MilestoneRevenueBasis,
  MilestoneSetupStatus,
} from "@/constants/propertyCommercialConfig";
import type {
  AgreementMilestoneConfig,
  AgreementModelOption,
  MilestoneRevenueLedger,
  MilestoneSetupLine,
  MonthlyMilestoneTracker,
  SaveAgreementMilestoneConfigInput,
} from "@/actions/agreementMilestoneActions";
import {
  MILESTONE_REVENUE_BASIS_OPTIONS,
  MILESTONE_SETUP_STATUS_OPTIONS,
} from "@/constants/propertyCommercialConfig";
import SectionHeading from "@/components/properties/SectionHeading";
import RestatementPreviewModal from "@/components/properties/correction/RestatementPreviewModal";
import PropertyCorrectionHistoryPanel from "@/components/properties/correction/PropertyCorrectionHistoryPanel";
import {
  Badge,
  Button,
  Checkbox,
  Select,
  TabItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tabs,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

type ConfigDraft = {
  agreementConfigId?: string | null;
  agreementModelId: string;
  milestoneEnabled: boolean;
  rent: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: "ACTIVE" | "INACTIVE";
  setupId?: string | null;
  setupName: string;
  revenueBasis: MilestoneRevenueBasis;
  setupStatus: MilestoneSetupStatus;
  setupEffectiveFrom: string;
  setupEffectiveTo: string;
  lines: Array<
    Omit<
      MilestoneSetupLine,
      "minRevenue" | "maxRevenue" | "commissionPercentage"
    > & {
      minRevenue: string;
      maxRevenue: string;
      commissionPercentage: string;
      localId: string;
    }
  >;
};

const today = () => new Date().toISOString().slice(0, 10);


function isFirstDayOfMonth(value: string) {
  return value.endsWith("-01");
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function makeLine(index: number): ConfigDraft["lines"][number] {
  return {
    id: null,
    localId: crypto.randomUUID(),
    milestoneNumber: index + 1,
    label: `Milestone ${index + 1}`,
    minRevenue: "",
    maxRevenue: "",
    commissionPercentage: "",
    sortOrder: index,
  };
}

function firstDayOfCreatedAtMonth(createdAt?: string | null): string {
  if (!createdAt) return today();
  return createdAt.slice(0, 7) + "-01";
}

function createDraft(config?: AgreementMilestoneConfig | null): ConfigDraft {
  const baseDate = firstDayOfCreatedAtMonth(config?.propertyCreatedAt);
  return {
    agreementConfigId: config?.agreementConfig?.id ?? null,
    agreementModelId: config?.agreementConfig?.agreementModelId ?? "",
    milestoneEnabled: config?.agreementConfig?.milestoneEnabled ?? false,
    rent: config?.agreementConfig?.rent?.toString() ?? "",
    effectiveFrom: config?.agreementConfig?.effectiveFrom ?? baseDate,
    effectiveTo: config?.agreementConfig?.effectiveTo ?? "",
    status: config?.agreementConfig?.status ?? "ACTIVE",
    setupId: config?.setup?.id ?? null,
    setupName: config?.setup?.name ?? "Default Milestone Setup",
    revenueBasis: config?.setup?.revenueBasis ?? "EXCL_BOOKING_GST",
    setupStatus: config?.setup?.status ?? "DRAFT",
    setupEffectiveFrom: config?.setup?.effectiveFrom ?? baseDate,
    setupEffectiveTo: config?.setup?.effectiveTo ?? "",
    lines:
      config?.lines?.map((line, index) => ({
        ...line,
        id: line.id ?? null,
        localId: line.id ?? crypto.randomUUID(),
        minRevenue: line.minRevenue?.toString() ?? "",
        maxRevenue: line.maxRevenue?.toString() ?? "",
        commissionPercentage: line.commissionPercentage?.toString() ?? "",
        sortOrder: line.sortOrder ?? index,
      })) ?? [],
  };
}

function parseOptionalAmount(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be non-negative.`);
  }
  return amount;
}

function parseRequiredAmount(value: string, label: string) {
  const amount = parseOptionalAmount(value, label);
  if (amount === null) throw new Error(`${label} is required.`);
  return amount;
}

export default function AgreementMilestoneSection({
  propertyId,
  onAgreementModelFlagsChange,
}: {
  propertyId: string;
  onAgreementModelFlagsChange?: (flags: {
    isRentBasisModel: boolean;
    isExpensesBasisModel: boolean;
    isFixedLeaseModel: boolean;
  }) => void;
}) {
  const [draft, setDraft] = useState<ConfigDraft>(createDraft(null));
  const [minEffectiveFrom, setMinEffectiveFrom] = useState<string | undefined>(undefined);
  const [models, setModels] = useState<AgreementModelOption[]>([]);
  const [trackers, setTrackers] = useState<MonthlyMilestoneTracker[]>([]);
  const [ledger, setLedger] = useState<MilestoneRevenueLedger[]>([]);
  const [hasBookingSnapshotReferences, setHasBookingSnapshotReferences] =
    useState(false);
  const [correctionMode, setCorrectionMode] = useState<
    "AGREEMENT" | "MILESTONE" | "OWNER_BLOCK_RENT" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModel = useMemo(
    () => models.find((model) => model.id === draft.agreementModelId),
    [models, draft.agreementModelId],
  );
  const isRentBasisModel = Boolean(selectedModel?.isRentBasisModel);
  const isVariableLease = selectedModel?.name === "VARIABLE_LEASE";
  const isFixedLeaseModel = selectedModel?.name === "FIXED_LEASE";
  const isExpensesBasisModel = Boolean(selectedModel?.isExpensesBasisModel);
  const canUseMilestone = Boolean(selectedModel && !isRentBasisModel);
  const effectiveFromValidationError =
    draft.effectiveFrom && !isFirstDayOfMonth(draft.effectiveFrom)
      ? `Effective date must be the first day of a month (e.g. ${draft.effectiveFrom.slice(0, 7)}-01).`
      : draft.effectiveFrom && minEffectiveFrom && draft.effectiveFrom < minEffectiveFrom
      ? `Cannot be before the property's start month (${minEffectiveFrom}).`
      : null;

  useEffect(() => {
    onAgreementModelFlagsChange?.({
      isRentBasisModel,
      isExpensesBasisModel,
      isFixedLeaseModel,
    });
  }, [
    isRentBasisModel,
    isExpensesBasisModel,
    isFixedLeaseModel,
    onAgreementModelFlagsChange,
  ]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [modelsResult, configResult, trackersResult, ledgerResult] =
        await Promise.all([
          getAgreementModelOptions(),
          getAgreementMilestoneConfig(propertyId),
          getMonthlyMilestoneTrackers(propertyId),
          getMilestoneRevenueLedger(propertyId),
        ]);

      setModels(modelsResult.data ?? []);
      const nextConfig = configResult.data ?? null;
      setDraft(createDraft(nextConfig));
      setMinEffectiveFrom(nextConfig?.propertyCreatedAt ?? undefined);
      setHasBookingSnapshotReferences(
        Boolean(nextConfig?.hasBookingSnapshotReferences),
      );
      setTrackers(trackersResult.data ?? []);
      setLedger(ledgerResult.data ?? []);

      // Each load is independent, so report every failure rather than only the
      // first — a masked error here is what made this panel undebuggable.
      const failures = [
        modelsResult.error,
        configResult.error,
        trackersResult.error,
        ledgerResult.error,
      ].filter((message): message is string => Boolean(message));
      for (const message of new Set(failures)) {
        toast.error(message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load agreement milestone data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [propertyId]);

  const updateLine = (
    localId: string,
    patch: Partial<ConfigDraft["lines"][number]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.localId === localId ? { ...line, ...patch } : line,
      ),
    }));
  };

  const addLine = () => {
    setDraft((prev) => ({
      ...prev,
      lines: [...prev.lines, makeLine(prev.lines.length)],
    }));
  };

  const deleteLine = (localId: string) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.localId !== localId),
    }));
  };

  const saveConfig = () => {
    if (!draft.agreementModelId) {
      toast.error("Select an agreement model first.");
      return;
    }
    if (effectiveFromValidationError) {
      toast.error(effectiveFromValidationError);
      return;
    }

    let payload: SaveAgreementMilestoneConfigInput;
    try {
      const milestoneEnabled = canUseMilestone && draft.milestoneEnabled;
      payload = {
        propertyId,
        agreementConfigId: draft.agreementConfigId,
        agreementModelId: draft.agreementModelId,
        milestoneEnabled,
        rent: (isRentBasisModel || isVariableLease)
          ? parseOptionalAmount(draft.rent, isVariableLease ? "Owner Rent" : "Rent")
          : null,
        effectiveFrom: draft.effectiveFrom,
        effectiveTo: draft.effectiveTo || null,
        status: draft.status,
        setup: milestoneEnabled
          ? {
              id: draft.setupId,
              name: draft.setupName,
              revenueBasis: draft.revenueBasis,
              status: draft.setupStatus,
              effectiveFrom: draft.setupEffectiveFrom,
              effectiveTo: draft.setupEffectiveTo || null,
            }
          : null,
        lines: milestoneEnabled
          ? draft.lines.map((line, index) => ({
              id: line.id,
              milestoneNumber: Number(line.milestoneNumber),
              label: line.label,
              minRevenue: parseRequiredAmount(
                line.minRevenue,
                `Min revenue for row ${index + 1}`,
              ),
              maxRevenue: parseOptionalAmount(
                line.maxRevenue,
                `Max revenue for row ${index + 1}`,
              ),
              commissionPercentage: parseRequiredAmount(
                line.commissionPercentage,
                `Commission for row ${index + 1}`,
              ),
              sortOrder: index,
            }))
          : [],
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid input.");
      return;
    }

    startTransition(() => {
      const promise = saveAgreementMilestoneConfig(payload).then(
        async (result) => {
          if (result.error) {
            setSaveError(result.error);
            throw new Error(result.error);
          }
          setSaveError(null);
          await refresh();
          return result;
        },
      );

      toast.promise(promise, {
        loading: "Saving agreement and milestone config...",
        success: "Agreement and milestone config saved.",
        error: (error) => (error as Error).message,
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <JarvisLoader size="md" />
      </div>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <SectionHeading
        title="Agreement & Milestone"
        description="Manage the property agreement configuration and review milestone month-end data."
        className="mb-0"
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-900/20">
        <Button
          type="button"
          size="xs"
          color="warning"
          onClick={() => setCorrectionMode("AGREEMENT")}
        >
          Correction Mode: Agreement/Rent
        </Button>
        <Button
          type="button"
          size="xs"
          color="warning"
          onClick={() => setCorrectionMode("MILESTONE")}
          disabled={!draft.milestoneEnabled || draft.lines.length === 0}
        >
          Correction Mode: Milestone Slabs
        </Button>
        <Button
          type="button"
          size="xs"
          color="warning"
          onClick={() => setCorrectionMode("OWNER_BLOCK_RENT")}
        >
          Correction Mode: Owner Block Rent
        </Button>
      </div>

      <RestatementPreviewModal
        propertyId={propertyId}
        mode={correctionMode}
        open={Boolean(correctionMode)}
        onClose={() => setCorrectionMode(null)}
        onApplied={refresh}
        agreementModels={models}
        currentAgreementModelId={draft.agreementModelId}
        currentRent={draft.rent}
        milestonePayload={{
          name: draft.setupName,
          revenueBasis: draft.revenueBasis,
          lines: draft.lines.map((line, index) => ({
            milestoneNumber: Number(line.milestoneNumber),
            label: line.label,
            minRevenue: Number(line.minRevenue || 0),
            maxRevenue: line.maxRevenue ? Number(line.maxRevenue) : null,
            commissionPercentage: Number(line.commissionPercentage || 0),
            sortOrder: index,
          })),
        }}
      />

      <Tabs>
        <TabItem title="Config">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <h6 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Agreement Config
              </h6>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agreement Model</label>
                  <Select
                    value={draft.agreementModelId}
                    onChange={(event) => {
                      const agreementModelId = event.target.value;
                      const nextModel = models.find(
                        (model) => model.id === agreementModelId,
                      );
                      const nextIsRentBasisModel = Boolean(
                        nextModel?.isRentBasisModel,
                      );
                      const nextIsVariableLease =
                        nextModel?.name === "VARIABLE_LEASE";
                      setDraft({
                        ...draft,
                        agreementModelId,
                        rent:
                          nextIsRentBasisModel || nextIsVariableLease
                            ? draft.rent
                            : "",
                        milestoneEnabled: nextIsRentBasisModel
                          ? false
                          : draft.milestoneEnabled,
                      });
                    }}
                  >
                    <option value="">Select model</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.code})
                      </option>
                    ))}
                  </Select>
                  {selectedModel?.description ? (
                    <p className="text-xs text-slate-500">
                      {selectedModel.description}
                    </p>
                  ) : null}
                </div>

                {(isRentBasisModel || isVariableLease) ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {isVariableLease ? "Owner Rent (₹/month)" : "Rent (Fixed)"}
                    </label>
                    <TextInput
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.rent}
                      onChange={(event) =>
                        setDraft({ ...draft, rent: event.target.value })
                      }
                      placeholder="0.00"
                    />
                    {isVariableLease ? (
                      <p className="text-xs text-slate-500">
                        Fixed monthly rent payable to the owner under Variable Lease.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Effective From</label>
                  <TextInput
                    type="date"
                    min={minEffectiveFrom}
                    color={effectiveFromValidationError ? "failure" : undefined}
                    value={draft.effectiveFrom}
                    onChange={(event) =>
                      setDraft({ ...draft, effectiveFrom: event.target.value })
                    }
                  />
                  {effectiveFromValidationError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {effectiveFromValidationError}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Must be the 1st of a month.
                      {minEffectiveFrom ? ` Earliest: ${minEffectiveFrom}.` : ""}
                      {hasBookingSnapshotReferences
                        ? " Already referenced by booking snapshots."
                        : ""}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Effective To</label>
                  <TextInput
                    type="date"
                    value={draft.effectiveTo}
                    onChange={(event) =>
                      setDraft({ ...draft, effectiveTo: event.target.value })
                    }
                  />
                </div>

                {canUseMilestone ? (
                  <label className="flex items-center gap-2 pt-8 text-sm font-medium">
                    <Checkbox
                      checked={draft.milestoneEnabled}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          milestoneEnabled: event.target.checked,
                        })
                      }
                    />
                    Milestone allowed
                  </label>
                ) : null}
              </div>
            </div>

            {canUseMilestone && draft.milestoneEnabled ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h6 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                    Milestone Setup
                  </h6>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Setup Name</label>
                      <TextInput
                        value={draft.setupName}
                        onChange={(event) =>
                          setDraft({ ...draft, setupName: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Revenue Basis
                      </label>
                      <Select
                        value={draft.revenueBasis}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            revenueBasis: event.target
                              .value as MilestoneRevenueBasis,
                          })
                        }
                      >
                        {MILESTONE_REVENUE_BASIS_OPTIONS.map((basis) => (
                          <option key={basis} value={basis}>
                            {labelize(basis)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Setup Status
                      </label>
                      <Select
                        value={draft.setupStatus}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            setupStatus: event.target
                              .value as MilestoneSetupStatus,
                          })
                        }
                      >
                        {MILESTONE_SETUP_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Effective From
                      </label>
                      <TextInput
                        type="date"
                        value={draft.setupEffectiveFrom}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            setupEffectiveFrom: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Effective To
                      </label>
                      <TextInput
                        type="date"
                        value={draft.setupEffectiveTo}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            setupEffectiveTo: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <h6 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Milestone Lines
                    </h6>
                    <Button type="button" size="xs" onClick={addLine}>
                      <HiPlus className="mr-2" />
                      Add Line
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeadCell>No.</TableHeadCell>
                          <TableHeadCell>Label</TableHeadCell>
                          <TableHeadCell>Min Revenue</TableHeadCell>
                          <TableHeadCell>Max Revenue</TableHeadCell>
                          <TableHeadCell>Commission %</TableHeadCell>
                          <TableHeadCell>Action</TableHeadCell>
                        </TableRow>
                      </TableHead>
                      <TableBody className="divide-y">
                        {draft.lines.map((line, index) => (
                          <TableRow key={line.localId}>
                            <TableCell>
                              <TextInput
                                type="number"
                                min={1}
                                value={line.milestoneNumber}
                                onChange={(event) =>
                                  updateLine(line.localId, {
                                    milestoneNumber: Number(event.target.value),
                                  })
                                }
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <TextInput
                                value={line.label}
                                onChange={(event) =>
                                  updateLine(line.localId, {
                                    label: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <TextInput
                                type="number"
                                min={0}
                                step="0.01"
                                value={line.minRevenue}
                                onChange={(event) =>
                                  updateLine(line.localId, {
                                    minRevenue: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <TextInput
                                type="number"
                                min={0}
                                step="0.01"
                                value={line.maxRevenue}
                                onChange={(event) =>
                                  updateLine(line.localId, {
                                    maxRevenue: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <TextInput
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={line.commissionPercentage}
                                onChange={(event) =>
                                  updateLine(line.localId, {
                                    commissionPercentage: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="xs"
                                color="failure"
                                onClick={() => deleteLine(line.localId)}
                              >
                                <HiTrash />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {draft.lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">
                              No milestone lines added.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : null}

            {saveError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300"
              >
                <span className="font-semibold">Could not save: </span>
                {saveError}
              </div>
            ) : null}

            <Button type="button" disabled={isPending} onClick={saveConfig}>
              {isPending ? "Saving..." : "Save Config"}
            </Button>
          </div>
        </TabItem>

        <TabItem title="Tracker">
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Month</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Revenue With GST</TableHeadCell>
                  <TableHeadCell>Revenue Without GST</TableHeadCell>
                  <TableHeadCell>Commission Base</TableHeadCell>
                  <TableHeadCell>Commission Charged</TableHeadCell>
                  <TableHeadCell>Owner Credit</TableHeadCell>
                  <TableHeadCell>Final Rate</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {trackers.map((tracker) => (
                  <TableRow key={tracker.id}>
                    <TableCell>{tracker.month}</TableCell>
                    <TableCell>
                      <Badge color="info" className="w-fit">
                        {tracker.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{money(tracker.revenueWithGst)}</TableCell>
                    <TableCell>{money(tracker.revenueWithoutGst)}</TableCell>
                    <TableCell>
                      {money(tracker.commissionableBaseTotal)}
                    </TableCell>
                    <TableCell>{money(tracker.commissionCharged)}</TableCell>
                    <TableCell>{money(tracker.ownerCreditAmount)}</TableCell>
                    <TableCell>
                      {tracker.finalCommissionRate ??
                        tracker.provisionalCommissionRate ??
                        "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
                {trackers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No monthly milestone tracker rows found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabItem>

        <TabItem title="Ledger">
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Month</TableHeadCell>
                  <TableHeadCell>Entry</TableHeadCell>
                  <TableHeadCell>Source</TableHeadCell>
                  <TableHeadCell>Incl GST</TableHeadCell>
                  <TableHeadCell>Excl GST</TableHeadCell>
                  <TableHeadCell>Notional</TableHeadCell>
                  <TableHeadCell>Description</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.month}</TableCell>
                    <TableCell>
                      <Badge
                        color={
                          entry.entryType === "CREDIT" ? "success" : "warning"
                        }
                        className="w-fit"
                      >
                        {entry.entryType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {labelize(entry.sourceType)}
                      <div className="font-mono text-xs text-slate-500">
                        {entry.sourceId}
                      </div>
                    </TableCell>
                    <TableCell>{money(entry.revenueAmountInclGst)}</TableCell>
                    <TableCell>{money(entry.revenueAmountExclGst)}</TableCell>
                    <TableCell>
                      {entry.notionalDays
                        ? `${entry.notionalDays} × ${money(entry.notionalRatePerDay)}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {entry.description ?? entry.blockReason ?? "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
                {ledger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No milestone ledger rows found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabItem>

        <TabItem title="Corrections">
          <PropertyCorrectionHistoryPanel propertyId={propertyId} />
        </TabItem>
      </Tabs>
    </section>
  );
}
