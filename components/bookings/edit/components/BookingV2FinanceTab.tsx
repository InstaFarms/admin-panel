"use client";

import type { ReactNode } from "react";
import { formatAdminDateTime } from "@/lib/dateUtils";

type BookingV2Finance = {
  guestBreakup?: Record<string, any> | null;
  pricingSummary?: Record<string, any> | null;
  daywiseBreakup?: Record<string, any>[];
  payments?: Record<string, any>[];
  discounts?: Record<string, any>[];
  cancellation?: Record<string, any> | null;
  refund?: Record<string, any> | null;
  refundAttempts?: Record<string, any>[];
  priceAdjustments?: Record<string, any>[];
  ownerSettlement?: Record<string, any> | null;
  ownerSettlementAdjustments?: Record<string, any>[];
  ownerWalletLedger?: Record<string, any>[];
  platformLedger?: Record<string, any>[];
  tdsRecords?: Record<string, any>[];
  gstRecords?: Record<string, any>[];
  paymentSchedule?: Record<string, any> | null;
  legacyPricing?: Record<string, any> | null;
};

interface BookingV2FinanceTabProps {
  data?: BookingV2Finance | null;
  bookingLogs?: Record<string, any>[];
  notifications?: Record<string, any>[];
  notificationEvents?: Record<string, any>[];
  notificationDeadLetters?: Record<string, any>[];
  relatedData?: Record<string, any> | null;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatDate(value: unknown) {
  return formatAdminDateTime(value, { fallback: "N/A" });
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {empty ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No records found.</p>
      ) : (
        children
      )}
    </section>
  );
}

function MetricGrid({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
          <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string; render?: (row: Record<string, any>) => React.ReactNode }>;
  rows?: Record<string, any>[];
}) {
  if (!rows?.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-3 py-2">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row, index) => (
            <tr key={row.id ?? index} className="text-gray-700 dark:text-gray-200">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-3 py-2">
                  {column.render ? column.render(row) : formatValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BookingV2FinanceTab({
  data,
  bookingLogs,
  notifications,
  notificationEvents,
  notificationDeadLetters,
  relatedData,
}: BookingV2FinanceTabProps) {
  const guestBreakup = data?.guestBreakup;
  const pricingSummary = data?.pricingSummary;
  const cancellation = data?.cancellation;
  const refund = data?.refund;
  const legacyPricing = data?.legacyPricing;
  const ownerSettlement = data?.ownerSettlement;
  const paymentSchedule = data?.paymentSchedule;

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Booking v2 finance data is not available for this booking yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Guest Breakup" empty={!guestBreakup}>
        <MetricGrid
          items={[
            ["Stay adults", formatValue(guestBreakup?.stayAdultCount)],
            ["Stay children", formatValue(guestBreakup?.stayChildCount)],
            ["Stay infants", formatValue(guestBreakup?.stayInfantCount)],
            ["Floating adults", formatValue(guestBreakup?.floatingAdultCount)],
            ["Floating children", formatValue(guestBreakup?.floatingChildCount)],
            ["Floating infants", formatValue(guestBreakup?.floatingInfantCount)],
          ]}
        />
      </Section>

      <Section title="Pricing Summary" empty={!pricingSummary && !legacyPricing}>
        <MetricGrid
          items={[
            ["Before discount", formatMoney(pricingSummary?.totalBeforeDiscountExclGst ?? legacyPricing?.bookingAmountWithGstBeforeDiscounts)],
            ["Discount", formatMoney(pricingSummary?.totalDiscountAmountExclGst ?? legacyPricing?.totalDiscountAmount)],
            ["After discount", formatMoney(pricingSummary?.totalAfterDiscountExclGst ?? legacyPricing?.bookingAmountWithDiscountBeforeGst)],
            ["GST", formatMoney(pricingSummary?.totalGstAmount ?? legacyPricing?.totalGstCollected)],
            ["Final amount", formatMoney(pricingSummary?.finalAmountInclGst ?? legacyPricing?.fullBookingAmountWithGst)],
            ["Pricing version", formatValue(pricingSummary?.pricingVersion ?? "legacy")],
          ]}
        />
      </Section>

      <Section title="Day-wise Breakup">
        <DataTable
          rows={data.daywiseBreakup}
          columns={[
            { key: "stayDate", label: "Stay date" },
            { key: "basePriceExclGst", label: "Base", render: (row) => formatMoney(row.basePriceExclGst) },
            { key: "extraGuestChargesExclGst", label: "Extra guests", render: (row) => formatMoney(row.extraGuestChargesExclGst) },
            { key: "discountAmountExclGst", label: "Discount", render: (row) => formatMoney(row.discountAmountExclGst) },
            { key: "bookingGstRate", label: "GST rate", render: (row) => `${formatValue(row.bookingGstRate)}%` },
            { key: "bookingGstAmount", label: "GST", render: (row) => formatMoney(row.bookingGstAmount) },
            { key: "finalPriceInclGst", label: "Final", render: (row) => formatMoney(row.finalPriceInclGst) },
          ]}
        />
      </Section>

      <Section title="Payments">
        <DataTable
          rows={data.payments}
          columns={[
            { key: "paidAt", label: "Paid at", render: (row) => formatDate(row.paidAt) },
            { key: "receiverType", label: "Receiver" },
            { key: "paymentMethod", label: "Method" },
            { key: "paymentFor", label: "For" },
            { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "gatewayFee", label: "Gateway fee", render: (row) => formatMoney(row.gatewayFee) },
            { key: "netAmountReceived", label: "Net received", render: (row) => formatMoney(row.netAmountReceived) },
            { key: "paymentReference", label: "Reference" },
          ]}
        />
      </Section>

      <Section title="Discounts">
        <DataTable
          rows={data.discounts}
          columns={[
            { key: "applicationOrder", label: "Order" },
            { key: "discountType", label: "Type" },
            { key: "couponCode", label: "Coupon" },
            { key: "discountValueType", label: "Value type" },
            { key: "discountAmount", label: "Discount", render: (row) => formatMoney(row.discountAmount) },
            { key: "amountBeforeDiscount", label: "Before", render: (row) => formatMoney(row.amountBeforeDiscount) },
            { key: "amountAfterDiscount", label: "After", render: (row) => formatMoney(row.amountAfterDiscount) },
          ]}
        />
      </Section>

      <Section title="Cancellation" empty={!cancellation}>
        <MetricGrid
          items={[
            ["Type", formatValue(cancellation?.cancellationType)],
            ["Cancelled at", formatDate(cancellation?.cancellationTimestamp)],
            ["Days before check-in", formatValue(cancellation?.daysBeforeCheckin)],
            ["Stay type", formatValue(cancellation?.stayType)],
            ["Total paid", formatMoney(cancellation?.totalAmountPaid)],
            ["Total deductions", formatMoney(cancellation?.totalDeductions)],
            ["Refund amount", formatMoney(cancellation?.refundAmount)],
            ["Refund status", formatValue(cancellation?.refundStatus)],
            ["Owner earnings", formatMoney(cancellation?.ownerEarningsFromCancellation)],
          ]}
        />
      </Section>

      <Section title="Refund" empty={!refund}>
        <MetricGrid
          items={[
            ["Status", formatValue(refund?.status)],
            ["Type", formatValue(refund?.refundType)],
            ["Target amount", formatMoney(refund?.refundAmount)],
            ["Refunded amount", formatMoney(refund?.totalRefundedAmount)],
            ["Initiated by", formatValue(refund?.initiatedByType)],
            ["Price adjustment", formatValue(refund?.isTherePriceAdjustment)],
          ]}
        />
      </Section>

      <Section title="Refund Attempts">
        <DataTable
          rows={data.refundAttempts}
          columns={[
            { key: "attemptNumber", label: "Attempt" },
            { key: "attemptedAt", label: "Attempted at", render: (row) => formatDate(row.attemptedAt) },
            { key: "refundMethod", label: "Method" },
            { key: "refundGateway", label: "Gateway" },
            { key: "attemptAmount", label: "Amount", render: (row) => formatMoney(row.attemptAmount) },
            { key: "status", label: "Status" },
            { key: "refundReference", label: "Reference" },
            { key: "failureReason", label: "Failure reason" },
          ]}
        />
      </Section>

      <Section title="Price Adjustments">
        <DataTable
          rows={data.priceAdjustments}
          columns={[
            { key: "adjustmentDate", label: "Date" },
            { key: "adjustmentType", label: "Type" },
            { key: "flowType", label: "Flow" },
            { key: "amountExclGst", label: "Amount", render: (row) => formatMoney(row.amountExclGst) },
            { key: "gstRate", label: "GST rate", render: (row) => (row.gstRate ? `${row.gstRate}%` : "N/A") },
            { key: "gstAmount", label: "GST", render: (row) => formatMoney(row.gstAmount) },
            { key: "amountInclGst", label: "Final", render: (row) => formatMoney(row.amountInclGst) },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>

      <Section title="Owner Settlement" empty={!ownerSettlement}>
        <MetricGrid
          items={[
            ["Status", formatValue(ownerSettlement?.status)],
            ["Booking amount", formatMoney(ownerSettlement?.totalBookingAmount)],
            ["Revenue excl GST", formatMoney(ownerSettlement?.effectiveRevenueExclGst)],
            ["Commission excl GST", formatMoney(ownerSettlement?.commissionAmountExclCommissionGst)],
            ["Commission GST", formatMoney(ownerSettlement?.commissionGst)],
            ["Owner payout excl GST", formatMoney(ownerSettlement?.ownerPayoutExclGst)],
            ["TDS amount", formatMoney(ownerSettlement?.tdsAmount)],
            ["Net payable", formatMoney(ownerSettlement?.netPayableToOwner)],
            ["Owner GST registered", formatValue(ownerSettlement?.isOwnerGstRegistered)],
          ]}
        />
      </Section>

      <Section title="Payment Schedule" empty={!paymentSchedule}>
        <MetricGrid
          items={[
            ["Total amount", formatMoney(paymentSchedule?.totalBookingAmount)],
            ["Advance amount", formatMoney(paymentSchedule?.advanceAmount)],
            ["Remaining amount", formatMoney(paymentSchedule?.remainingAmount)],
            ["Advance paid at", formatDate(paymentSchedule?.advancePaidAt)],
            ["Remaining due date", formatDate(paymentSchedule?.remainingPaymentDueDate)],
            ["Advance payment id", formatValue(paymentSchedule?.advancePaymentId)],
          ]}
        />
      </Section>

      <Section title="Owner Settlement Adjustments">
        <DataTable
          rows={data.ownerSettlementAdjustments}
          columns={[
            { key: "adjustmentDate", label: "Date" },
            { key: "adjustmentType", label: "Type" },
            { key: "direction", label: "Direction" },
            { key: "amountExclGst", label: "Amount excl GST", render: (row) => formatMoney(row.amountExclGst) },
            { key: "gstRate", label: "GST rate", render: (row) => (row.gstRate ? `${row.gstRate}%` : "N/A") },
            { key: "gstAmount", label: "GST", render: (row) => formatMoney(row.gstAmount) },
            { key: "amountInclGst", label: "Amount incl GST", render: (row) => formatMoney(row.amountInclGst) },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>

      <Section title="Owner Wallet Ledger">
        <DataTable
          rows={data.ownerWalletLedger}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "entryType", label: "Entry" },
            { key: "componentType", label: "Component" },
            { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount) },
            { key: "status", label: "Status" },
            { key: "accountingDate", label: "Accounting date" },
            { key: "referenceId", label: "Reference" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>

      <Section title="Platform Ledger">
        <DataTable
          rows={data.platformLedger}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "entryType", label: "Entry" },
            { key: "category", label: "Category" },
            { key: "amountExclCommissionGst", label: "Amount excl GST", render: (row) => formatMoney(row.amountExclCommissionGst) },
            { key: "commissionGstAmount", label: "GST", render: (row) => formatMoney(row.commissionGstAmount) },
            { key: "amountInclCommissionGst", label: "Amount incl GST", render: (row) => formatMoney(row.amountInclCommissionGst) },
            { key: "accountingDate", label: "Accounting date" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>

      <Section title="TDS Records">
        <DataTable
          rows={data.tdsRecords}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "entryType", label: "Entry" },
            { key: "referenceType", label: "Reference type" },
            { key: "baseAmount", label: "Base", render: (row) => formatMoney(row.baseAmount) },
            { key: "tdsRate", label: "TDS rate", render: (row) => `${formatValue(row.tdsRate)}%` },
            { key: "tdsAmount", label: "TDS amount", render: (row) => formatMoney(row.tdsAmount) },
            { key: "remarks", label: "Remarks" },
          ]}
        />
      </Section>

      <Section title="GST Records">
        <DataTable
          rows={data.gstRecords}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "gstType", label: "GST type" },
            { key: "referenceType", label: "Reference type" },
            { key: "taxableAmountExclGst", label: "Taxable", render: (row) => formatMoney(row.taxableAmountExclGst) },
            { key: "gstRate", label: "GST rate", render: (row) => `${formatValue(row.gstRate)}%` },
            { key: "gstAmount", label: "GST amount", render: (row) => formatMoney(row.gstAmount) },
            { key: "liabilityHolder", label: "Liability" },
            { key: "entryDirection", label: "Direction" },
          ]}
        />
      </Section>

      <Section title="Audit Logs">
        <DataTable
          rows={bookingLogs}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "event", label: "Event" },
            { key: "status", label: "Status" },
            { key: "message", label: "Message" },
          ]}
        />
      </Section>

      <Section title="Notification Delivery">
        <DataTable
          rows={notifications}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "channel", label: "Channel" },
            { key: "recipientType", label: "Recipient type" },
            { key: "status", label: "Status" },
            { key: "notificationType", label: "Type" },
            { key: "title", label: "Title" },
            {
              key: "recipientData",
              label: "Recipient",
              render: (row) => row.recipientData?.name || "N/A",
            },
          ]}
        />
      </Section>

      <Section title="Notification Events">
        <DataTable
          rows={notificationEvents}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "eventType", label: "Event type" },
            { key: "status", label: "Status" },
            { key: "eventId", label: "Event id" },
          ]}
        />
      </Section>

      <Section title="Notification Dead Letters">
        <DataTable
          rows={notificationDeadLetters}
          columns={[
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "queueName", label: "Queue" },
            { key: "jobId", label: "Job id" },
            { key: "attemptsMade", label: "Attempts" },
            { key: "errorMessage", label: "Error" },
          ]}
        />
      </Section>

      <Section title="Raw Related Data" empty={!relatedData}>
        {relatedData ? <JsonBlock value={relatedData} /> : null}
      </Section>
    </div>
  );
}
