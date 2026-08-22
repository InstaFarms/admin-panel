import { apiGet, buildQueryString } from "@/utils/api-utils";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

type ExportColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "currency" | "date" | "dateTime" | "badge" | "boolean";
};

async function getAuthToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

function valueAt(row: any, path: string): any {
  return path.split(".").reduce((value, key) => value?.[key], row);
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCell(value: any, type?: ExportColumn["type"]) {
  if (value === null || value === undefined || value === "") return "";
  if (type === "boolean" || typeof value === "boolean") return value ? "Yes" : "No";
  if (type === "currency") {
    const amount = Number(value);
    return Number.isFinite(amount) ? currencyFormatter.format(amount) : "";
  }
  if (type === "number" || typeof value === "number") return Number.isFinite(Number(value)) ? Number(value) : "";
  if ((type === "date" || type === "dateTime") || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    return new Date(value).toLocaleString("en-IN");
  }
  return String(value);
}

function rowsForExport(rows: any[], columns: ExportColumn[]) {
  return rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => [column.label, formatCell(valueAt(row, column.key), column.type)])
    )
  );
}

function toCsv(rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");
    const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const filename = url.searchParams.get("filename") || "finance-export";
    const columnsRaw = url.searchParams.get("columns");

    if (!endpoint || !columnsRaw) {
      return new Response("Missing export endpoint or columns", { status: 400 });
    }

    const columns = JSON.parse(columnsRaw) as ExportColumn[];
    const passthroughParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (!["endpoint", "format", "filename", "columns", "page"].includes(key)) {
        passthroughParams[key] = value;
      }
    });
    passthroughParams.limit = passthroughParams.limit || "5000";

    const token = await getAuthToken();
    const query = buildQueryString(passthroughParams);
    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/finance/admin/${endpoint}${query}`,
      { token }
    );
    const exportRows = rowsForExport(response.data ?? [], columns);

    if (format === "xlsx") {
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    return new Response(toCsv(exportRows), {
      headers: {
        "content-type": "text/csv;charset=utf-8",
        "content-disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("[Admin Finance] Export failed", error);
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 500 });
  }
}
