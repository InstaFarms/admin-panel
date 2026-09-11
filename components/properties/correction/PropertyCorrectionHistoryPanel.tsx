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
import { formatAdminDateTime } from "@/lib/dateUtils";

/**
 * The admin who ran the correction, as a reviewer can read it.
 *
 * Older batches, and batches whose admin has since been removed, carry no
 * joined admin — those say so plainly rather than rendering a blank cell that
 * looks like a rendering bug.
 */
function correctedByLabel(correctedBy: any) {
  if (!correctedBy) return "Unknown";
  const name = [correctedBy.firstName, correctedBy.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || correctedBy.email || "Unknown";
}

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
            <TableHeadCell>Corrected At</TableHeadCell>
            <TableHeadCell>Corrected By</TableHeadCell>
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
              {/* Date AND time: two corrections to the same property on the same
                  day are common while an error is being chased, and a date alone
                  cannot tell them apart or put them in order. */}
              <TableCell className="whitespace-nowrap">
                {formatAdminDateTime(batch.createdAt, "-")}
              </TableCell>
              <TableCell>{correctedByLabel(batch.correctedBy)}</TableCell>
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
              <TableCell colSpan={7} className="text-center">
                No correction batches found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
