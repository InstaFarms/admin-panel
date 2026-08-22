"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiPlus, HiTrash } from "react-icons/hi";

import {
  createNotionalRevenueConfig,
  deleteNotionalRevenueConfig,
  getAvailableBlockingReasonsForNotionalRevenue,
  getNotionalRevenueConfigs,
  updateNotionalRevenueConfig,
} from "@/actions/notionalRevenueConfigActions";
import type {
  BlockingReasonOption,
  NotionalRevenueConfig,
  NotionalRevenueConfigInput,
} from "@/actions/notionalRevenueConfigActions";
import {
  NOTIONAL_REVENUE_WEEKDAYS,
  type NotionalRevenueWeekday,
} from "@/constants/propertyCommercialConfig";
import SectionHeading from "@/components/properties/SectionHeading";
import {
  Button,
  Checkbox,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

type DraftState = {
  id?: string;
  step: 1 | 2;
  typeName: string;
  typeId: string;
  description: string;
  isMilestoneRevenueApplicable: boolean;
  status: "ACTIVE" | "INACTIVE";
  weekdayPrices: Record<NotionalRevenueWeekday, string>;
};

const defaultWeekdayPrices = () =>
  NOTIONAL_REVENUE_WEEKDAYS.reduce(
    (acc, weekday) => ({ ...acc, [weekday]: "" }),
    {} as Record<NotionalRevenueWeekday, string>,
  );

const createEmptyDraft = (): DraftState => ({
  step: 1,
  typeName: "",
  typeId: "",
  description: "",
  isMilestoneRevenueApplicable: true,
  status: "ACTIVE",
  weekdayPrices: defaultWeekdayPrices(),
});

function toLabel(weekday: string) {
  return weekday.charAt(0) + weekday.slice(1).toLowerCase();
}

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

const accentStyles = [
  {
    border: "border-cyan-300/70 dark:border-cyan-700/70",
    bg: "bg-cyan-50/80 dark:bg-cyan-950/30",
    text: "text-cyan-800 dark:text-cyan-200",
    chip: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200",
  },
  {
    border: "border-emerald-300/70 dark:border-emerald-700/70",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    text: "text-emerald-800 dark:text-emerald-200",
    chip:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  },
  {
    border: "border-amber-300/70 dark:border-amber-700/70",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    text: "text-amber-800 dark:text-amber-200",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  },
  {
    border: "border-rose-300/70 dark:border-rose-700/70",
    bg: "bg-rose-50/80 dark:bg-rose-950/30",
    text: "text-rose-800 dark:text-rose-200",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  },
];

function getPriceForWeekday(
  config: NotionalRevenueConfig,
  weekday: NotionalRevenueWeekday,
) {
  return config.weekdayPrices.find((price) => price?.weekday === weekday);
}

function createDraftFromConfig(config: NotionalRevenueConfig): DraftState {
  const prices = defaultWeekdayPrices();
  for (const weekday of NOTIONAL_REVENUE_WEEKDAYS) {
    prices[weekday] =
      getPriceForWeekday(config, weekday)?.notionalAmount?.toString() ?? "";
  }

  return {
    id: config.id,
    step: 1,
    typeName: config.typeName,
    typeId: config.typeId,
    description: config.description ?? "",
    isMilestoneRevenueApplicable: config.isMilestoneRevenueApplicable,
    status: config.status,
    weekdayPrices: prices,
  };
}

export default function NotionalRevenueConfigSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [configs, setConfigs] = useState<NotionalRevenueConfig[]>([]);
  const [blockingReasons, setBlockingReasons] = useState<
    BlockingReasonOption[]
  >([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const selectedReason = useMemo(
    () => blockingReasons.find((reason) => reason.id === draft?.typeId),
    [blockingReasons, draft?.typeId],
  );

  const refresh = async (currentTypeId?: string | null) => {
    setLoading(true);
    try {
      const [nextConfigs, nextBlockingReasons] = await Promise.all([
        getNotionalRevenueConfigs(propertyId),
        getAvailableBlockingReasonsForNotionalRevenue(
          propertyId,
          currentTypeId,
        ),
      ]);
      setConfigs(nextConfigs);
      setBlockingReasons(nextBlockingReasons);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load notional revenue config",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [propertyId]);

  const beginCreate = async () => {
    const emptyDraft = createEmptyDraft();
    setDraft(emptyDraft);
    await refresh();
  };

  const beginEdit = async (config: NotionalRevenueConfig) => {
    setDraft(createDraftFromConfig(config));
    await refresh(config.typeId);
  };

  const handleDelete = (config: NotionalRevenueConfig) => {
    if (!window.confirm("Delete this notional revenue config?")) return;

    startTransition(() => {
      const deletePromise = deleteNotionalRevenueConfig(config.id).then(
        async () => {
          setDraft(null);
          await refresh();
        },
      );

      toast.promise(deletePromise, {
        loading: "Deleting notional revenue config...",
        success: "Notional revenue config deleted.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const goToPrices = () => {
    if (!draft?.typeId) {
      toast.error("Select a blocking reason first.");
      return;
    }
    if (!draft.typeName.trim()) {
      toast.error("Enter type name first.");
      return;
    }
    setDraft({ ...draft, step: 2 });
  };

  const saveDraft = () => {
    if (!draft) return;

    const weekdayPrices: NotionalRevenueConfigInput["weekdayPrices"] = [];
    for (const weekday of NOTIONAL_REVENUE_WEEKDAYS) {
      const amount = Number(draft.weekdayPrices[weekday]);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error(`Enter a valid amount for ${toLabel(weekday)}.`);
        return;
      }
      weekdayPrices.push({
        weekday,
        notionalAmount: amount,
        currency: "INR",
        status: "ACTIVE" as const,
      });
    }

    const payload = {
      typeName: draft.typeName.trim(),
      typeId: draft.typeId,
      description: draft.description.trim() || null,
      isMilestoneRevenueApplicable: draft.isMilestoneRevenueApplicable,
      status: draft.status,
      weekdayPrices,
    };

    startTransition(() => {
      const savePromise = (
        draft.id
          ? updateNotionalRevenueConfig(draft.id, payload)
          : createNotionalRevenueConfig({ propertyId, ...payload })
      ).then(async () => {
        setDraft(null);
        await refresh();
      });

      toast.promise(savePromise, {
        loading: draft.id
          ? "Updating notional revenue config..."
          : "Creating notional revenue config...",
        success: draft.id
          ? "Notional revenue config updated."
          : "Notional revenue config created.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const canCreate = blockingReasons.length > 0;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeading
          title="Notional Revenue Config"
          description="Configure Mago-only notional revenue for blocking reasons and weekday amounts."
          className="mb-0"
        />
        <Button
          type="button"
          size="sm"
          disabled={loading || isPending || !canCreate}
          onClick={beginCreate}
        >
          <HiPlus className="mr-2" />
          Create
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <JarvisLoader size="md" />
        </div>
      ) : (
        <>
          {!canCreate && !draft ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Every active blocking reason already has a notional revenue config
              for this property.
            </p>
          ) : null}

          {draft ? (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 transition-all duration-200 dark:border-cyan-800/70 dark:bg-cyan-950/20">
              <div className="mb-4 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {draft.id ? "Edit Config" : "Create Config"} · Step{" "}
                  {draft.step} of 2
                </h6>
                <Button
                  type="button"
                  size="xs"
                  color="light"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
              </div>

              {draft.step === 1 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Blocking Reason
                    </label>
                    <Select
                      value={draft.typeId}
                      onChange={(event) => {
                        const reason = blockingReasons.find(
                          (item) => item.id === event.target.value,
                        );
                        setDraft({
                          ...draft,
                          typeId: event.target.value,
                          typeName: draft.typeName || reason?.reason || "",
                        });
                      }}
                    >
                      <option value="">Select reason</option>
                      {blockingReasons.map((reason) => (
                        <option key={reason.id} value={reason.id}>
                          {reason.reason}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Type Name
                    </label>
                    <TextInput
                      value={draft.typeName}
                      onChange={(event) =>
                        setDraft({ ...draft, typeName: event.target.value })
                      }
                      placeholder={selectedReason?.reason ?? "Type name"}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Description
                    </label>
                    <Textarea
                      rows={3}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          description: event.target.value,
                        })
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Checkbox
                      checked={draft.isMilestoneRevenueApplicable}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          isMilestoneRevenueApplicable: event.target.checked,
                        })
                      }
                    />
                    Milestone revenue applicable
                  </label>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Status
                    </label>
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

                  <div className="md:col-span-2">
                    <Button type="button" onClick={goToPrices}>
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {NOTIONAL_REVENUE_WEEKDAYS.map((weekday) => (
                      <div key={weekday} className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {toLabel(weekday)}
                        </label>
                        <TextInput
                          type="number"
                          min={0}
                          step="0.01"
                          value={draft.weekdayPrices[weekday]}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              weekdayPrices: {
                                ...draft.weekdayPrices,
                                [weekday]: event.target.value,
                              },
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      color="light"
                      onClick={() => setDraft({ ...draft, step: 1 })}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={saveDraft}
                    >
                      {isPending ? "Saving..." : draft.id ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {configs.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {configs.map((config, index) => {
                  const accent = accentStyles[index % accentStyles.length];
                  return (
                    <div
                      key={config.id}
                      className={`rounded-2xl border ${accent.border} ${accent.bg} p-4`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-semibold ${accent.text}`}>
                            {config.blockingReason}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {config.description || "No description"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            size="xs"
                            color="light"
                            onClick={() => beginEdit(config)}
                          >
                            <HiPencil />
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            color="failure"
                            onClick={() => handleDelete(config)}
                          >
                            <HiTrash />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accent.chip}`}
                        >
                          {config.status}
                        </span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-700">
                          Milestone{" "}
                          {config.isMilestoneRevenueApplicable ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/30">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Weekday Notional Amounts
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Amounts are grouped by blocking reason.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell className="min-w-[150px] bg-slate-50 dark:bg-slate-900">
                          Weekday
                        </TableHeadCell>
                        {configs.map((config, index) => {
                          const accent =
                            accentStyles[index % accentStyles.length];
                          return (
                            <TableHeadCell
                              key={config.id}
                              className={`min-w-[190px] border-l ${accent.border} ${accent.bg}`}
                            >
                              <div className="space-y-1">
                                <div className={accent.text}>
                                  {config.blockingReason}
                                </div>
                                <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                  {config.typeName}
                                </div>
                              </div>
                            </TableHeadCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y">
                      {NOTIONAL_REVENUE_WEEKDAYS.map((weekday) => (
                        <TableRow
                          key={weekday}
                          className="bg-white dark:border-slate-800 dark:bg-slate-950/20"
                        >
                          <TableCell className="font-semibold text-slate-900 dark:text-white">
                            {toLabel(weekday)}
                          </TableCell>
                          {configs.map((config, index) => {
                            const price = getPriceForWeekday(config, weekday);
                            const accent =
                              accentStyles[index % accentStyles.length];
                            return (
                              <TableCell
                                key={`${config.id}-${weekday}`}
                                className={`border-l ${accent.border}`}
                              >
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {price
                                    ? formatMoney(price.notionalAmount)
                                    : "N/A"}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No notional revenue config has been created for this property.
            </div>
          )}
        </>
      )}
    </section>
  );
}
