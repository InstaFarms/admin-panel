"use client";

import * as XLSX from "xlsx";

type ExportRow = Record<string, string | number | boolean | null | undefined>;

interface FinanceExportButtonsProps {
  filename: string;
  rows: ExportRow[];
  csvHref?: string;
  xlsxHref?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportCsv(filename: string, rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

function exportXlsx(filename: string, rows: ExportRow[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export default function FinanceExportButtons({ filename, rows, csvHref, xlsxHref }: FinanceExportButtonsProps) {
  const disabled = rows.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      {csvHref ? (
        <a href={csvHref} className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
          Export CSV
        </a>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => exportCsv(filename, rows)}
          className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV
        </button>
      )}
      {xlsxHref ? (
        <a href={xlsxHref} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Export XLSX
        </a>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => exportXlsx(filename, rows)}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export XLSX
        </button>
      )}
    </div>
  );
}
