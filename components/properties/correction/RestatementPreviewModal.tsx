import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
} from "flowbite-react";

import {
  applyAgreementCorrection,
  applyMilestoneCorrection,
  applyOwnerBlockRentCorrection,
  previewOwnerBlockRentCorrection,
  previewPropertyCorrection,
} from "@/actions/propertyCorrectionActions";

type Mode = "AGREEMENT" | "MILESTONE" | "OWNER_BLOCK_RENT";

type RestatementPreviewModalProps = {
  propertyId: string;
  mode: Mode | null;
  open: boolean;
  onClose: () => void;
  onApplied: () => Promise<void> | void;
  agreementModels: Array<{
    id: string;
    name: string;
    code: string;
    isRentBasisModel?: boolean;
  }>;
  currentAgreementModelId: string;
  currentRent: string;
  milestonePayload: {
    name: string;
    revenueBasis:
      | "EXCL_BOOKING_GST"
      | "INCL_BOOKING_GST"
      | "NET_REVENUE_EXCL_GST";
    lines: Array<{
      milestoneNumber: number;
      label: string;
      minRevenue: number;
      maxRevenue?: number | null;
      commissionPercentage: number;
      sortOrder?: number;
    }>;
  };
};

function statusColor(status: string) {
  if (status === "AFFECTED" || status === "APPLIED") return "success";
  if (status === "BLOCKED" || status === "FAILED") return "failure";
  if (status === "ALREADY_CORRECTED") return "warning";
  return "gray";
}

function money(value: unknown) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function RestatementPreviewModal({
  propertyId,
  mode,
  open,
  onClose,
  onApplied,
  agreementModels,
  currentAgreementModelId,
  currentRent,
  milestonePayload,
}: RestatementPreviewModalProps) {
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [reason, setReason] = useState("");
  const [agreementModelId, setAgreementModelId] = useState(
    currentAgreementModelId,
  );
  const [rent, setRent] = useState(currentRent);
  const [ownerBlockRate, setOwnerBlockRate] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const title = useMemo(() => {
    if (mode === "AGREEMENT") return "Agreement / Rent Correction";
    if (mode === "MILESTONE") return "Milestone Slab Correction";
    return "Owner Block Rent Correction";
  }, [mode]);

  const rows: any[] = preview?.rows ?? [];

  const loadPreview = async () => {
    if (!mode) return;
    if (!rangeStart || !rangeEnd) {
      toast.error("Select correction date range.");
      return;
    }
    try {
      const result =
        mode === "OWNER_BLOCK_RENT"
          ? await previewOwnerBlockRentCorrection({
              propertyId,
              rangeStart,
              rangeEnd,
              newRatePerNight: Number(ownerBlockRate),
            })
          : await previewPropertyCorrection({
              propertyId,
              kind: mode,
              rangeStart,
              rangeEnd,
              payload:
                mode === "AGREEMENT"
                  ? {
                      agreementModelId,
                      rent: rent ? Number(rent) : null,
                    }
                  : milestonePayload,
            });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const data = result.data;
      setPreview(data);
      setSelectedIds(
        new Set(
          ((data as any)?.rows ?? [])
            .filter((row: any) => row.status === "AFFECTED")
            .map((row: any) => row.bookingId ?? row.recordId),
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to preview correction",
      );
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    if (!mode || !preview) return;
    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }
    startTransition(async () => {
      const selected = Array.from(selectedIds);
      const result =
        mode === "AGREEMENT"
          ? await applyAgreementCorrection({
              propertyId,
              payload: {
                agreementModelId,
                rent: rent ? Number(rent) : null,
              },
              rangeStart,
              rangeEnd,
              bookingIdsToRestate: selected,
              reason,
            })
          : mode === "MILESTONE"
            ? await applyMilestoneCorrection({
                propertyId,
                payload: milestonePayload,
                rangeStart,
                rangeEnd,
                bookingIdsToRestate: selected,
                reason,
              })
            : await applyOwnerBlockRentCorrection({
                propertyId,
                rangeStart,
                rangeEnd,
                newRatePerNight: Number(ownerBlockRate),
                recordIdsToRestate: selected,
                reason,
              });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success || "Correction applied.");
      setPreview(null);
      setReason("");
      await onApplied();
      onClose();
    });
  };

  return (
    <Modal show={open} onClose={onClose} size="7xl">
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label >Range start</Label>
              <TextInput
                type="date"
                value={rangeStart}
                onChange={(event) => {
                  setRangeStart(event.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <Label >Range end</Label>
              <TextInput
                type="date"
                value={rangeEnd}
                onChange={(event) => {
                  setRangeEnd(event.target.value);
                  setPreview(null);
                }}
              />
            </div>
            {mode === "AGREEMENT" ? (
              <>
                <div>
                  <Label >Correct model</Label>
                  <Select
                    value={agreementModelId}
                    onChange={(event) => {
                      setAgreementModelId(event.target.value);
                      setPreview(null);
                    }}
                  >
                    {agreementModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.code})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label >Correct rent</Label>
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={rent}
                    onChange={(event) => {
                      setRent(event.target.value);
                      setPreview(null);
                    }}
                  />
                </div>
              </>
            ) : null}
            {mode === "OWNER_BLOCK_RENT" ? (
              <div>
                <Label >Correct rate per night</Label>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={ownerBlockRate}
                  onChange={(event) => {
                    setOwnerBlockRate(event.target.value);
                    setPreview(null);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" color="light" onClick={loadPreview}>
              Preview affected records
            </Button>
            {preview?.counts ? (
              <>
                <Badge color="success">
                  {preview.counts.affectedCount} Affected
                </Badge>
                <Badge color="gray">
                  {preview.counts.noImpactCount} No Impact
                </Badge>
                <Badge color="failure">
                  {preview.counts.blockedCount} Blocked
                </Badge>
                <Badge color="warning">
                  {preview.counts.alreadyCorrectedCount} Already Corrected
                </Badge>
              </>
            ) : null}
          </div>

          {preview ? (
            <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Select</TableHeadCell>
                    <TableHeadCell>Record</TableHeadCell>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Owner Delta</TableHeadCell>
                    <TableHeadCell>Commission</TableHeadCell>
                    <TableHeadCell>Reason</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {rows.map((row) => {
                    const id = row.bookingId ?? row.recordId;
                    const ownerDelta =
                      row.newFinance?.delta ??
                      Number(row.newFinance?.netPayableToOwner ?? 0) -
                        Number(row.oldFinance?.netPayableToOwner ?? 0);
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <Checkbox
                            disabled={row.status !== "AFFECTED"}
                            checked={selectedIds.has(id)}
                            onChange={() => toggleSelected(id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.bookingCode ?? id}
                        </TableCell>
                        <TableCell>
                          {row.checkinDate ?? row.effectiveStart ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={statusColor(row.status)}
                            className="w-fit"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{money(ownerDelta)}</TableCell>
                        <TableCell>
                          {row.oldFinance?.commissionRate ?? "-"}% -&gt;{" "}
                          {row.newFinance?.commissionRate ?? "-"}%
                        </TableCell>
                        <TableCell>{row.blockReason ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div>
            <Label >Reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this correction required?"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          color="warning"
          disabled={isPending || !preview}
          onClick={confirm}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Applying...
            </span>
          ) : (
            "Confirm correction"
          )}
        </Button>
        <Button
          type="button"
          color="light"
          disabled={isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}
