import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";
import Link from "next/link";

const columns: FinanceColumn[] = [
  { key: "bookingId", label: "Booking", href: (row) => row.bookingId ? `/admin/bookings/${row.bookingId}` : null },
  { key: "propertyId", label: "Property ID" },
  { key: "brandId", label: "Brand ID" },
  { key: "referenceType", label: "Reference Type" },
  { key: "referenceId", label: "Reference ID" },
  { key: "entryType", label: "Entry", type: "badge", sortKey: "entryType" },
  { key: "componentType", label: "Component", sortKey: "componentType" },
  { key: "amount", label: "Amount", type: "currency", align: "right", sortKey: "amount" },
  { key: "currency", label: "Currency" },
  { key: "accountingDate", label: "Accounting Date", type: "date", sortKey: "accountingDate" },
  { key: "description", label: "Description" },
];

function paramToString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Page({ params, searchParams }: ServerPageProps) {
  const resolvedParams = await params;
  const query = await searchParams;
  const ownerId = paramToString(resolvedParams.ownerId);
  const result = await getFinanceList(`owner-wallets/${ownerId}/ledger`, query);

  return (
    <div>
      <div className="mx-auto max-w-[1500px] px-4 pt-6">
        <Link href="/admin/finance/owner-wallets" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Back to Owner Wallets
        </Link>
      </div>
      <FinanceTable
        title="Owner Wallet Ledger"
        description={`Full wallet ledger for owner ${ownerId}.`}
        columns={columns}
        rows={result.data}
        message={result.message}
        summary={result.summary}
        summaryCards={[
          { key: "totalRecords", label: "Matching Entries", type: "number" },
          { key: "amountTotal", label: "Ledger Amount Total", type: "currency" },
        ]}
        searchParams={query}
        filterFields={[
          { name: "from", label: "Accounting from", type: "date" },
          { name: "to", label: "Accounting to", type: "date" },
          { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
          { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
          { name: "bookingId", label: "Booking ID", placeholder: "Search by booking id" },
        ]}
        pagination={result.pagination}
        exportFilename={`owner-${ownerId}-wallet-ledger`}
        exportEndpoint={`owner-wallets/${ownerId}/ledger`}
      />
    </div>
  );
}
