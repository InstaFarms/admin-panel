import { getFinanceDetail } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";
import Link from "next/link";

const daywiseColumns: FinanceColumn[] = [
  { key: "stayDate", label: "Stay Date", type: "date" },
  { key: "basePriceExclGst", label: "Base Excl GST", type: "currency", align: "right" },
  { key: "extraGuestChargesExclGst", label: "Extra Guests", type: "currency", align: "right" },
  { key: "floatingGuestChargesExclGst", label: "Floating Guests", type: "currency", align: "right" },
  { key: "totalBeforeDiscountExclGst", label: "Before Discount", type: "currency", align: "right" },
  { key: "discountAmountExclGst", label: "Discount", type: "currency", align: "right" },
  { key: "priceAfterDiscountExclGst", label: "After Discount", type: "currency", align: "right" },
  { key: "bookingGstRate", label: "GST Rate", type: "number", align: "right" },
  { key: "bookingGstAmount", label: "GST Amount", type: "currency", align: "right" },
  { key: "finalPriceInclGst", label: "Final", type: "currency", align: "right" },
];

const discountColumns: FinanceColumn[] = [
  { key: "applicationOrder", label: "Order", type: "number", align: "right" },
  { key: "discountType", label: "Type" },
  { key: "couponCode", label: "Coupon" },
  { key: "discountValueType", label: "Value Type" },
  { key: "calculationBase", label: "Calculation Base" },
  { key: "amountBeforeDiscount", label: "Before", type: "currency", align: "right" },
  { key: "discountAmount", label: "Discount", type: "currency", align: "right" },
  { key: "amountAfterDiscount", label: "After", type: "currency", align: "right" },
  { key: "description", label: "Description" },
];

function Stat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-900">
      <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value == null || value === "" ? "N/A" : String(value)}</div>
    </div>
  );
}

function paramToString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Page({ params }: ServerPageProps) {
  const resolvedParams = await params;
  const bookingId = paramToString(resolvedParams.bookingId);
  const result = await getFinanceDetail<any>(`booking-finance/${bookingId}`);
  const data = result.data;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin/finance/booking-finance" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Back to Booking Finance
        </Link>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Finance Detail</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{bookingId}</p>
          </div>
          <Link href={`/admin/bookings/${bookingId}`} className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
            Open Booking
          </Link>
        </div>
      </div>

      {!data ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No finance detail found.
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Stat label="Before Discount" value={data.pricingSummary?.totalBeforeDiscountExclGst ?? data.legacyPricing?.bookingAmountWithGstBeforeDiscounts} />
              <Stat label="Discount" value={data.pricingSummary?.totalDiscountAmountExclGst ?? data.legacyPricing?.totalDiscountAmount} />
              <Stat label="GST" value={data.pricingSummary?.totalGstAmount ?? data.legacyPricing?.totalGstCollected} />
              <Stat label="Final Amount" value={data.pricingSummary?.finalAmountInclGst ?? data.legacyPricing?.fullBookingAmountWithGst} />
              <Stat label="Stay Adults" value={data.guestBreakup?.stayAdultCount} />
              <Stat label="Stay Children" value={data.guestBreakup?.stayChildCount} />
              <Stat label="Floating Adults" value={data.guestBreakup?.floatingAdultCount} />
              <Stat label="Pricing Version" value={data.pricingSummary?.pricingVersion ?? "legacy"} />
            </div>
          </section>

          <FinanceTable
            title="Day-wise Pricing"
            description="Per-stay-date pricing calculation for this booking."
            columns={daywiseColumns}
            rows={data.daywiseBreakup ?? []}
            exportFilename={`booking-${bookingId}-daywise-pricing`}
            filterFields={[]}
          />

          <FinanceTable
            title="Discounts"
            description="Discount application order and calculation base for this booking."
            columns={discountColumns}
            rows={data.discounts ?? []}
            exportFilename={`booking-${bookingId}-discounts`}
            filterFields={[]}
          />
        </>
      )}
    </div>
  );
}
