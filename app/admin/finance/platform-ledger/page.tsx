import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "brand.name", label: "Brand" },
  { key: "ledger.bookingId", label: "Booking", href: (row) => row.ledger?.bookingId ? `/admin/bookings/${row.ledger.bookingId}` : null },
  { key: "ledger.propertyId", label: "Property ID" },
  { key: "ledger.ownerId", label: "Owner ID" },
  { key: "ledger.referenceType", label: "Reference Type" },
  { key: "ledger.referenceId", label: "Reference ID" },
  { key: "ledger.entryType", label: "Entry", type: "badge" },
  { key: "ledger.category", label: "Category", sortKey: "category" },
  { key: "ledger.amountExclCommissionGst", label: "Amount Excl GST", type: "currency", align: "right", sortKey: "amountExclCommissionGst" },
  { key: "ledger.commissionGstAmount", label: "Commission GST", type: "currency", align: "right" },
  { key: "ledger.amountInclCommissionGst", label: "Amount Incl GST", type: "currency", align: "right", sortKey: "amountInclCommissionGst" },
  { key: "ledger.accountingDate", label: "Accounting Date", type: "date", sortKey: "accountingDate" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("platform-ledger", params);

  return (
    <FinanceTable
      title="Platform Ledger"
      description="Platform commission, refund loss, goodwill, milestone, and manual ledger entries."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Entries", type: "number" },
        { key: "amountExclTotal", label: "Excl GST Total", type: "currency" },
        { key: "amountInclTotal", label: "Incl GST Total", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Accounting from", type: "date" },
        { name: "to", label: "Accounting to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "ownerId", label: "Owner ID", placeholder: "Search by owner id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "bookingId", label: "Booking ID", placeholder: "Search by booking id" },
        { name: "category", label: "Category", placeholder: "Commission / Goodwill / Refund Loss" },
        { name: "entryType", label: "Entry Type", placeholder: "Credit / Debit" },
        { name: "referenceType", label: "Reference Type", placeholder: "Booking / Refund / Manual" },
      ]}
      pagination={result.pagination}
      exportFilename="platform-ledger"
      exportEndpoint="platform-ledger"
    />
  );
}
