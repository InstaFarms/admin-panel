"use client";

import { useState, useTransition, useCallback } from "react";
import toast from "react-hot-toast";
import CAReportsFilters from "@/components/reports/CAReportsFilters";
import CAReportsTable   from "@/components/reports/CAReportsTable";
import { getCAReport }  from "@/actions/caReportsActions";
import type { CAReportResult } from "@repo/services/reporting-service";
import type { CAReportRequestBody } from "@/actions/caReportsActions";

// CSV export helper
function exportToCSV(report: CAReportResult) {
  const headers = [
    "Booking ID","Created At","Check-in","Check-out","Customer Name","Customer Email",
    "Property","City","Booking Source","Booking Type","Status","Payment Status",
    "Nights","Adults","Accommodation Charges","Service Fees","PG Charge",
    "Total Discounts","Grand Total","GST Collected","CGST","SGST","IGST","GST Rate(s)",
    "Base (ex-GST)","Platform Revenue","Owner Revenue (pre-TDS)","TDS","Owner Payout (post-TDS)","Refund Amount",
    "Is Valid","Invalid Reasons"
  ];

  const rows = report.rows.map(r => [
    r.bookingId, r.createdAt, r.checkinDate, r.checkoutDate,
    r.customerName, r.customerEmail ?? "",
    r.propertyName, r.city, r.bookingSource, r.bookingType,
    r.status, r.paymentStatus,
    r.nights, r.adultCount,
    r.accommodationCharges.toFixed(2), r.serviceFees.toFixed(2),
    r.pgCharge.toFixed(2), r.totalDiscounts.toFixed(2),
    r.grandTotal.toFixed(2), r.gstCollected.toFixed(2),
    r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2),
    (r.gstRates?.length ? r.gstRates.join("|") : ""),
    r.baseAmountExGst.toFixed(2), r.platformRevenue.toFixed(2),
    r.ownerRevenue.toFixed(2), r.tds.toFixed(2), r.ownerPayout.toFixed(2),
    r.refundAmount.toFixed(2),
    r.isValid ? "yes" : "no",
    (r.invalidReasons?.length ? r.invalidReasons.join(" | ") : ""),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ca-report-${report.filters.dateFrom}-to-${report.filters.dateTo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DEFAULT_FILTERS: CAReportRequestBody = {
  preset:  "this_month",
  groupBy: "month",
};

export type CAReportsPageProps = {
  title: string;
  description?: string;
  appType?: string;
};

export default function CAReportsPage({
  title,
  description = "Tax, GST & revenue reports for your chartered accountant",
  appType,
}: CAReportsPageProps) {
  const [filters, setFilters]   = useState<CAReportRequestBody>(DEFAULT_FILTERS);
  const [report,  setReport]    = useState<CAReportResult | null>(null);
  const [loading, startTransition] = useTransition();

  const reportOptions = appType ? { appType } : undefined;

  const handleApply = useCallback(() => {
    startTransition(async () => {
      const result = await getCAReport(filters, reportOptions);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.success) {
        setReport(result.success);
        toast.success(`Report generated — ${result.success.summary.totalBookings} bookings`);
      }
    });
  }, [filters, reportOptions]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        {report && (
          <button
            onClick={() => exportToCSV(report)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <CAReportsFilters
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        loading={loading}
      />

      {/* Report meta info */}
      {report && (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Period: <strong className="text-gray-700 dark:text-gray-300">
              {report.filters.dateFrom} → {report.filters.dateTo}
            </strong>
          </span>
          <span>·</span>
          <span>
            Generated: <strong className="text-gray-700 dark:text-gray-300">
              {new Date(report.generatedAt).toLocaleString("en-IN")}
            </strong>
          </span>
          <button
            onClick={handleApply}
            disabled={loading}
            className="ml-auto text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      )}

      {/* Report output */}
      {!loading && report && <CAReportsTable report={report} />}

      {/* Empty state */}
      {!loading && !report && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
            <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No report generated yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select a period and click "Generate Report"</p>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Generate Report
          </button>
        </div>
      )}
    </div>
  );
}