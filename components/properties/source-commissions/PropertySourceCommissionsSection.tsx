"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiPlus, HiTrash } from "react-icons/hi";

import type { CommissionBookingSource } from "@/actions/sourceCommissionActions";
import {
  createPropertyCommissionSourceRule,
  deletePropertyCommissionSourceRule,
  getAvailableCommissionBookingSourcesForProperty,
  getPropertyCommissionSourceRules,
  updatePropertyCommissionSourceRule,
} from "@/actions/propertyCommissionRuleActions";
import type {
  PropertyCommissionSourceRule,
  PropertyCommissionSourceRuleInput,
} from "@/actions/propertyCommissionRuleActions";
import type {
  BookingSourceGroup,
  CommissionBase,
  CommissionType,
} from "@/constants/propertyCommercialConfig";
import {
  BOOKING_SOURCE_GROUP_OPTIONS,
  COMMISSION_BASE_OPTIONS,
  COMMISSION_TYPE_OPTIONS,
} from "@/constants/propertyCommercialConfig";
import SectionHeading from "@/components/properties/SectionHeading";
import {
  Badge,
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

type DraftState = {
  id?: string;
  commissionBookingSourceId: string;
  bookingSourceGroup: BookingSourceGroup;
  commissionType: CommissionType;
  commissionValue: string;
  commissionBase: CommissionBase;
  isActive: boolean;
};

const emptyDraft = (): DraftState => ({
  commissionBookingSourceId: "",
  bookingSourceGroup: "DIRECT_BOOKING",
  commissionType: "PERCENTAGE",
  commissionValue: "",
  commissionBase: "BOOKING_AMOUNT_EXCL_GST",
  isActive: true,
});

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function draftFromRule(rule: PropertyCommissionSourceRule): DraftState {
  return {
    id: rule.id,
    commissionBookingSourceId: rule.commissionBookingSourceId ?? "",
    bookingSourceGroup: rule.bookingSourceGroup,
    commissionType: rule.commissionType,
    commissionValue: String(rule.commissionValue ?? ""),
    commissionBase: rule.commissionBase,
    isActive: rule.isActive,
  };
}

export default function PropertySourceCommissionsSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [rules, setRules] = useState<PropertyCommissionSourceRule[]>([]);
  const [sources, setSources] = useState<CommissionBookingSource[]>([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const selectedSource = useMemo(
    () =>
      sources.find((source) => source.id === draft?.commissionBookingSourceId),
    [sources, draft?.commissionBookingSourceId],
  );

  const refresh = async (currentSourceId?: string | null) => {
    setLoading(true);
    try {
      const [nextRules, nextSources] = await Promise.all([
        getPropertyCommissionSourceRules(propertyId),
        getAvailableCommissionBookingSourcesForProperty(
          propertyId,
          currentSourceId,
        ),
      ]);
      setRules(nextRules);
      setSources(nextSources);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load source commission rules",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [propertyId]);

  const beginCreate = async () => {
    setDraft(emptyDraft());
    await refresh();
  };

  const beginEdit = async (rule: PropertyCommissionSourceRule) => {
    setDraft(draftFromRule(rule));
    await refresh(rule.commissionBookingSourceId);
  };

  const handleDelete = (rule: PropertyCommissionSourceRule) => {
    if (!window.confirm("Delete this property commission rule?")) return;

    startTransition(() => {
      const deletePromise = deletePropertyCommissionSourceRule(rule.id).then(
        async () => {
          setDraft(null);
          await refresh();
        },
      );

      toast.promise(deletePromise, {
        loading: "Deleting source commission rule...",
        success: "Source commission rule deleted.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.commissionBookingSourceId) {
      toast.error("Select a source first.");
      return;
    }

    const amount = Number(draft.commissionValue);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid commission value.");
      return;
    }

    const payload: Omit<PropertyCommissionSourceRuleInput, "propertyId"> = {
      commissionBookingSourceId: draft.commissionBookingSourceId,
      bookingSourceGroup: draft.bookingSourceGroup,
      commissionType: draft.commissionType,
      commissionValue: amount,
      commissionBase: draft.commissionBase,
      isActive: draft.isActive,
    };

    startTransition(() => {
      const savePromise = (
        draft.id
          ? updatePropertyCommissionSourceRule(draft.id, payload)
          : createPropertyCommissionSourceRule({ propertyId, ...payload })
      ).then(async () => {
        setDraft(null);
        await refresh();
      });

      toast.promise(savePromise, {
        loading: draft.id
          ? "Updating source commission rule..."
          : "Creating source commission rule...",
        success: draft.id
          ? "Source commission rule updated."
          : "Source commission rule created.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const canCreate = sources.length > 0;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeading
          title="SourceCommissions"
          description="Configure property commission values for globally managed booking sources."
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
              Every active commission source already has a rule for this
              property, or no active source exists yet.
            </p>
          ) : null}

          {draft ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 transition-all duration-200 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="mb-4 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {draft.id ? "Edit Rule" : "Create Rule"}
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

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Source
                  </label>
                  <Select
                    value={draft.commissionBookingSourceId}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        commissionBookingSourceId: event.target.value,
                      })
                    }
                  >
                    <option value="">Select source</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.sourceName} ({source.sourceCode})
                      </option>
                    ))}
                  </Select>
                  {selectedSource?.description ? (
                    <p className="text-xs text-slate-500">
                      {selectedSource.description}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Booking Source Group
                  </label>
                  <Select
                    value={draft.bookingSourceGroup}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        bookingSourceGroup: event.target
                          .value as BookingSourceGroup,
                      })
                    }
                  >
                    {BOOKING_SOURCE_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>
                        {labelize(group)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Commission Type
                  </label>
                  <Select
                    value={draft.commissionType}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        commissionType: event.target.value as CommissionType,
                      })
                    }
                  >
                    {COMMISSION_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {labelize(type)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Commission Value
                  </label>
                  <TextInput
                    type="number"
                    min={0}
                    max={
                      draft.commissionType === "PERCENTAGE" ? 100 : undefined
                    }
                    step="0.01"
                    value={draft.commissionValue}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        commissionValue: event.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Commission Base
                  </label>
                  <Select
                    value={draft.commissionBase}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        commissionBase: event.target.value as CommissionBase,
                      })
                    }
                  >
                    {COMMISSION_BASE_OPTIONS.map((base) => (
                      <option key={base} value={base}>
                        {labelize(base)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Status
                  </label>
                  <Select
                    value={draft.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        isActive: event.target.value === "ACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Button type="button" disabled={isPending} onClick={saveDraft}>
                  {isPending ? "Saving..." : draft.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Source</TableHeadCell>
                  <TableHeadCell>Group</TableHeadCell>
                  <TableHeadCell>Commission</TableHeadCell>
                  <TableHeadCell>Base</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {rules.length > 0 ? (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-semibold">
                        {rule.sourceName ?? "Legacy source"}
                        <div className="font-mono text-xs font-normal text-slate-500">
                          {rule.sourceCode ?? "No source linked"}
                        </div>
                      </TableCell>
                      <TableCell>{labelize(rule.bookingSourceGroup)}</TableCell>
                      <TableCell>
                        {rule.commissionValue}
                        {rule.commissionType === "PERCENTAGE" ? "%" : " INR"}
                      </TableCell>
                      <TableCell>{labelize(rule.commissionBase)}</TableCell>
                      <TableCell>
                        <Badge
                          color={rule.isActive ? "success" : "gray"}
                          className="w-fit"
                        >
                          {rule.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="xs"
                            color="light"
                            onClick={() => beginEdit(rule)}
                          >
                            <HiPencil />
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            color="failure"
                            onClick={() => handleDelete(rule)}
                          >
                            <HiTrash />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-4 text-center text-slate-500"
                    >
                      No source commission rules configured for this property.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
