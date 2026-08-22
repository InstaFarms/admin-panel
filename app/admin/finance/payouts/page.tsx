import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "payout.payoutReferenceCode", label: "Reference" },
  { key: "owner.firstName", label: "Owner" },
  { key: "brand.name", label: "Brand" },
  { key: "payout.payoutAmount", label: "Amount", type: "currency", align: "right", sortKey: "payoutAmount" },
  { key: "payout.currency", label: "Currency" },
  { key: "payout.payoutMethod", label: "Method" },
  { key: "payout.status", label: "Status", type: "badge", sortKey: "status" },
  { key: "payout.requestedAt", label: "Requested At", type: "dateTime", sortKey: "requestedAt" },
  { key: "payout.processedAt", label: "Processed At", type: "dateTime", sortKey: "processedAt" },
  { key: "attempts.0.payoutGateway", label: "Latest Gateway" },
  { key: "attempts.0.status", label: "Latest Attempt", type: "badge" },
  { key: "attempts.0.failureReason", label: "Failure Reason" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("payouts", params);

  return (
    <FinanceTable
      title="Owner Payouts"
      description="Owner payout requests and gateway attempt timelines."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Payouts", type: "number" },
        { key: "payoutAmountTotal", label: "Payout Amount", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Requested from", type: "date" },
        { name: "to", label: "Requested to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "ownerId", label: "Owner ID", placeholder: "Search by owner id" },
        { name: "status", label: "Status", placeholder: "Requested / Processing / Completed" },
        { name: "method", label: "Method", placeholder: "Bank transfer / UPI / Other" },
        { name: "gateway", label: "Attempt Gateway", placeholder: "RazorpayX / Cashfree / Manual" },
      ]}
      pagination={result.pagination}
      exportFilename="owner-payouts"
      exportEndpoint="payouts"
    />
  );
}
