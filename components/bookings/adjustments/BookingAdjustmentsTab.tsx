"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { HiPlus } from "react-icons/hi";

import {
  BookingAdjustment,
  BookingAdjustmentReason,
  BookingAdjustmentType,
  createBookingAdjustment,
  getBookingAdjustments,
} from "@/actions/bookingAdjustmentActions";
import {
  Accordion,
  AccordionContent,
  AccordionPanel,
  AccordionTitle,
  Badge,
  Button,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

type DraftState = {
  adjustmentType: BookingAdjustmentType;
  adjustmentReason: BookingAdjustmentReason;
  grossAmountInclGst: string;
  adjustmentDate: string;
  description: string;
};

const reasonOptions: BookingAdjustmentReason[] = [
  "EXTRA_GUEST",
  "SERVICE_FAILURE",
  "PRICE_CORRECTION",
  "MILESTONE_ADJUSTMENT",
  "MANUAL",
  "OTHER",
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): DraftState => ({
  adjustmentType: "POSITIVE",
  adjustmentReason: "MANUAL",
  grossAmountInclGst: "",
  adjustmentDate: today(),
  description: "",
});

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getMetadataNumber(adjustment: BookingAdjustment | null, key: string) {
  const value = adjustment?.metadata?.[key];
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function DetailMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export default function BookingAdjustmentsTab({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<BookingAdjustment[]>([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await getBookingAdjustments(bookingId);
      setAdjustments(rows);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load adjustments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [bookingId]);

  const saveDraft = () => {
    if (!draft) return;
    const amount = Number(draft.grossAmountInclGst);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid adjustment amount.");
      return;
    }

    startTransition(() => {
      const savePromise = createBookingAdjustment(bookingId, {
        adjustmentType: draft.adjustmentType,
        adjustmentReason: draft.adjustmentReason,
        grossAmountInclGst: amount,
        adjustmentDate: draft.adjustmentDate,
        description: draft.description.trim() || null,
      }).then(async () => {
        setDraft(null);
        await refresh();
        router.refresh();
      });

      toast.promise(savePromise, {
        loading: "Creating booking adjustment...",
        success: "Booking adjustment posted.",
        error: (error) => (error as Error).message,
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-8">
      <section className="rounded-[26px] border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
              Booking Finance
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Adjustments
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Add positive or negative GST-inclusive adjustments for this
              booking and review the posted breakup.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={loading || isPending}
            onClick={() => setDraft(emptyDraft())}
          >
            <HiPlus className="mr-2" />
            Create
          </Button>
        </div>

        {draft ? (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Type
                </label>
                <Select
                  value={draft.adjustmentType}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      adjustmentType: event.target
                        .value as BookingAdjustmentType,
                    })
                  }
                >
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Reason
                </label>
                <Select
                  value={draft.adjustmentReason}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      adjustmentReason: event.target
                        .value as BookingAdjustmentReason,
                    })
                  }
                >
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {labelize(reason)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Amount Incl. GST
                </label>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.grossAmountInclGst}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      grossAmountInclGst: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Date
                </label>
                <TextInput
                  type="date"
                  value={draft.adjustmentDate}
                  onChange={(event) =>
                    setDraft({ ...draft, adjustmentDate: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description
                </label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={saveDraft}
              >
                Post Adjustment
              </Button>
              <Button
                type="button"
                size="sm"
                color="light"
                disabled={isPending}
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <JarvisLoader size="md" />
          </div>
        ) : adjustments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
            No adjustments have been created for this booking yet.
          </div>
        ) : (
          <Accordion collapseAll className="mt-6">
            {adjustments.map((adjustment) => (
              <AccordionPanel key={adjustment.id}>
                <AccordionTitle>
                  <div className="flex w-full flex-col gap-3 text-left md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        color={
                          adjustment.adjustmentType === "POSITIVE"
                            ? "success"
                            : "failure"
                        }
                        className="w-fit"
                      >
                        {adjustment.adjustmentType}
                      </Badge>
                      <Badge color="gray" className="w-fit">
                        {adjustment.status}
                      </Badge>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {labelize(adjustment.adjustmentReason)}
                      </span>
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                        {formatDate(adjustment.adjustmentDate)}
                      </span>
                    </div>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">
                      {formatMoney(adjustment.grossAmountInclGst)}
                    </span>
                  </div>
                </AccordionTitle>
                <AccordionContent>
                  <div className="space-y-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Adjustment Detail
                        </h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {adjustment.description || "No description"}
                        </p>
                      </div>
                      <Badge
                        color={
                          adjustment.adjustmentType === "POSITIVE"
                            ? "success"
                            : "failure"
                        }
                        className="w-fit"
                      >
                        {adjustment.adjustmentType}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <DetailMetric
                        label="Gross Amount Incl. GST"
                        value={formatMoney(adjustment.grossAmountInclGst)}
                      />
                      <DetailMetric
                        label="Amount Excl. Booking GST"
                        value={formatMoney(adjustment.amountExclBookingGst)}
                      />
                      <DetailMetric
                        label="Booking GST"
                        value={`${formatMoney(adjustment.bookingGstAmount)} (${Number(
                          adjustment.bookingGstRate ?? 0,
                        ).toFixed(2)}%)`}
                      />
                      <DetailMetric
                        label="Commission"
                        value={`${formatMoney(adjustment.commissionAmount)} (${Number(
                          adjustment.commissionRate ?? 0,
                        ).toFixed(2)}%)`}
                      />
                      <DetailMetric
                        label="Owner Share Before TDS"
                        value={formatMoney(adjustment.ownerShare)}
                      />
                      <DetailMetric
                        label="TDS"
                        value={`${formatMoney(
                          getMetadataNumber(adjustment, "tdsAmount"),
                        )} (${Number(
                          getMetadataNumber(adjustment, "tdsPercentage"),
                        ).toFixed(2)}%)`}
                      />
                      <DetailMetric
                        label="Owner Net Impact"
                        value={formatMoney(
                          getMetadataNumber(adjustment, "ownerNetImpact"),
                        )}
                      />
                      <DetailMetric
                        label="Milestone"
                        value={
                          adjustment.affectsMilestoneRevenue
                            ? adjustment.milestoneTrackerId
                              ? "Updated"
                              : "Applicable"
                            : "Not applicable"
                        }
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionPanel>
            ))}
          </Accordion>
        )}
      </section>
    </div>
  );
}
