import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "owner.id", label: "Owner ID", href: (row) => row.owner?.id ? `/admin/finance/owner-wallets/${row.owner.id}/ledger` : null },
  { key: "owner.firstName", label: "Owner", sortKey: "ownerId" },
  { key: "owner.email", label: "Email" },
  { key: "wallet.currentBalance", label: "Current Balance", type: "currency", align: "right", sortKey: "currentBalance" },
  { key: "wallet.availableBalance", label: "Available", type: "currency", align: "right" },
  { key: "wallet.pendingBalance", label: "Pending", type: "currency", align: "right" },
  { key: "wallet.currency", label: "Currency" },
  { key: "totalCredits", label: "Total Credits", type: "currency", align: "right" },
  { key: "totalDebits", label: "Total Debits", type: "currency", align: "right" },
  { key: "latestLedgerDate", label: "Latest Ledger Date", type: "dateTime" },
  { key: "wallet.lastUpdatedAt", label: "Last Updated", type: "dateTime", sortKey: "lastUpdatedAt" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("owner-wallets", params);

  return (
    <FinanceTable
      title="Owner Wallets"
      description="Owner wallet balances with credit/debit rollups and latest ledger dates."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Wallets", type: "number" },
        { key: "currentBalanceTotal", label: "Combined Balance", type: "currency" },
        { key: "availableBalanceTotal", label: "Available Total", type: "currency" },
        { key: "pendingBalanceTotal", label: "Pending Total", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Updated from", type: "date" },
        { name: "to", label: "Updated to", type: "date" },
        { name: "ownerId", label: "Owner ID", placeholder: "Search by owner id" },
      ]}
      pagination={result.pagination}
      exportFilename="owner-wallets"
      exportEndpoint="owner-wallets"
    />
  );
}
