import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";

const NON_PROPERTY_SHEETS = new Set(["Property Names", "Validation Lists", "Thresholds"]);
const PROPERTY_ID_RE = /Property ID:\s*([0-9a-fA-F-]{36})/;
const AUDIT_DATE_RE = /Audit Date:\s*(\d{2})\/(\d{2})\/(\d{4})/;
const AREA_LABEL_RE = /^\d+\.\s*(.+)$/;
const AREA_CATEGORY_RE = /^Area Category:\s*(.+)$/i;
const ITEM_TYPES = new Set(["INVENTORY", "SUPPLIES", "MAINTENANCE"]);

export interface ParsedItemRow {
  rowNumber: number;
  areaName: string;
  areaCategory: string;
  itemType: "INVENTORY" | "SUPPLIES" | "MAINTENANCE";
  itemName: string;
  quantityRaw: string | number;
  statusRaw: string;
  comments: string;
  expectedQty: number | null;
  requiredQty: number | null;
  criticalQty: number | null;
}

export interface ParsedPropertySession {
  sheet: string;
  propertyId: string;
  conductedByName: string;
  conductedByPhone: string;
  auditDateRaw: string;
  auditDateISO: string | null;
  auditType: "ROUTINE" | "QC_REVIEW";
  rows: ParsedItemRow[];
}

export type SkipReasonCode = "EMPTY_TEMPLATE" | "MISSING_AUDIT_DATE" | "MISSING_PROPERTY_ID";

export interface SkippedSheet {
  sheet: string;
  reasonCode: SkipReasonCode;
  reason: string;
}

export interface ParseResult {
  sessions: ParsedPropertySession[];
  skippedSheets: SkippedSheet[];
}

function cellStr(value: unknown): string {
  return String(value ?? "").trim();
}

function parseIntOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toIsoDate(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!d || !m || !y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  // Round-trip through Date to reject impossible combinations like 31/02/2026.
  const check = new Date(`${iso}T00:00:00.000Z`);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null;
  return iso;
}

export function parseAuditReportWorkbook(workbook: WorkBook): ParseResult {
  const sessions: ParsedPropertySession[] = [];
  const skippedSheets: SkippedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (NON_PROPERTY_SHEETS.has(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

    const propertyIdMatch = cellStr(rows[1]?.[0]).match(PROPERTY_ID_RE);
    const auditDateLine = cellStr(rows[3]?.[0]);
    const dateMatch = auditDateLine.match(AUDIT_DATE_RE);
    const conductedByName = cellStr(rows[2]?.[1]);
    const conductedByPhone = cellStr(rows[2]?.[3]);
    const hasAnyOtherData = Boolean(conductedByName || conductedByPhone || propertyIdMatch);

    if (!propertyIdMatch && !dateMatch) {
      skippedSheets.push({
        sheet: sheetName,
        reasonCode: "EMPTY_TEMPLATE",
        reason: hasAnyOtherData
          ? `Row 2 (Property ID) and row 4 (Audit Date) are both still empty — add "Property ID: <uuid>" to row 2 and "Audit Date: DD/MM/YYYY | Property Management Audit" to row 4.`
          : `This sheet hasn't been filled in yet — no Property ID, Conducted By, or Audit Date.`,
      });
      continue;
    }
    if (!propertyIdMatch) {
      skippedSheets.push({
        sheet: sheetName,
        reasonCode: "MISSING_PROPERTY_ID",
        reason: `Audit Date is filled in (${auditDateLine}), but row 2 has no "Property ID: <uuid>" line — add it and re-upload to import this one.`,
      });
      continue;
    }
    if (!dateMatch) {
      skippedSheets.push({
        sheet: sheetName,
        reasonCode: "MISSING_AUDIT_DATE",
        reason: hasAnyOtherData
          ? `Row 4 still just says "${auditDateLine || "Property Management Audit"}" — Conducted By/Phone are filled in, but the date itself is missing. Add "Audit Date: DD/MM/YYYY | " before that text (e.g. "Audit Date: 05/01/2026 | Property Management Audit") and fill in the item Status/Quantity rows below, then re-upload.`
          : `Row 4 has no "Audit Date: DD/MM/YYYY" — this sheet hasn't been audited yet.`,
      });
      continue;
    }

    const auditType: "ROUTINE" | "QC_REVIEW" = /QC[\s_-]?Review/i.test(auditDateLine) ? "QC_REVIEW" : "ROUTINE";
    const [, dd, mm, yyyy] = dateMatch;

    const itemRows: ParsedItemRow[] = [];
    let currentAreaLabel = "";
    let currentAreaCategory = "";
    let pendingAreaLabel = "";

    for (let i = 4; i < rows.length; i++) {
      const row = rows[i] || [];
      const c0 = cellStr(row[0]);

      if (c0 === "") continue;

      const areaLabelMatch = c0.match(AREA_LABEL_RE);
      if (areaLabelMatch && cellStr(row[1]) === "") {
        pendingAreaLabel = areaLabelMatch[1].trim();
        continue;
      }

      const categoryMatch = c0.match(AREA_CATEGORY_RE);
      if (categoryMatch) {
        currentAreaLabel = pendingAreaLabel;
        currentAreaCategory = categoryMatch[1].trim();
        continue;
      }

      if (c0 === "Category" && cellStr(row[1]) === "Checklist Item") continue; // header row

      const itemType = c0.toUpperCase();
      if (!ITEM_TYPES.has(itemType)) continue; // stray/unrecognized row — ignore rather than block the whole sheet

      const quantityRaw = row[2];
      const statusRaw = cellStr(row[3]);
      if (cellStr(quantityRaw) === "" && statusRaw === "") continue; // not filled in for this visit

      itemRows.push({
        rowNumber: i + 1,
        areaName: currentAreaLabel,
        areaCategory: currentAreaCategory,
        itemType: itemType as ParsedItemRow["itemType"],
        itemName: cellStr(row[1]),
        quantityRaw,
        statusRaw,
        comments: cellStr(row[4]),
        expectedQty: parseIntOrNull(row[7]),
        requiredQty: parseIntOrNull(row[8]),
        criticalQty: parseIntOrNull(row[9]),
      });
    }

    sessions.push({
      sheet: sheetName,
      propertyId: propertyIdMatch[1],
      conductedByName,
      conductedByPhone,
      auditDateRaw: auditDateLine,
      auditDateISO: toIsoDate(dd, mm, yyyy),
      auditType,
      rows: itemRows,
    });
  }

  return { sessions, skippedSheets };
}
