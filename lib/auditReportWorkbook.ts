import ExcelJS from "exceljs";

import { parseAdminDateTime } from "@/lib/dateUtils";

const COLORS = {
  title: "FF1F3864",
  subtitle: "FF5B2C82",
  areaHeader: "FFDCE6F1",
  columnHeader: "FFD9D9D9",
  white: "FFFFFFFF",
  border: "FFBFBFBF",
};

const thinBorder = { style: "thin" as const, color: { argb: COLORS.border } };
const TOTAL_COLUMNS = 10;

const COLUMN_WIDTHS = [16, 38, 12, 16, 30, 4, 4, 14, 18, 18];
const HEADER_LABELS = [
  "Category",
  "Checklist Item",
  "Quantity",
  "Status",
  "Comments",
  "",
  "",
  "Expected Qty",
  "Required Threshold",
  "Critical Threshold",
];

const CATEGORY_LIST = ["Maintenance", "Inventory", "Supplies"];
const STATUS_LIST = ["GOOD", "NEEDS_ATTENTION", "CRITICAL"];

// Fixed range references on "Validation Lists" (not named ranges — see the same note in
// export/config/route.ts: exceljs's definedNames API doesn't support the dynamic
// OFFSET/COUNTA formulas the original hand-built template used, so every dropdown points
// straight at a generously-sized fixed range instead). Same dropdown UX either way.
const CATEGORY_RANGE = "'Validation Lists'!$A$2:$A$200";
const STATUS_RANGE = "'Validation Lists'!$B$2:$B$200";
const CHECKLIST_ITEM_RANGE = "'Validation Lists'!$C$2:$C$1000";
const AREA_CATEGORY_RANGE = "'Validation Lists'!$D$2:$D$200";
const SUPERVISOR_RANGE = "'Validation Lists'!$F$2:$F$200";
const PHONE_RANGE = "'Validation Lists'!$G$2:$G$200";

function listValidation(formula: string, opts: { errorStyle?: "stop" | "warning"; title: string } = { title: "Invalid value" }) {
  return {
    type: "list" as const,
    allowBlank: true,
    showErrorMessage: true,
    errorStyle: opts.errorStyle ?? "stop",
    errorTitle: opts.title,
    error: "Pick a value from the Validation Lists sheet.",
    formulae: [formula],
  };
}

/**
 * Adds the "Validation Lists" reference sheet (Category/Status/Checklist Item/Area Category/
 * Supervisor/Phone columns) that every property sheet's dropdowns point at — same structure as
 * the shared "Refined Property Audit" template. Call this ONCE per workbook, before any
 * addAuditReportSheet calls (their cell-level dataValidation references these fixed ranges).
 */
export function addValidationListsSheet(
  workbook: ExcelJS.Workbook,
  data: { checklistItemNames: string[]; areaCategoryNames: string[]; supervisors: { name: string; phone: string }[] }
) {
  const sheet = workbook.addWorksheet("Validation Lists");
  sheet.columns = [{ width: 14 }, { width: 16 }, { width: 36 }, { width: 28 }, { width: 4 }, { width: 24 }, { width: 16 }];
  ["Category", "Status", "Checklist Item (from Config Lists)", "Area Category", "", "Supervisor", "Phone"].forEach(
    (label, i) => {
      const cell = sheet.getRow(1).getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true };
    }
  );

  const maxRows = Math.max(
    CATEGORY_LIST.length,
    STATUS_LIST.length,
    data.checklistItemNames.length,
    data.areaCategoryNames.length,
    data.supervisors.length
  );
  for (let i = 0; i < maxRows; i++) {
    const row = sheet.getRow(i + 2);
    if (CATEGORY_LIST[i]) row.getCell(1).value = CATEGORY_LIST[i];
    if (STATUS_LIST[i]) row.getCell(2).value = STATUS_LIST[i];
    if (data.checklistItemNames[i]) row.getCell(3).value = data.checklistItemNames[i];
    if (data.areaCategoryNames[i]) row.getCell(4).value = `Area Category: ${data.areaCategoryNames[i]}`;
    const supervisor = data.supervisors[i];
    if (supervisor) {
      row.getCell(6).value = supervisor.name;
      row.getCell(7).value = supervisor.phone;
    }
  }
}

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function fillRow(sheet: ExcelJS.Worksheet, rowNumber: number, argb: string, columns = TOTAL_COLUMNS) {
  const row = sheet.getRow(rowNumber);
  for (let c = 1; c <= columns; c++) {
    row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  }
}

/** A single-value banner row (title, Property ID, Audit Date): filled + merged full width. */
function bannerRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  value: string,
  opts: { color: string; bold?: boolean; italic?: boolean; size?: number; height?: number }
) {
  const row = sheet.getRow(rowNumber);
  row.height = opts.height ?? 20;
  row.getCell(1).value = value;
  sheet.mergeCells(rowNumber, 1, rowNumber, TOTAL_COLUMNS);
  fillRow(sheet, rowNumber, opts.color);
  row.getCell(1).font = { bold: opts.bold, italic: opts.italic, size: opts.size ?? 11, color: { argb: COLORS.white } };
  row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
}

function styleHeaderCell(sheet: ExcelJS.Worksheet, rowNumber: number, colNumber: number, value: string) {
  const cell = sheet.getRow(rowNumber).getCell(colNumber);
  cell.value = value;
  if (!value) return;
  cell.font = { bold: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.columnHeader } };
  cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
}

/**
 * Appends one audit session's report as a new worksheet in `workbook`, styled to match the
 * shared "Refined Property Audit" template (navy/purple banner, light-blue area headers) while
 * using the SAME plain data-entry cell layout the "Import audited report data" feature parses
 * (see apps/admin/lib/auditReportImportParser.ts) — a Property ID row, a Conducted By/Phone
 * row, an Audit Date row, then numbered area blocks with Category/Checklist Item/Quantity/
 * Status/Comments/Expected-Required-Critical Qty columns. Styling is purely cosmetic (the
 * parser only reads cell values), so exporting and re-importing a session round-trips
 * losslessly, and the sheet is editable in Excel and re-uploadable as-is.
 */
export function addAuditReportSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  reportData: { session: any; passedItems?: any[]; failedItems?: any[] }
) {
  const { session, passedItems = [], failedItems = [] } = reportData;
  const items = [...passedItems, ...failedItems];

  const areaOrder: string[] = [];
  const areaWeights: Record<string, number> = {};
  const areaCategoryByName: Record<string, string> = {};
  const itemsByArea: Record<string, any[]> = {};
  for (const item of items) {
    const areaName = item.areaName || "Other";
    if (!itemsByArea[areaName]) {
      itemsByArea[areaName] = [];
      areaOrder.push(areaName);
      areaWeights[areaName] = typeof item.areaWeight === "number" ? item.areaWeight : Number.MAX_SAFE_INTEGER;
      areaCategoryByName[areaName] = item.areaCategory || areaName;
    }
    itemsByArea[areaName].push(item);
  }
  areaOrder.sort((a, b) => areaWeights[a] - areaWeights[b] || a.localeCompare(b));

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  const auditDateTime = parseAdminDateTime(session.completedAt || session.startedAt);
  const auditDate = auditDateTime ? auditDateTime.toFormat("dd LLL yyyy") : "N/A";
  const auditDateDDMMYYYY = auditDateTime ? auditDateTime.toFormat("dd/LL/yyyy") : "";
  const auditTypeLabel = session.auditType === "QC_REVIEW" ? "QC Review" : "Property Management Audit";

  let rowIndex = 1;

  bannerRow(sheet, rowIndex++, `PROPERTY AUDIT REPORT: ${(session.propertyName || "UNKNOWN PROPERTY").toUpperCase()}`, {
    color: COLORS.title,
    bold: true,
    size: 14,
    height: 26,
  });

  bannerRow(sheet, rowIndex++, `Property ID: ${session.propertyId || ""}`, { color: COLORS.subtitle, italic: true });

  const conductedByRowNumber = rowIndex++;
  const conductedByRow = sheet.getRow(conductedByRowNumber);
  conductedByRow.height = 20;
  conductedByRow.getCell(1).value = "Conducted By:";
  conductedByRow.getCell(2).value = session.supervisorName || "";
  conductedByRow.getCell(3).value = "Phone Number:";
  conductedByRow.getCell(4).value = session.supervisorPhone || "";
  fillRow(sheet, conductedByRowNumber, COLORS.subtitle);
  [1, 2, 3, 4].forEach((c) => {
    conductedByRow.getCell(c).font = { italic: true, color: { argb: COLORS.white } };
  });
  conductedByRow.getCell(2).dataValidation = listValidation(SUPERVISOR_RANGE, { title: "Invalid Supervisor", errorStyle: "warning" });
  conductedByRow.getCell(4).dataValidation = listValidation(PHONE_RANGE, { title: "Invalid Phone", errorStyle: "warning" });

  // Template mode (no completedAt/startedAt yet) still shows the "Audit Date:" label with a
  // DD/MM/YYYY placeholder — a blank spot to fill in, not a silently missing line. "DD/MM/YYYY"
  // never matches the importer's date regex, so the sheet still reads as unfilled until
  // someone actually types a real date over it.
  bannerRow(
    sheet,
    rowIndex++,
    `Audit Date: ${auditDateDDMMYYYY || "DD/MM/YYYY"} | ${auditTypeLabel}`,
    { color: COLORS.subtitle, italic: true }
  );

  rowIndex++; // blank spacer row

  areaOrder.forEach((areaName, areaIdx) => {
    const areaHeaderRowNumber = rowIndex++;
    const areaHeaderRow = sheet.getRow(areaHeaderRowNumber);
    areaHeaderRow.height = 18;
    areaHeaderRow.getCell(1).value = `${areaIdx + 1}. ${areaName}`;
    sheet.mergeCells(areaHeaderRowNumber, 1, areaHeaderRowNumber, TOTAL_COLUMNS);
    fillRow(sheet, areaHeaderRowNumber, COLORS.areaHeader);
    areaHeaderRow.getCell(1).font = { bold: true, size: 12 };

    const areaCategoryRow = sheet.getRow(rowIndex++);
    areaCategoryRow.getCell(1).value = `Area Category: ${areaCategoryByName[areaName] || ""}`;
    areaCategoryRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF595959" } };
    areaCategoryRow.getCell(1).dataValidation = listValidation(AREA_CATEGORY_RANGE, { title: "Invalid Area Category" });

    const headerRowNumber = rowIndex++;
    HEADER_LABELS.forEach((label, i) => styleHeaderCell(sheet, headerRowNumber, i + 1, label));

    itemsByArea[areaName].forEach((item) => {
      const row = sheet.getRow(rowIndex++);
      const isQuantityItem = item.section === "INVENTORY" || item.section === "SUPPLIES";
      const comments = item.notes || item.issueType || "";

      const values: (string | number)[] = [
        titleCase(item.section || ""),
        item.masterName || "",
        isQuantityItem ? (item.observedQuantity ?? "") : "",
        isQuantityItem ? "" : item.status || "",
        comments,
        "",
        "",
        isQuantityItem ? (item.expectedQuantity ?? "") : "",
        isQuantityItem ? (item.requiredThreshold ?? "") : "",
        isQuantityItem ? (item.criticalThreshold ?? "") : "",
      ];
      values.forEach((value, i) => {
        const cell = row.getCell(i + 1);
        cell.value = value;
        cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      });
      row.getCell(1).dataValidation = listValidation(CATEGORY_RANGE, { title: "Invalid Category" });
      row.getCell(2).dataValidation = listValidation(CHECKLIST_ITEM_RANGE, { title: "Item not in list", errorStyle: "warning" });
      row.getCell(4).dataValidation = listValidation(STATUS_RANGE, { title: "Invalid Status" });
    });

    rowIndex++; // spacer row between areas
  });

  return { auditDate };
}

/** Excel worksheet names: max 31 chars, no []:*?/\\ characters. */
export function safeSheetName(name: string, usedNames: Set<string>): string {
  let base = name.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixStr = ` (${suffix})`;
    candidate = base.slice(0, 31 - suffixStr.length) + suffixStr;
    suffix++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}
