import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "refund.bookingId", label: "Booking", href: (row) => `/admin/bookings/${row.refund?.bookingId}` },
  { key: "brand.name", label: "Brand" },
  { key: "property.propertyName", label: "Property" },
  { key: "cancellation.cancellationType", label: "Cancellation Type" },
  { key: "cancellation.refundStatus", label: "Cancellation Refund Status", type: "badge" },
  { key: "cancellation.refundAmount", label: "Cancellation Refund", type: "currency", align: "right" },
  { key: "refund.refundType", label: "Refund Type" },
  { key: "refund.status", label: "Refund Status", type: "badge", sortKey: "refundStatus" },
  { key: "refund.refundAmount", label: "Refund Amount", type: "currency", align: "right", sortKey: "refundAmount" },
  { key: "refund.totalRefundedAmount", label: "Total Refunded", type: "currency", align: "right", sortKey: "totalRefundedAmount" },
  { key: "refund.initiatedByType", label: "Initiated By" },
  { key: "adjustment.adjustmentType", label: "Adjustment Type" },
  { key: "adjustment.flowType", label: "Adjustment Flow" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("refunds", params);

  return (
    <FinanceTable
      title="Booking Refunds"
      description="Cancellation refunds, refund records, attempts, and linked price adjustments."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Refunds", type: "number" },
        { key: "refundAmountTotal", label: "Refund Amount", type: "currency" },
        { key: "totalRefundedAmountTotal", label: "Actually Refunded", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Cancelled from", type: "date" },
        { name: "to", label: "Cancelled to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "refundStatus", label: "Refund Status", placeholder: "Pending / Completed / Failed" },
        { name: "refundType", label: "Refund Type", placeholder: "Gateway / Manual / Adjustment" },
        { name: "adjustmentType", label: "Adjustment Type", placeholder: "Search by adjustment type" },
      ]}
      pagination={result.pagination}
      exportFilename="booking-refunds"
      exportEndpoint="refunds"
    />
  );
}
