"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Textarea } from "flowbite-react";
import toast from "react-hot-toast";
import type { ICalBookingConflictRow } from "@/actions/icalActions";
import { updateBookingConflictResolution } from "@/actions/icalActions";

export default function BookingConflictsClient({ rows }: { rows: ICalBookingConflictRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolveModalRow, setResolveModalRow] = useState<ICalBookingConflictRow | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState("");

  const handleResolveToggle = (row: ICalBookingConflictRow) => {
    if (row.isResolved) {
      const ok = window.confirm("Mark this conflict as unresolved?");
      if (!ok) return;
      startTransition(async () => {
        const result = await updateBookingConflictResolution(row.id, { isResolved: false });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result.success || "Updated");
        router.refresh();
      });
      return;
    }

    setResolveModalRow(row);
    setResolutionRemarks("");
  };

  const closeResolveModal = () => {
    if (isPending) return;
    setResolveModalRow(null);
    setResolutionRemarks("");
  };

  const confirmResolve = () => {
    if (!resolveModalRow) return;
    const remarks = resolutionRemarks.trim();
    if (!remarks) {
      toast.error("Remarks are required when resolving conflicts");
      return;
    }
    startTransition(async () => {
      const result = await updateBookingConflictResolution(resolveModalRow.id, {
        isResolved: true,
        resolutionRemarks: remarks,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success || "Updated");
      setResolveModalRow(null);
      setResolutionRemarks("");
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto">
      <Modal show={Boolean(resolveModalRow)} onClose={closeResolveModal} size="md">
        <ModalHeader>Resolve Conflict</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Add remarks for resolution:</p>
            <Textarea
              rows={4}
              placeholder="Enter resolution remarks..."
              value={resolutionRemarks}
              onChange={(e) => setResolutionRemarks(e.target.value)}
              disabled={isPending}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="success" onClick={confirmResolve} disabled={isPending}>
            {isPending ? "Saving..." : "Resolve"}
          </Button>
          <Button color="gray" onClick={closeResolveModal} disabled={isPending}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Table hoverable>
        <TableHead>
          <TableRow>
            <TableHeadCell>Property</TableHeadCell>
            <TableHeadCell>Platform</TableHeadCell>
            <TableHeadCell>Check In</TableHeadCell>
            <TableHeadCell>Check Out</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Remarks</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {rows.map((row) => (
            <TableRow key={row.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
              <TableCell className="font-medium text-gray-900 dark:text-white">
                {row.propertyId ? (
                  <Link href={`/admin/properties/${row.propertyId}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {row.propertyName || row.propertyId}
                  </Link>
                ) : (
                  row.propertyName || "N/A"
                )}
              </TableCell>
              <TableCell className="capitalize">{row.platform}</TableCell>
              <TableCell>{row.checkinDate || "-"}</TableCell>
              <TableCell>{row.checkoutDate || "-"}</TableCell>
              <TableCell>
                {row.isResolved ? (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                    Resolved
                  </span>
                ) : (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                    Unresolved
                  </span>
                )}
              </TableCell>
              <TableCell>{row.resolutionRemarks || "-"}</TableCell>
              <TableCell>
                <Button size="xs" color={row.isResolved ? "gray" : "success"} disabled={isPending} onClick={() => handleResolveToggle(row)}>
                  {row.isResolved ? "Mark Unresolved" : "Resolve"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-400">
                No booking conflicts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
