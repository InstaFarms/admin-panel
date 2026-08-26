"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
} from "flowbite-react";
import { HiCheck, HiX } from "react-icons/hi";

import { approveBookingConfirmation, rejectBookingConfirmation } from "@/actions/bookingConfirmationActions";
import BookingAge from "@/components/bookings/BookingAge";

type BookingRequestStatus = "AWAITING_APPROVAL" | "CONFIRMED" | "REJECTED" | string;

export type BookingRequestRow = {
  id: string;
  brandId?: string | null;
  status: BookingRequestStatus;
  bookingSource?: string | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  adultCount: number | null;
  childrenCount: number | null;
  infantCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  roomNumber?: string | null;
  roomName?: string | null;
  property: {
    id: string | null;
    propertyName: string | null;
    propertyCode: string | null;
  } | null;
  customer: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    mobileNumber: string | null;
  } | null;
  brand?: {
    id: string | null;
    name: string | null;
  } | null;
};

function getBrandTagMeta(
  brandName?: string | null,
  bookingSource?: string | null
): { label: string; className: string } | null {
  const normalizedBrand = String(brandName || "").toLowerCase();
  if (normalizedBrand.includes("mago")) {
    return {
      label: "[MS]",
      className: "text-blue-600 dark:text-blue-400",
    };
  }
  if (normalizedBrand.includes("instafarm")) {
    return {
      label: "[IF]",
      className: "text-green-600 dark:text-green-400",
    };
  }

  const normalizedSource = String(bookingSource || "").toLowerCase();
  if (normalizedSource.includes("mago")) {
    return {
      label: "[MS]",
      className: "text-blue-600 dark:text-blue-400",
    };
  }
  if (normalizedSource) {
    return {
      label: "[IF]",
      className: "text-green-600 dark:text-green-400",
    };
  }
  return null;
}

function getStatusUi(status: BookingRequestStatus): { label: string; classes: string } {
  if (status === "AWAITING_APPROVAL") {
    return {
      label: "Pending",
      classes: "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-500/30",
    };
  }
  if (status === "CONFIRMED") {
    return {
      label: "Approved",
      classes: "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-500/30",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Rejected",
      classes: "bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-500/30",
    };
  }

  return {
    label: status,
    classes: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500/30",
  };
}

type Props = {
  initialData: BookingRequestRow[];
  offset: number;
  brandId?: string;
};

export default function BookingRequestsTable({ initialData, offset, brandId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequestRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const normalizedBrandId = (brandId || "all").toLowerCase();
  const visibleRows = useMemo(() => {
    if (normalizedBrandId === "all") return initialData;
    return initialData.filter((row) => {
      const source = String(row.bookingSource || "").toLowerCase();
      if (normalizedBrandId === "mago") return source.includes("mago");
      if (normalizedBrandId === "instafarms") return !source.includes("mago");
      return true;
    });
  }, [initialData, normalizedBrandId]);

  const onApprove = (request: BookingRequestRow) => {
    if (request.status !== "AWAITING_APPROVAL") return;
    startTransition(async () => {
      await approveBookingConfirmation(request.id);
    });
  };

  const onOpenReject = (request: BookingRequestRow) => {
    if (request.status !== "AWAITING_APPROVAL") return;
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const onRejectConfirm = () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    startTransition(async () => {
      await rejectBookingConfirmation(selectedRequest.id, rejectionReason.trim());
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-full table-fixed">
          <TableHead>
            <TableRow>
              <TableHeadCell>ID</TableHeadCell>
              <TableHeadCell>Property Name</TableHeadCell>
              <TableHeadCell>Room</TableHeadCell>
              <TableHeadCell>Guest</TableHeadCell>
              <TableHeadCell>Stay Dates</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Creation Date</TableHeadCell>
              <TableHeadCell>Action</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {visibleRows.length > 0 ? (
              visibleRows.map((row, index) => {
                const totalGuests = (row.adultCount || 0) + (row.childrenCount || 0) + (row.infantCount || 0);
                const requestedAt = row.updatedAt || row.createdAt;
                const statusUi = getStatusUi(row.status);
                const isAwaiting = row.status === "AWAITING_APPROVAL";
                const guestName = `${row.customer?.firstName || ""} ${row.customer?.lastName || ""}`.trim() || "Unknown Guest";
                const guestMobile = row.customer?.mobileNumber || "N/A";
                const brandTag = getBrandTagMeta(row.brand?.name, row.bookingSource);

                return (
                  <TableRow key={row.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                    <TableCell className="min-w-0 max-w-70 break-all font-medium text-gray-900 dark:text-white">
                      <Link
                        href={`/admin/bookings/booking-requests/${row.id}`}
                        className="block text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {row.id}
                      </Link>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        #{offset + index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 max-w-90 wrap-break-word font-medium text-gray-900 dark:text-white">
                      <div>
                        {row.property?.id ? (
                          <Link href={`/admin/properties/${row.property.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                            {row.property?.propertyCode ? `${row.property.propertyCode} - ` : ""}
                            {row.property?.propertyName || "Unknown Property"}
                            {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                          </Link>
                        ) : (
                          <span className="text-gray-900 dark:text-white">
                            {row.property?.propertyCode ? `${row.property.propertyCode} - ` : ""}
                            {row.property?.propertyName || "Unknown Property"}
                            {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {row.roomNumber ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{row.roomNumber}</span>
                          {row.roomName && <span className="text-xs text-gray-500 dark:text-gray-400">{row.roomName}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="wrap-break-word text-gray-700 dark:text-gray-300">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{guestName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{guestMobile}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {totalGuests} (A:{row.adultCount || 0} C:{row.childrenCount || 0} I:{row.infantCount || 0})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="wrap-break-word text-gray-700 dark:text-gray-300">
                      {(row.checkinDate && row.checkoutDate) ? `${row.checkinDate} to ${row.checkoutDate}` : "N/A"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusUi.classes}`}
                      >
                        {statusUi.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <BookingAge createdAt={requestedAt} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          color={isAwaiting ? "success" : "gray"}
                          className={isAwaiting ? "" : "opacity-60"}
                          onClick={() => onApprove(row)}
                          disabled={!isAwaiting || isPending}
                        >
                          <HiCheck className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          color="light"
                          className={
                            isAwaiting
                              ? "border-rose-200! bg-rose-100! text-rose-700! hover:bg-rose-200! dark:border-rose-800! dark:bg-rose-900/40! dark:text-rose-200!"
                              : "opacity-60"
                          }
                          onClick={() => onOpenReject(row)}
                          disabled={!isAwaiting || isPending}
                        >
                          <HiX className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  No booking requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Modal show={rejectModalOpen} onClose={() => setRejectModalOpen(false)} size="md">
        <ModalHeader>Reject Booking Request</ModalHeader>
        <ModalBody className="dark:bg-slate-900">
          <div className="space-y-4">
            <div className="mb-2 block">
              <Label htmlFor="request-reason" >Reason for rejection</Label>
            </div>
            <Textarea
              id="request-reason"
              rows={4}
              required
              value={rejectionReason}
              placeholder="Please provide a reason for rejecting this request..."
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="failure"
            onClick={onRejectConfirm}
            disabled={!rejectionReason.trim() || isPending}
          >
            Reject request
          </Button>
          <Button color="gray" onClick={() => setRejectModalOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

