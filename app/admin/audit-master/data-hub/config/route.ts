import ExcelJS from "exceljs";

import { apiGet, apiPost } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { safeSheetName } from "@/lib/auditReportWorkbook";

const COLORS = {
  title: "FF1F3864",
  subtitle: "FF5B2C82",
  areaHeader: "FFDCE6F1",
  categoryLine: "FFF2F2F2",
  columnHeader: "FFD9D9D9",
  white: "FFFFFFFF",
  border: "FFBFBFBF",
};

const COLUMN_LABELS = [
  "Category",
  "Checklist Item",
  "Expected Qty",
  "Required Threshold",
  "Critical Threshold",
  "Photo Requirement",
  "Active",
];

const CATEGORY_LIST = ["Inventory", "Supplies", "Maintenance"];
const PHOTO_REQUIREMENT_LIST = ["ALWAYS_REQUIRED", "REQUIRED_IF_ISSUE", "NOT_REQUIRED"];
const ACTIVE_LIST = ["Yes", "No"];

// Direct range references (not named ranges via workbook.definedNames — exceljs's
// definedNames API is documented for plain cell/range references, not the dynamic
// OFFSET/COUNTA formulas the original template used, so we point every dropdown
// straight at a generously-sized fixed range on "Config Lists" instead. Same
// dropdown behaviour for the person editing the sheet; just no named-range layer.
const AREA_CATEGORY_LABEL_RANGE = "'Config Lists'!$B$2:$B$200";
const CATEGORY_RANGE = "'Config Lists'!$C$2:$C$200";
const PHOTO_REQUIREMENT_RANGE = "'Config Lists'!$D$2:$D$200";
const ACTIVE_RANGE = "'Config Lists'!$E$2:$E$200";
const CHECKLIST_ITEM_RANGE = "'Config Lists'!$F$2:$F$1000";

const thinBorder = { style: "thin" as const, color: { argb: COLORS.border } };

function fillRow(row: ExcelJS.Row, argb: string, columns = 7) {
  for (let c = 1; c <= columns; c++) {
    row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  }
}

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function addPropertyConfigSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  propertyName: string,
  propertyId: string,
  areas: any[],
  itemsByArea: { inventory: any[]; supplies: any[]; maintenance: any[] }[]
) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [{ width: 14 }, { width: 36 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 10 }];

  let rowIndex = 1;

  const titleRow = sheet.getRow(rowIndex++);
  titleRow.height = 26;
  titleRow.getCell(1).value = `PROPERTY AUDIT CONFIGURATION: ${propertyName.toUpperCase()}`;
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 7);
  fillRow(titleRow, COLORS.title);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: COLORS.white } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subtitleRow = sheet.getRow(rowIndex++);
  subtitleRow.height = 20;
  subtitleRow.getCell(1).value = `Property ID: ${propertyId} | Configuration Exported At: ${new Date().toLocaleString("en-IN")}`;
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, 7);
  fillRow(subtitleRow, COLORS.subtitle);
  subtitleRow.getCell(1).font = { italic: true, size: 11, color: { argb: COLORS.white } };
  subtitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  rowIndex++; // blank spacer

  areas.forEach((area: any, areaIdx: number) => {
    const items = itemsByArea[areaIdx] ?? { inventory: [], supplies: [], maintenance: [] };
    const allItems = [
      ...items.inventory.map((i: any) => ({ ...i, itemType: "INVENTORY" })),
      ...items.supplies.map((i: any) => ({ ...i, itemType: "SUPPLIES" })),
      ...items.maintenance.map((i: any) => ({ ...i, itemType: "MAINTENANCE" })),
    ];

    const areaHeaderRow = sheet.getRow(rowIndex++);
    areaHeaderRow.height = 18;
    areaHeaderRow.getCell(1).value = `${areaIdx + 1}. ${area.areaName}`;
    sheet.mergeCells(areaHeaderRow.number, 1, areaHeaderRow.number, 7);
    fillRow(areaHeaderRow, COLORS.areaHeader);
    areaHeaderRow.getCell(1).font = { bold: true, size: 12 };

    const categoryRow = sheet.getRow(rowIndex++);
    const categoryCell = categoryRow.getCell(1);
    categoryCell.value = `Area Category: ${area.categoryName || ""}`;
    sheet.mergeCells(categoryRow.number, 1, categoryRow.number, 7);
    fillRow(categoryRow, COLORS.categoryLine);
    categoryCell.font = { italic: true, size: 10 };
    categoryCell.dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Invalid Area Category",
      error: "Pick an area category from the Config Lists sheet.",
      formulae: [AREA_CATEGORY_LABEL_RANGE],
    };

    const columnHeaderRow = sheet.getRow(rowIndex++);
    COLUMN_LABELS.forEach((label, i) => {
      const cell = columnHeaderRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.columnHeader } };
      cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    });

    allItems.forEach((item: any) => {
      const row = sheet.getRow(rowIndex++);
      const isQuantityItem = item.itemType === "INVENTORY" || item.itemType === "SUPPLIES";
      const values = [
        titleCase(item.itemType),
        item.name || "",
        isQuantityItem ? item.expectedQuantity ?? "" : "",
        isQuantityItem ? item.requiredThreshold ?? "" : "",
        isQuantityItem ? item.criticalThreshold ?? "" : "",
        item.photoRequirementType || "",
        item.isActive === false ? "No" : "Yes",
      ];
      values.forEach((value, i) => {
        const cell = row.getCell(i + 1);
        cell.value = value;
        cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      });

      row.getCell(1).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "Invalid Category",
        error: "Pick a value from the Config Lists sheet.",
        formulae: [CATEGORY_RANGE],
      };
      row.getCell(2).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Item not in list",
        error: "Pick an item from the Checklist Item list on the Config Lists sheet.",
        formulae: [CHECKLIST_ITEM_RANGE],
      };
      row.getCell(6).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "Invalid Photo Requirement",
        error: "Pick a value from the Config Lists sheet.",
        formulae: [PHOTO_REQUIREMENT_RANGE],
      };
      row.getCell(7).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "Invalid Active",
        error: "Pick a value from the Config Lists sheet.",
        formulae: [ACTIVE_RANGE],
      };
    });

    rowIndex++; // spacer row between areas
  });
}

export async function GET() {
  try {
    const token = await getApiAuthToken();

    const propsResponse = await apiPost<{ success: boolean; data: any[] }>(
      "/api/properties/admin/paginate",
      { perPage: 200, orderBy: "propertyName", sortorder: "asc" },
      { token, appType: "MAGO_ADMIN" }
    );
    const properties = propsResponse?.data ?? [];
    if (properties.length === 0) {
      return new Response("No Mago properties found", { status: 404 });
    }

    const [areaCatResponse, checklistItemResponse] = await Promise.all([
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/area-categories/paginate?perPage=500", { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/checklist-items/paginate?perPage=1000", { token }),
    ]);
    const areaCategories = areaCatResponse?.data ?? [];
    const checklistItems = checklistItemResponse?.data ?? [];

    const workbook = new ExcelJS.Workbook();

    const namesSheet = workbook.addWorksheet("Property Names");
    namesSheet.getColumn(1).width = 50;
    namesSheet.getColumn(2).width = 38;
    namesSheet.getRow(1).getCell(1).value = "Property_Names";
    namesSheet.getRow(1).getCell(2).value = "Property_Id";
    namesSheet.getRow(1).font = { bold: true };
    properties.forEach((p: any, i: number) => {
      const row = namesSheet.getRow(i + 2);
      row.getCell(1).value = p.propertyName;
      row.getCell(2).value = p.id;
    });

    const configSheet = workbook.addWorksheet("Config Lists");
    configSheet.columns = [{ width: 24 }, { width: 30 }, { width: 14 }, { width: 20 }, { width: 10 }, { width: 36 }];
    ["Area Category", "Dropdown Label", "Category", "Photo Requirement", "Active", "Checklist Item"].forEach(
      (label, i) => {
        const cell = configSheet.getRow(1).getCell(i + 1);
        cell.value = label;
        cell.font = { bold: true };
      }
    );
    const maxRows = Math.max(
      areaCategories.length,
      CATEGORY_LIST.length,
      PHOTO_REQUIREMENT_LIST.length,
      ACTIVE_LIST.length,
      checklistItems.length
    );
    for (let i = 0; i < maxRows; i++) {
      const row = configSheet.getRow(i + 2);
      const areaCat = areaCategories[i];
      if (areaCat) {
        row.getCell(1).value = areaCat.name;
        row.getCell(2).value = `Area Category: ${areaCat.name}`;
      }
      if (CATEGORY_LIST[i]) row.getCell(3).value = CATEGORY_LIST[i];
      if (PHOTO_REQUIREMENT_LIST[i]) row.getCell(4).value = PHOTO_REQUIREMENT_LIST[i];
      if (ACTIVE_LIST[i]) row.getCell(5).value = ACTIVE_LIST[i];
      if (checklistItems[i]) row.getCell(6).value = checklistItems[i].name;
    }

    const usedNames = new Set<string>();
    for (const property of properties) {
      const sheetName = safeSheetName(property.propertyName || property.id, usedNames);

      const areasResponse = await apiGet<{ success: boolean; data: any[] }>(
        `/api/audit-properties/areas?propertyId=${property.id}`,
        { token }
      );
      const areas = areasResponse?.data ?? [];

      const itemsByArea = await Promise.all(
        areas.map((area: any) =>
          apiGet<{ success: boolean; data: { inventory: any[]; supplies: any[]; maintenance: any[] } }>(
            `/api/audit-properties/items/${area.id}`,
            { token }
          ).then((res) => res?.data ?? { inventory: [], supplies: [], maintenance: [] })
        )
      );

      addPropertyConfigSheet(workbook, sheetName, property.propertyName || sheetName, property.id, areas, itemsByArea);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="mago-property-configuration.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[Admin Property Config Bulk Export] Failed", error);
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 500 });
  }
}
