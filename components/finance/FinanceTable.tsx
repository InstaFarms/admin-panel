import type { ReactNode } from "react";
import Link from "next/link";
import FinanceExportButtons from "./FinanceExportButtons";
import FinanceRecordDialog from "./FinanceRecordDialog";

export type FinanceColumnType = "text" | "number" | "currency" | "date" | "dateTime" | "badge" | "boolean";

export type FinanceColumn = {
  key: string;
  label: string;
  href?: (row: any) => string | null | undefined;
  type?: FinanceColumnType;
  render?: (row: any) => ReactNode;
  sortKey?: string;
  align?: "left" | "center" | "right";
};

export type FinanceFilterField = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

export type FinanceSummaryCard = {
  key: string;
  label: string;
  type?: FinanceColumnType;
};

interface FinanceTableProps {
  title: string;
  description: string;
  columns: FinanceColumn[];
  rows: any[];
  exportFilename: string;
  exportEndpoint?: string;
  filterFields?: FinanceFilterField[];
  hiddenParams?: Record<string, string>;
  searchParams?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: Record<string, unknown>;
  summaryCards?: FinanceSummaryCard[];
  message?: string;
  headerActions?: ReactNode;
  sortParamPrefix?: string;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function valueAt(row: any, path: string): any {
  return path.split(".").reduce((value, key) => value?.[key], row);
}

function titleCase(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatByType(value: any, type: FinanceColumnType = "text") {
  if (value === null || value === undefined || value === "") return "N/A";

  if (type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (type === "currency") {
    const amount = Number(value);
    return Number.isFinite(amount) ? currencyFormatter.format(amount) : "N/A";
  }

  if (type === "number") {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString("en-IN") : "N/A";
  }

  if (type === "date" || type === "dateTime") {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-IN", type === "date"
      ? { day: "2-digit", month: "short", year: "numeric" }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-IN") : "N/A";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-IN");
    }
  }

  return String(value);
}

function badgeClass(value: unknown) {
  const normalized = String(value ?? "").toUpperCase();
  if (["PAID", "COMPLETED", "CONFIRMED", "SUCCESS", "CREDIT", "AVAILABLE", "PROCESSED"].includes(normalized)) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (["PENDING", "PROCESSING", "QUEUED", "HOLD", "REQUESTED"].includes(normalized)) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (["FAILED", "CANCELLED", "CANCELED", "DEBIT", "REVERSED", "REFUNDED"].includes(normalized)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function exportRows(rows: any[], columns: FinanceColumn[]) {
  return rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => [column.label, formatByType(valueAt(row, column.key), column.type)])
    )
  );
}

function exportHref(
  format: "csv" | "xlsx",
  endpoint: string | undefined,
  filename: string,
  columns: FinanceColumn[],
  currentParams?: Record<string, any>,
  hiddenParams?: Record<string, string>
) {
  if (!endpoint) return undefined;

  const params = new URLSearchParams();
  Object.entries(currentParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== "page") {
      params.set(key, String(value));
    }
  });
  Object.entries(hiddenParams ?? {}).forEach(([key, value]) => {
    params.set(key, value);
  });
  params.set("endpoint", endpoint);
  params.set("format", format);
  params.set("filename", filename);
  params.set(
    "columns",
    JSON.stringify(columns.map(({ key, label, type }) => ({ key, label, type })))
  );
  return `/admin/finance/export?${params.toString()}`;
}

function buildParams(currentParams?: Record<string, any>, hiddenParams?: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(currentParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  Object.entries(hiddenParams ?? {}).forEach(([key, value]) => {
    params.set(key, value);
  });
  return params;
}

function paginationHref(
  page: number,
  currentParams?: Record<string, any>,
  hiddenParams?: Record<string, string>
) {
  const params = buildParams(currentParams, hiddenParams);
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function paramHref(
  patch: Record<string, string | number | null | undefined>,
  currentParams?: Record<string, any>,
  hiddenParams?: Record<string, string>
) {
  const params = buildParams(currentParams, hiddenParams);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });
  if (!params.get("page") || patch.page === 1) {
    params.delete("page");
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "?";
}

function renderFilterInput(field: FinanceFilterField, searchParams?: Record<string, any>) {
  const commonClassName =
    "rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white";
  const value = searchParams?.[field.name] ? String(searchParams[field.name]) : "";

  if (field.type === "select") {
    return (
      <select name={field.name} defaultValue={value} className={commonClassName}>
        <option value="">All</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      name={field.name}
      type={field.type ?? "text"}
      defaultValue={value}
      placeholder={field.placeholder}
      className={commonClassName}
    />
  );
}

export default function FinanceTable({
  title,
  description,
  columns,
  rows,
  exportFilename,
  exportEndpoint,
  filterFields = [
    { name: "from", label: "From", type: "date" },
    { name: "to", label: "To", type: "date" },
    { name: "brandId", label: "Brand ID", placeholder: "Filter by brand" },
    { name: "propertyId", label: "Property ID", placeholder: "Filter by property" },
  ],
  hiddenParams,
  searchParams,
  pagination,
  summary,
  summaryCards,
  message,
  headerActions,
  sortParamPrefix,
}: FinanceTableProps) {
  const sortByParamName = sortParamPrefix ? `${sortParamPrefix}SortBy` : "sortBy";
  const sortDirParamName = sortParamPrefix ? `${sortParamPrefix}SortDir` : "sortDir";
  const limitParamName = sortParamPrefix ? `${sortParamPrefix}Limit` : "limit";
  const sortableColumns = columns.filter((column) => column.sortKey);
  const selectedSortBy = String(searchParams?.[sortByParamName] ?? sortableColumns[0]?.sortKey ?? "");
  const selectedSortDir = String(searchParams?.[sortDirParamName] ?? "desc");
  const selectedLimit = Number(searchParams?.[limitParamName] ?? pagination?.limit ?? 25);
  const showToolbarForm = filterFields.length > 0 || sortableColumns.length > 0 || Boolean(pagination);

  const activeFilterEntries = Object.entries(searchParams ?? {}).filter(([key, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (["page", sortByParamName, sortDirParamName, limitParamName].includes(key)) return false;
    return !hiddenParams || !(key in hiddenParams);
  });

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6">
      <div className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_46%,_#eef6ff_100%)] p-6 shadow-sm dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(135deg,_rgba(17,24,39,1)_0%,_rgba(15,23,42,1)_48%,_rgba(17,24,39,1)_100%)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Finance Workspace
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
            {pagination ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {rows.length} records on page {pagination.page} of {pagination.totalPages}. Total matching records:{" "}
                {pagination.total.toLocaleString("en-IN")}.
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {rows.length.toLocaleString("en-IN")} records.
              </p>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {headerActions}
            <FinanceExportButtons
              filename={exportFilename}
              rows={exportRows(rows, columns)}
              csvHref={exportHref("csv", exportEndpoint, exportFilename, columns, searchParams, hiddenParams)}
              xlsxHref={exportHref("xlsx", exportEndpoint, exportFilename, columns, searchParams, hiddenParams)}
            />
          </div>
        </div>

        {summaryCards && summaryCards.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/70"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  {card.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatByType(summary?.[card.key], card.type ?? "number")}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showToolbarForm ? (
      <form className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            {Object.entries(hiddenParams ?? {}).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            {filterFields.map((field) => (
              <label key={field.name} className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {field.label}
                {renderFilterInput(field, searchParams)}
              </label>
            ))}
        </div>

        {(sortableColumns.length > 0 || pagination) ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sortableColumns.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                Sort by
                <select
                  name={sortByParamName}
                  defaultValue={selectedSortBy}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {sortableColumns.map((column) => (
                    <option key={column.sortKey} value={column.sortKey}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {sortableColumns.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                Direction
                <select
                  name={sortDirParamName}
                  defaultValue={selectedSortDir}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="desc">Newest / Highest first</option>
                  <option value="asc">Oldest / Lowest first</option>
                </select>
              </label>
            ) : null}

            {pagination ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                Page size
                <select
                  name={limitParamName}
                  defaultValue={String(selectedLimit)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} rows
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            </div>

            <div className="flex items-end justify-end">
              <button className="w-full min-w-[140px] rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black lg:w-auto dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                Apply
              </button>
            </div>
          </div>
        ) : null}

        {activeFilterEntries.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeFilterEntries.map(([key, value]) => (
              <Link
                key={key}
                href={paramHref({ [key]: null, page: null }, searchParams, hiddenParams)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                <span>{titleCase(key)}: {String(value)}</span>
                <span aria-hidden="true">x</span>
              </Link>
            ))}
            <Link
              href={paramHref(
                Object.fromEntries(activeFilterEntries.map(([key]) => [key, null])),
                searchParams,
                hiddenParams
              )}
              className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Clear filters
            </Link>
          </div>
        ) : null}
      </form>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 ${
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="sticky right-0 whitespace-nowrap border-l border-gray-200 bg-gray-50 px-4 py-3 text-right dark:border-gray-700 dark:bg-gray-900">
                  Inspect
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-14 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <div className="text-base font-semibold text-gray-900 dark:text-white">No records found</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {message || "Try adjusting the filters, sort, or page size to widen the search."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id ?? row.booking?.id ?? row.payment?.id ?? row.refund?.id ?? row.settlement?.id ?? row.payout?.id ?? row.ledger?.id ?? index}
                    className="align-top text-gray-700 transition hover:bg-slate-50/80 dark:text-gray-200 dark:hover:bg-slate-900/40"
                  >
                    {columns.map((column) => {
                      const rawValue = valueAt(row, column.key);
                      const href = column.href?.(row);
                      const content =
                        column.type === "badge" ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(rawValue)}`}>
                            {formatByType(rawValue, column.type)}
                          </span>
                        ) : (
                          formatByType(rawValue, column.type)
                        );

                      return (
                        <td
                          key={column.key}
                          className={`whitespace-nowrap px-4 py-3 ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                        >
                          {href ? (
                            <Link href={href} className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}

                    <td className="sticky right-0 border-l border-gray-100 bg-white px-4 py-3 text-right dark:border-gray-700 dark:bg-gray-800">
                      <FinanceRecordDialog
                        title={`${title} record`}
                        record={row}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={paginationHref(Math.max(pagination.page - 1, 1), searchParams, hiddenParams)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                pagination.page <= 1
                  ? "pointer-events-none border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500"
                  : "border-gray-300 text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
              }`}
            >
              Previous
            </Link>
            <Link
              href={paginationHref(Math.min(pagination.page + 1, pagination.totalPages), searchParams, hiddenParams)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                pagination.page >= pagination.totalPages
                  ? "pointer-events-none border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500"
                  : "border-gray-300 text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
