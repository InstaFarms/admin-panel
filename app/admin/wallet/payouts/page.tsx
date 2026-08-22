import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { getOwners } from "@/actions/userManagementActions";
import { getOwnerPayouts } from "@/actions/walletActions";
import { formatAdminDateTime } from "@/lib/dateUtils";
import { ServerPageProps } from "@/utils/types";
import Pagination from "@/components/Pagination";
import { parseLimitOffset } from "@/utils/server-utils";
import OwnerSearchFilter from "../OwnerSearchFilter";

export const dynamic = "force-dynamic";

export default async function WalletPayoutsPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const selectedOwnerId =
    typeof params.ownerId === "string" && params.ownerId.length > 0
      ? params.ownerId
      : null;

  // Only the first page of owners; OwnerSearchFilter searches server-side for
  // the rest, so this seed does not limit which owners are selectable.
  const ownersResult = await getOwners({ limit: 100, offset: 0 });
  if (ownersResult.error) {
    throw new Error(ownersResult.error);
  }
  const owners = ownersResult.data || [];

  const effectiveOwnerId = selectedOwnerId ?? owners[0]?.id ?? null;
  const payouts = effectiveOwnerId
    ? await getOwnerPayouts(effectiveOwnerId, { limit, offset })
    : [];

  const formatCurrency = (amount: number | string) => {
    const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
    return `Rs ${Number(numeric || 0).toFixed(2)}`;
  };

  const formatDate = (dateString: string) =>
    formatAdminDateTime(dateString, { fallback: "N/A" });

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Owner Payouts Table
        </h5>
        <Breadcrumb>
          <BreadcrumbItem href="/">Home</BreadcrumbItem>
          <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
          <BreadcrumbItem href="/admin/wallet">Wallet Overview</BreadcrumbItem>
          <BreadcrumbItem href="#">Payouts</BreadcrumbItem>
        </Breadcrumb>

        <OwnerSearchFilter owners={owners} effectiveOwnerId={effectiveOwnerId} />
      </Card>

      <Card>
        <div className="w-full overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Date</TableHeadCell>
                <TableHeadCell>Owner</TableHeadCell>
                <TableHeadCell>Amount</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Detail</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    No payouts found.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((row: any) => (
                  <TableRow key={row.id} className="bg-white dark:bg-gray-800">
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{row.ownerId}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(row.amount)}</TableCell>
                    <TableCell>
                      <Badge color={row.status === "COMPLETED" ? "success" : "warning"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.payoutDetail || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}
