import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "payment.bookingId", label: "Booking", href: (row) => `/admin/bookings/${row.payment?.bookingId}` },
  { key: "brand.name", label: "Brand" },
  { key: "property.propertyName", label: "Property" },
  { key: "customer.firstName", label: "Customer" },
  { key: "payment.receiverType", label: "Receiver", sortKey: "receiverType" },
  { key: "payment.paymentMethod", label: "Method", sortKey: "paymentMethod" },
  { key: "payment.paymentInstrument", label: "Instrument" },
  { key: "payment.paymentGateway", label: "Gateway" },
  { key: "payment.amount", label: "Amount", type: "currency", align: "right", sortKey: "amount" },
  { key: "payment.gatewayFee", label: "Gateway Fee", type: "currency", align: "right", sortKey: "gatewayFee" },
  { key: "payment.netAmountReceived", label: "Net Received", type: "currency", align: "right", sortKey: "netAmountReceived" },
  { key: "payment.paymentFor", label: "Payment For" },
  { key: "payment.paymentReference", label: "Reference" },
  { key: "payment.paidAt", label: "Paid At", type: "dateTime", sortKey: "paidAt" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("payments", params);

  return (
    <FinanceTable
      title="Booking Payments"
      description="All v2 booking payments with gateway, receiver, fee, and net received data."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Payments", type: "number" },
        { key: "grossAmountTotal", label: "Gross Collected", type: "currency" },
        { key: "gatewayFeeTotal", label: "Gateway Fees", type: "currency" },
        { key: "netReceivedTotal", label: "Net Received", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Paid from", type: "date" },
        { name: "to", label: "Paid to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "bookingId", label: "Booking ID", placeholder: "Search by booking id" },
        { name: "receiverType", label: "Receiver Type", placeholder: "Customer / Owner / Platform" },
        { name: "paymentMethod", label: "Method", placeholder: "Cash / Bank Transfer / Gateway" },
        { name: "paymentGateway", label: "Gateway", placeholder: "Razorpay / Cashfree" },
        { name: "paymentFor", label: "Payment For", placeholder: "Booking / Adjustment / Other" },
        { name: "reference", label: "Reference Search", placeholder: "Search payment reference" },
      ]}
      pagination={result.pagination}
      exportFilename="booking-payments"
      exportEndpoint="payments"
    />
  );
}
