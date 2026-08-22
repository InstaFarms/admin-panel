import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import { getBookingCorrectionHistory } from "@/actions/bookingFinanceRevisionActions";

function money(value: unknown) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function BookingFinanceCorrectionHistoryPanel({
  bookingId,
}: {
  bookingId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getBookingCorrectionHistory(bookingId)
      .then((data) => setRows(data as any[]))
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load correction history",
        ),
      )
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <JarvisLoader size="md" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>Date</TableHeadCell>
            <TableHeadCell>Type</TableHeadCell>
            <TableHeadCell>Commission</TableHeadCell>
            <TableHeadCell>TDS</TableHeadCell>
            <TableHeadCell>Owner Delta</TableHeadCell>
            <TableHeadCell>Reason</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {rows.map((row) => {
            const metadata = row.metadata ?? {};
            const ownerDelta =
              metadata.ownerDelta ??
              Number(metadata.newFinance?.netPayableToOwner ?? 0) -
                Number(metadata.oldFinance?.netPayableToOwner ?? 0);
            return (
              <TableRow key={row.id}>
                <TableCell>{row.createdAt?.slice?.(0, 10) ?? "-"}</TableCell>
                <TableCell>
                  <Badge color="info" className="w-fit">
                    {row.changeType}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.oldCommissionPct ?? "-"}% -&gt;{" "}
                  {row.newCommissionPct ?? "-"}%
                </TableCell>
                <TableCell>
                  {row.oldTdsPct ?? "-"}% -&gt; {row.newTdsPct ?? "-"}%
                </TableCell>
                <TableCell>{money(ownerDelta)}</TableCell>
                <TableCell>{row.reason}</TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No finance corrections recorded.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
