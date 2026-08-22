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
import { getPropertyCorrectionHistory } from "@/actions/propertyCorrectionActions";

function statusColor(status: string) {
  if (status === "APPLIED") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "FAILED") return "failure";
  return "info";
}

export default function PropertyCorrectionHistoryPanel({
  propertyId,
}: {
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ batches: [], items: [] });

  useEffect(() => {
    setLoading(true);
    getPropertyCorrectionHistory(propertyId)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setData(result.data ?? { batches: [], items: [] });
      })
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load correction history",
        ),
      )
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <JarvisLoader size="md" />
      </div>
    );
  }

  const batches: any[] = data?.batches ?? [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>Created</TableHeadCell>
            <TableHeadCell>Type</TableHeadCell>
            <TableHeadCell>Range</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Counts</TableHeadCell>
            <TableHeadCell>Reason</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>{batch.createdAt?.slice?.(0, 10) ?? "-"}</TableCell>
              <TableCell>{batch.batchType}</TableCell>
              <TableCell>
                {batch.rangeStart} - {batch.rangeEnd}
              </TableCell>
              <TableCell>
                <Badge color={statusColor(batch.status)} className="w-fit">
                  {batch.status}
                </Badge>
              </TableCell>
              <TableCell>
                {batch.affectedCount} affected / {batch.appliedCount} applied /{" "}
                {batch.failedCount} failed
              </TableCell>
              <TableCell>{batch.reason}</TableCell>
            </TableRow>
          ))}
          {batches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No correction batches found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
