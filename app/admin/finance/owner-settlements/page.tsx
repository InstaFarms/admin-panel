import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "settlement.bookingId", label: "Booking", href: (row) => `/admin/bookings/${row.settlement?.bookingId}` },
  { key: "owner.firstName", label: "Owner" },
  { key: "property.propertyName", label: "Property" },
  { key: "brand.name", label: "Brand" },
  { key: "settlement.status", label: "Status", type: "badge", sortKey: "status" },
  { key: "settlement.bookingAmountExclBookingGst", label: "Booking Excl GST", type: "currency", align: "right" },
  { key: "settlement.commissionAmountInclCommissionGst", label: "Commission Incl GST", type: "currency", align: "right" },
  { key: "settlement.tdsAmount", label: "TDS", type: "currency", align: "right", sortKey: "tdsAmount" },
  { key: "settlement.netPayableToOwner", label: "Net Payable", type: "currency", align: "right", sortKey: "netPayableToOwner" },
  { key: "settlement.cancellationFee", label: "Cancellation Fee", type: "currency", align: "right" },
  { key: "settlement.refundAmount", label: "Refund", type: "currency", align: "right" },
  { key: "settlement.goodwillAdjustment", label: "Goodwill", type: "currency", align: "right" },
  { key: "settlement.isOwnerGstRegistered", label: "Owner GST", type: "boolean", align: "center" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("owner-settlements", params);

  return (
    <FinanceTable
      title="Owner Settlements"
      description="Settlement calculations, TDS, commission, net payable, and adjustment records."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Settlements", type: "number" },
        { key: "netPayableTotal", label: "Net Payable Total", type: "currency" },
        { key: "tdsAmountTotal", label: "TDS Total", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Created from", type: "date" },
        { name: "to", label: "Created to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "ownerId", label: "Owner ID", placeholder: "Search by owner id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "bookingId", label: "Booking ID", placeholder: "Search by booking id" },
        { name: "status", label: "Status", placeholder: "Pending / Processed / Blocked" },
      ]}
      pagination={result.pagination}
      exportFilename="owner-settlements"
      exportEndpoint="owner-settlements"
    />
  );
}
