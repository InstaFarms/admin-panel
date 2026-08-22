import { getFinanceList } from "@/actions/financeActions";
import FinanceTable, { type FinanceColumn } from "@/components/finance/FinanceTable";
import type { ServerPageProps } from "@/utils/types";
import Link from "next/link";

function tabHref(searchParams: Record<string, any>, tab: "tds" | "gst") {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && key !== "page") {
      params.set(key, String(value));
    }
  });
  params.set("tab", tab);
  return `/admin/finance/tax-records?${params.toString()}`;
}

const tdsColumns: FinanceColumn[] = [
  { key: "brandId", label: "Brand ID" },
  { key: "ownerId", label: "Owner ID" },
  { key: "propertyId", label: "Property ID" },
  { key: "bookingId", label: "Booking", href: (row) => row.bookingId ? `/admin/bookings/${row.bookingId}` : null },
  { key: "referenceType", label: "Reference Type" },
  { key: "referenceId", label: "Reference ID" },
  { key: "baseAmount", label: "Base Amount", type: "currency", align: "right", sortKey: "baseAmount" },
  { key: "tdsRate", label: "TDS Rate", align: "right", render: (row) => `${row.tdsRate ?? 0}%` },
  { key: "tdsBaseAmount", label: "TDS Base", type: "currency", align: "right" },
  { key: "tdsAmount", label: "TDS Amount", type: "currency", align: "right", sortKey: "tdsAmount" },
  { key: "entryType", label: "Entry", type: "badge" },
  { key: "stayMonth", label: "Stay Month", type: "number", align: "right" },
  { key: "stayYear", label: "Stay Year", type: "number", align: "right" },
  { key: "taxEventMonth", label: "Tax Event Month", type: "number", align: "right", sortKey: "taxEventMonth" },
  { key: "taxEventYear", label: "Tax Event Year", type: "number", align: "right" },
];

const gstColumns: FinanceColumn[] = [
  { key: "brandId", label: "Brand ID" },
  { key: "ownerId", label: "Owner ID" },
  { key: "propertyId", label: "Property ID" },
  { key: "bookingId", label: "Booking", href: (row) => row.bookingId ? `/admin/bookings/${row.bookingId}` : null },
  { key: "gstType", label: "GST Type" },
  { key: "referenceType", label: "Reference Type" },
  { key: "referenceId", label: "Reference ID" },
  { key: "taxableAmountExclGst", label: "Taxable Amount", type: "currency", align: "right", sortKey: "taxableAmountExclGst" },
  { key: "gstRate", label: "GST Rate", type: "number", align: "right" },
  { key: "gstAmount", label: "GST Amount", type: "currency", align: "right", sortKey: "gstAmount" },
  { key: "liabilityHolder", label: "Liability" },
  { key: "entryDirection", label: "Direction" },
  { key: "sacCode", label: "SAC" },
  { key: "bookingMonth", label: "Booking Month", type: "number", align: "right" },
  { key: "bookingYear", label: "Booking Year", type: "number", align: "right" },
  { key: "taxEventMonth", label: "Tax Event Month", type: "number", align: "right", sortKey: "taxEventMonth" },
  { key: "taxEventYear", label: "Tax Event Year", type: "number", align: "right" },
];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const tab = params?.tab === "gst" ? "gst" : "tds";
  const result = await getFinanceList(tab === "gst" ? "tax-records/gst" : "tax-records/tds", params);

  return (
    <FinanceTable
      title={tab === "gst" ? "GST Records" : "TDS Records"}
      description={tab === "gst" ? "GST record reporting by booking/tax event month and liability holder." : "TDS record reporting by stay month, tax event month, owner, and property."}
      columns={tab === "gst" ? gstColumns : tdsColumns}
      rows={result.data}
      message={result.message}
      summary={result.summary}
      summaryCards={
        tab === "gst"
          ? [
              { key: "totalRecords", label: "Matching Records", type: "number" },
              { key: "taxableAmountTotal", label: "Taxable Total", type: "currency" },
              { key: "gstAmountTotal", label: "GST Total", type: "currency" },
            ]
          : [
              { key: "totalRecords", label: "Matching Records", type: "number" },
              { key: "baseAmountTotal", label: "Base Total", type: "currency" },
              { key: "tdsAmountTotal", label: "TDS Total", type: "currency" },
            ]
      }
      hiddenParams={{ tab }}
      searchParams={params}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Link href={tabHref(params, "tds")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "tds" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white/80 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/70 dark:text-gray-200 dark:ring-gray-700"}`}>
            TDS Records
          </Link>
          <Link href={tabHref(params, "gst")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "gst" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white/80 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/70 dark:text-gray-200 dark:ring-gray-700"}`}>
            GST Records
          </Link>
        </div>
      }
      filterFields={[
        { name: "brandId", label: "Brand ID", placeholder: "Search by brand id" },
        { name: "ownerId", label: "Owner ID", placeholder: "Search by owner id" },
        { name: "propertyId", label: "Property ID", placeholder: "Search by property id" },
        { name: "bookingId", label: "Booking ID", placeholder: "Search by booking id" },
        { name: "referenceType", label: "Reference Type", placeholder: "Booking / Settlement / Adjustment" },
        { name: "taxEventMonth", label: "Tax Event Month", type: "number", placeholder: "1-12" },
        { name: "taxEventYear", label: "Tax Event Year", type: "number", placeholder: "2026" },
        ...(tab === "gst"
          ? [
              { name: "gstType", label: "GST Type", placeholder: "Output / Input / Reverse charge" },
              { name: "liabilityHolder", label: "Liability Holder", placeholder: "Platform / Owner" },
              { name: "entryDirection", label: "Entry Direction", placeholder: "Credit / Debit" },
              { name: "bookingMonth", label: "Booking Month", type: "number", placeholder: "1-12" },
              { name: "bookingYear", label: "Booking Year", type: "number", placeholder: "2026" },
            ]
          : [
              { name: "entryType", label: "Entry Type", placeholder: "Credit / Debit / Reversal" },
              { name: "stayMonth", label: "Stay Month", type: "number", placeholder: "1-12" },
              { name: "stayYear", label: "Stay Year", type: "number", placeholder: "2026" },
            ]),
      ]}
      pagination={result.pagination}
      exportFilename={tab === "gst" ? "gst-records" : "tds-records"}
      exportEndpoint={tab === "gst" ? "tax-records/gst" : "tax-records/tds"}
    />
  );
}
