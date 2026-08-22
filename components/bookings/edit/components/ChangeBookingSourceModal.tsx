"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiArrowsRightLeft } from "react-icons/hi2";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  Textarea,
} from "flowbite-react";

import {
  changeBookingSourceForCorrection,
  getActiveBookingSourcesForCorrection,
  getSourceChangePreview,
  type ActiveBookingSourceOption,
} from "@/actions/bookingFinanceRevisionActions";

type ChangeBookingSourceModalProps = {
  bookingId: string;
  currentSourceId?: string | null;
  currentSourceLabel?: string | null;
  disabled?: boolean;
  onChanged?: () => Promise<void> | void;
};

function formatSourceLabel(source: ActiveBookingSourceOption) {
  return `${source.name} - ${source.sourceCategory.replaceAll("_", " ")}`;
}

export default function ChangeBookingSourceModal({
  bookingId,
  currentSourceId,
  currentSourceLabel,
  disabled,
  onChanged,
}: ChangeBookingSourceModalProps) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<ActiveBookingSourceOption[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  );

  useEffect(() => {
    if (!open) return;

    setLoadingSources(true);
    getActiveBookingSourcesForCorrection()
      .then((data) => {
        setSources(data);
        setSelectedSourceId((current) => {
          if (current) return current;
          if (
            currentSourceId &&
            data.some((source) => source.id === currentSourceId)
          ) {
            return currentSourceId;
          }
          return data[0]?.id ?? "";
        });
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load booking sources",
        );
      })
      .finally(() => setLoadingSources(false));
  }, [currentSourceId, open]);

  const close = () => {
    if (isPending) return;
    setOpen(false);
    setReason("");
    setPreview(null);
  };

  const previewImpact = async () => {
    if (!selectedSourceId) {
      toast.error("Select the corrected booking source.");
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await getSourceChangePreview({
        bookingId,
        newBookingSourceId: selectedSourceId,
      });
      setPreview(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to preview source change",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = () => {
    if (!selectedSourceId) {
      toast.error("Select the corrected booking source.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }
    if (!preview) {
      toast.error("Preview impact before confirming.");
      return;
    }

    startTransition(async () => {
      const result = await changeBookingSourceForCorrection({
        bookingId,
        newBookingSourceId: selectedSourceId,
        reason,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success || "Booking source updated.");
      setOpen(false);
      setReason("");
      setPreview(null);
      await onChanged?.();
    });
  };

  return (
    <>
      <Button
        type="button"
        size="xs"
        color="light"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <HiArrowsRightLeft className="mr-2" />
        Change Source
      </Button>

      <Modal show={open} onClose={close} size="lg">
        <ModalHeader>Change Booking Source</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
              Finance ledgers, owner wallet, settlement, and milestone tracker
              entries will be adjusted using append-only correction rows.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Current Source
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {currentSourceLabel || "N/A"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  New Source
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedSource ? formatSourceLabel(selectedSource) : "N/A"}
                </div>
              </div>
            </div>

            <div>
              <Label
                htmlFor="booking-source-correction-source"
              >
                Correct booking source
              </Label>
              {loadingSources ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Spinner size="sm" />
                  Loading sources...
                </div>
              ) : (
                <Select
                  id="booking-source-correction-source"
                  className="mt-2"
                  value={selectedSourceId}
                  onChange={(event) => {
                    setSelectedSourceId(event.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {formatSourceLabel(source)}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Finance impact
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Preview writes nothing. Confirm after reviewing the diff.
                  </div>
                </div>
                <Button
                  type="button"
                  size="xs"
                  color="light"
                  disabled={previewLoading || !selectedSourceId}
                  onClick={previewImpact}
                >
                  {previewLoading ? <Spinner size="sm" /> : "Preview impact"}
                </Button>
              </div>
              {preview ? (
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                    <span className="font-semibold">Status:</span>{" "}
                    {preview.status ?? "N/A"}
                  </div>
                  <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                    <span className="font-semibold">Owner delta:</span> ₹
                    {(
                      Number(preview.newFinance?.netPayableToOwner ?? 0) -
                      Number(preview.oldFinance?.netPayableToOwner ?? 0)
                    ).toLocaleString("en-IN")}
                  </div>
                  <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                    <span className="font-semibold">Commission:</span>{" "}
                    {preview.oldFinance?.commissionRate ?? "-"}% -&gt;{" "}
                    {preview.newFinance?.commissionRate ?? "-"}%
                  </div>
                  <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
                    <span className="font-semibold">TDS:</span>{" "}
                    {preview.oldFinance?.tdsRate ?? "-"}% -&gt;{" "}
                    {preview.newFinance?.tdsRate ?? "-"}%
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <Label
                htmlFor="booking-source-correction-reason"
              >
                Reason
              </Label>
              <Textarea
                id="booking-source-correction-reason"
                className="mt-2"
                value={reason}
                rows={4}
                placeholder="Why is this source being corrected?"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            disabled={isPending || loadingSources || !preview}
            onClick={submit}
          >
            {isPending ? "Applying..." : "Confirm Change"}
          </Button>
          <Button
            type="button"
            color="light"
            disabled={isPending}
            onClick={close}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
