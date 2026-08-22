import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";

const columns: FinanceColumn[] = [
  { key: "booking.id", label: "Booking ID", href: (row) => `/admin/finance/booking-finance/${row.booking?.id}` },
  { key: "brand.name", label: "Brand" },
  { key: "property.propertyName", label: "Property", href: (row) => row.property?.id ? `/admin/properties/${row.property.id}` : null },
  { key: "customer.firstName", label: "Customer" },
  { key: "booking.status", label: "Status", type: "badge", sortKey: "status" },
  { key: "booking.checkinDate", label: "Check-in", type: "date", sortKey: "checkinDate" },
  { key: "booking.checkoutDate", label: "Check-out", type: "date", sortKey: "checkoutDate" },
  { key: "booking.totalNights", label: "Nights", type: "number", align: "right" },
  { key: "booking.totalGuestCount", label: "Guests", type: "number", align: "right" },
  { key: "pricingSummary.totalBeforeDiscountExclGst", label: "Before Discount", type: "currency", align: "right" },
  { key: "pricingSummary.totalDiscountAmountExclGst", label: "Discount", type: "currency", align: "right" },
  { key: "pricingSummary.totalGstAmount", label: "GST", type: "currency", align: "right", sortKey: "gstAmount" },
  { key: "pricingSummary.finalAmountInclGst", label: "Final Amount", type: "currency", align: "right", sortKey: "finalAmount" },
  { key: "pricingSummary.pricingVersion", label: "Pricing Version", type: "number", align: "right" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const result = await getFinanceList("booking-finance", params);

  return (
    <FinanceTable
      title="Booking Finance"
      description="Booking-level financial truth from pricing summary, day-wise breakup, discounts, and legacy pricing."
      columns={columns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={[
        { key: "totalRecords", label: "Matching Records", type: "number" },
        { key: "finalAmountTotal", label: "Final Amount Total", type: "currency" },
        { key: "gstAmountTotal", label: "GST Total", type: "currency" },
        { key: "discountAmountTotal", label: "Discount Total", type: "currency" },
      ]}
      searchParams={params}
      filterFields={[
        { name: "from", label: "Check-in from", type: "date" },
        { name: "to", label: "Check-in to", type: "date" },
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "customerId", label: "Customer ID", placeholder: "Search by customer id" },
        { name: "status", label: "Booking Status", placeholder: "Confirmed / Pending / Cancelled" },
      ]}
      pagination={result.pagination}
      exportFilename="booking-finance"
      exportEndpoint="booking-finance"
    />
  );
}
