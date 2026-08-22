"use client";

import { updateRefundStatus } from "@/actions/bookingActions";
import { parseServerActionResult } from "@/utils/utils";
import { Select, Badge } from "flowbite-react";
import { useTransition } from "react";
import toast from "react-hot-toast";

interface RefundStatusDropdownProps {
  bookingId: string;
  currentStatus: string;
}

export default function RefundStatusDropdown({
  bookingId,
  currentStatus,
}: RefundStatusDropdownProps) {
  const [loading, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;

    startTransition(() => {
      const promise = parseServerActionResult(
        updateRefundStatus(bookingId, newStatus)
      );

      toast.promise(promise, {
        loading: "Updating refund status...",
        success: (data) => data,
        error: (err) => (err as Error).message,
      });
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Failed":
        return "failure";
      case "Pending":
        return "warning";
      default:
        return "gray";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge color={getStatusColor(currentStatus)} size="sm">
        {currentStatus}
      </Badge>
      <Select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={loading || currentStatus === "Completed"}
        className="min-w-32"
        sizing="sm"
      >
        <option value="Pending">Pending</option>
        <option value="Completed">Completed</option>
        <option value="Failed">Failed</option>
      </Select>
    </div>
  );
}