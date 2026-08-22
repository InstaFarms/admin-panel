"use client";

import { useState } from "react";
import type { CAReportResult, CAReportBookingRow, CAReportGroupRow } from "@repo/services/reporting-service";

interface CAReportsTableProps {
  report: CAReportResult;
}

function fmt(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtN(n: number): string {
  return n.toLocaleString("en-IN");
}

// ── Summary Cards ─────────────────────────────────────────────────────────────
function SummaryCards({ report }: { report: CAReportResult }) {
  const s = report.summary;
  const gstSplit =
    s.totalGstCollected > 0
      ? `CGST: ${fmt(s.totalGstCollected / 2)} · SGST: ${fmt(s.totalGstCollected / 2)}`
      : "No GST collected";
  const cards = [
    { label: "Total Bookings",       value: fmtN(s.totalBookings),       sub: `${s.confirmedBookings} confirmed · ${s.cancelledBookings} cancelled · ${s.invalidBookings} invalid`, color: "blue" },
    { label: "Gross Revenue",        value: fmt(s.grossRevenue),          sub: `Confirmed & valid only · ${fmtN(s.totalNights)} nights`, color: "green" },
    { label: "GST Collected",        value: fmt(s.totalGstCollected),     sub: `${gstSplit} · Base (ex-GST): ${fmt(s.totalBaseAmountExGst)}`, color: "purple" },
    { label: "Platform Revenue",     value: fmt(s.totalPlatformRevenue),  sub: "Platform commission (excludes GST)", color: "indigo" },
    { label: "Owner Revenue",        value: fmt(s.totalOwnerRevenue),     sub: `Pre-TDS · TDS: ${fmt(s.totalTds)} · Payout: ${fmt(s.totalOwnerPayout)}`, color: "teal" },
    { label: "Total Discounts",      value: fmt(s.totalDiscounts),        sub: "Discounts on confirmed & valid bookings", color: "orange" },
    { label: "Total Refunds",        value: fmt(s.totalRefunds),          sub: "Refunds from cancelled bookings", color: "red" },
  ];

  const colorMap: Record<string, string> = {
    blue:   "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700",
    green:  "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700",
    purple: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700",
    indigo: "from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700",
    teal:   "from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700",
    orange: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700",
    red:    "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700",
  };

  const textMap: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-400", green: "text-green-700 dark:text-green-400",
    purple: "text-purple-700 dark:text-purple-400", indigo: "text-indigo-700 dark:text-indigo-400",
    teal: "text-teal-700 dark:text-teal-400", orange: "text-orange-700 dark:text-orange-400",
    red: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className={`bg-gradient-to-br ${colorMap[card.color]} rounded-xl border p-4 shadow-sm`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMap[card.color]}`}>
            {card.label}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Source Breakdown ──────────────────────────────────────────────────────────
function SourceBreakdown({ report }: { report: CAReportResult }) {
  const bySource = report.summary.bySource;
  const sources  = Object.entries(bySource as Record<string, any>);
  if (sources.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Revenue by Booking Source</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Source</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Bookings</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Gross Revenue</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">GST</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">CGST</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">SGST</th>
            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">IGST</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {sources.map(([src, data]) => (
            <tr key={src} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white capitalize">{src}</td>
              <td className="px-5 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtN(data.count)}</td>
              <td className="px-5 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{fmt(data.grossRevenue)}</td>
              <td className="px-5 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(data.gst)}</td>
              <td className="px-5 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(data.cgst)}</td>
              <td className="px-5 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(data.sgst)}</td>
              <td className="px-5 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(data.igst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Group Breakdown Table ─────────────────────────────────────────────────────
function GroupsTable({ groups }: { groups: CAReportGroupRow[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Grouped Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[
                "Period / Group",
                "Bookings (Confirmed & Valid)",
                "Gross Revenue",
                "GST",
                "CGST",
                "SGST",
                "IGST",
                "Base (ex-GST)",
                "Platform Fee",
                "Owner Revenue (pre-TDS)",
                "TDS",
                "Owner Payout (post-TDS)",
                "Discounts",
              ].map(h => (
                <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase ${h === "Period / Group" ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {groups.map((g, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{g.label}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtN(g.bookings)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{fmt(g.grossRevenue)}</td>
                <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(g.gstCollected)}</td>
                <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(g.cgst)}</td>
                <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(g.sgst)}</td>
                <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{fmt(g.igst)}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(g.baseAmountExGst)}</td>
                <td className="px-4 py-2.5 text-right text-indigo-600 dark:text-indigo-400">{fmt(g.platformRevenue)}</td>
                <td className="px-4 py-2.5 text-right text-teal-600 dark:text-teal-400">{fmt(g.ownerRevenue)}</td>
                <td className="px-4 py-2.5 text-right text-teal-600 dark:text-teal-400">{fmt(g.tds)}</td>
                <td className="px-4 py-2.5 text-right text-teal-600 dark:text-teal-400">{fmt(g.ownerPayout)}</td>
                <td className="px-4 py-2.5 text-right text-orange-600 dark:text-orange-400">{fmt(g.totalDiscounts)}</td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
            <tr>
              <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">Total</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmtN(groups.reduce((s, g) => s + g.bookings, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.grossRevenue, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.gstCollected, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.cgst, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.sgst, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.igst, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.baseAmountExGst, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.platformRevenue, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.ownerRevenue, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.tds, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.ownerPayout, 0))}</td>
              <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(groups.reduce((s, g) => s + g.totalDiscounts, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Booking Detail Table ──────────────────────────────────────────────────────
function BookingDetailTable({ rows }: { rows: CAReportBookingRow[] }) {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 50;

  const filtered = rows.filter(r =>
    !search ||
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.bookingId.toLowerCase().includes(search.toLowerCase()) ||
    r.propertyName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Booking Details ({filtered.length} bookings)
        </h3>
        <input
          type="text"
          placeholder="Search by name, booking ID or property…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
            <tr>
              {[
                "Booking ID","Date","Check-in","Check-out","Customer","Property","City",
                "Source","Status","Nights","Grand Total","GST","CGST","SGST","IGST","GST Rate(s)","Base Ex-GST",
                "Platform Fee","Owner Revenue (pre-TDS)","TDS","Owner Payout (post-TDS)","Discounts","Refund","Valid"
              ].map(h => (
                <th key={h} className={`px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${["Booking ID","Customer","Property"].includes(h) ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {paged.map(r => (
              <tr key={r.bookingId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!r.isValid ? "bg-red-50/60 dark:bg-red-900/10" : ""}`}>
                <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {r.bookingId.substring(0, 8).toUpperCase()}…
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">{r.createdAt}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">{r.checkinDate}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">{r.checkoutDate}</td>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap max-w-[140px] truncate">{r.customerName}</td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">{r.propertyName}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.city}</td>
                <td className="px-3 py-2 text-right">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">{r.bookingSource}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${r.status === "CONFIRMED" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : r.status === "CANCELLED" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{r.nights}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{fmt(r.grandTotal)}</td>
                <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">{fmt(r.gstCollected)}</td>
                <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">{fmt(r.cgst)}</td>
                <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">{fmt(r.sgst)}</td>
                <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400">{fmt(r.igst)}</td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{r.gstRates?.length ? r.gstRates.join(",") + "%" : "—"}</td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmt(r.baseAmountExGst)}</td>
                <td className="px-3 py-2 text-right text-indigo-600 dark:text-indigo-400">{fmt(r.platformRevenue)}</td>
                <td className="px-3 py-2 text-right text-teal-600 dark:text-teal-400">{fmt(r.ownerRevenue)}</td>
                <td className="px-3 py-2 text-right text-teal-600 dark:text-teal-400">{r.tds > 0 ? fmt(r.tds) : "—"}</td>
                <td className="px-3 py-2 text-right text-teal-600 dark:text-teal-400">{fmt(r.ownerPayout)}</td>
                <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">{fmt(r.totalDiscounts)}</td>
                <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{r.refundAmount > 0 ? fmt(r.refundAmount) : "—"}</td>
                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                  {r.isValid ? "yes" : "no"}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={17} className="px-5 py-8 text-center text-gray-400 dark:text-gray-500">
                  No bookings found for selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Page {page} of {totalPages} · {filtered.length} rows</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function CAReportsTable({ report }: CAReportsTableProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Metric definitions</div>
        <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li><strong className="text-gray-700 dark:text-gray-300">Gross Revenue</strong>: Sum of <strong className="text-gray-700 dark:text-gray-300">Grand Total</strong> for <strong className="text-gray-700 dark:text-gray-300">CONFIRMED & valid</strong> bookings. Grand Total is <strong className="text-gray-700 dark:text-gray-300">GST-inclusive</strong>.</li>
          <li><strong className="text-gray-700 dark:text-gray-300">GST (Total/CGST/SGST/IGST)</strong>: Derived from stored booking GST. Split defaults to <strong className="text-gray-700 dark:text-gray-300">CGST+SGST</strong> in absence of place-of-supply context.</li>
          <li><strong className="text-gray-700 dark:text-gray-300">Base (ex-GST)</strong>: \(Grand\ Total - GST\).</li>
          <li><strong className="text-gray-700 dark:text-gray-300">Platform Fee</strong>: Platform commission (`instafarmsCommission`).</li>
          <li><strong className="text-gray-700 dark:text-gray-300">Owner Revenue (pre-TDS)</strong>: Amount before TDS deduction. <strong className="text-gray-700 dark:text-gray-300">Owner Payout</strong>: Amount payable after TDS.</li>
          <li><strong className="text-gray-700 dark:text-gray-300">Invalid bookings</strong>: Rows with ₹0 totals, invalid dates, or missing status are flagged and excluded from financial totals.</li>
        </ul>
      </div>
      <SummaryCards report={report} />
      {report.groups.length > 0 && <GroupsTable groups={report.groups} />}
      <SourceBreakdown report={report} />
      <BookingDetailTable rows={report.rows} />
    </div>
  );
}
