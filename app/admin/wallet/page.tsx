import Link from "next/link";
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { getOwners } from "@/actions/userManagementActions";
import { getWalletBalance } from "@/actions/walletActions";
import { formatAdminDateTime } from "@/lib/dateUtils";
import Pagination from "@/components/Pagination";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function WalletOverviewPage({
  searchParams,
}: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const ownersResult = await getOwners({ limit, offset });
  if (ownersResult.error) {
    throw new Error(ownersResult.error);
  }

  const owners = ownersResult.data || [];
  const ownersWithBalance = await Promise.all(
    owners.map(async (owner) => {
      try {
        const balance = await getWalletBalance(owner.id);
        return { owner, balance };
      } catch {
        return {
          owner,
          balance: {
            currentBalance: 0,
            totalCredits: 0,
            totalDebits: 0,
            lastTransactionAt: null,
          },
        };
      }
    }),
  );

  const formatCurrency = (amount: number | string) => {
    const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
    return `Rs ${Number(numeric || 0).toFixed(2)}`;
  };

  const formatDateTime = (value: string | null) =>
    formatAdminDateTime(value, { fallback: "-" });

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Wallet Overview
          </h5>
          <Breadcrumb>
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="#">Wallet Overview</BreadcrumbItem>
          </Breadcrumb>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/wallet/ledger">
              <Button color="blue">Wallet Ledger</Button>
            </Link>
            <Link href="/admin/wallet/payouts">
              <Button color="light">Payouts</Button>
            </Link>
            <Link href="/admin/wallet/settlements">
              <Button color="light">Settlements</Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <h6 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
          Owner Wallet Balances
        </h6>
        <div className="w-full overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Owner</TableHeadCell>
                <TableHeadCell>Current Balance</TableHeadCell>
                <TableHeadCell>Total Credits</TableHeadCell>
                <TableHeadCell>Total Debits</TableHeadCell>
                <TableHeadCell>Last Transaction</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {ownersWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    No owners found.
                  </TableCell>
                </TableRow>
              ) : (
                ownersWithBalance.map(({ owner, balance }) => (
                  <TableRow key={owner.id} className="bg-white dark:bg-gray-800">
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {owner.firstName} {owner.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{owner.email}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {formatCurrency(balance.currentBalance)}
                    </TableCell>
                    <TableCell>{formatCurrency(balance.totalCredits)}</TableCell>
                    <TableCell>{formatCurrency(balance.totalDebits)}</TableCell>
                    <TableCell>{formatDateTime(balance.lastTransactionAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/users/owners/${owner.id}/wallet`}>
                          <Badge color="info">Owner Wallet</Badge>
                        </Link>
                      </div>
                    </TableCell>
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
