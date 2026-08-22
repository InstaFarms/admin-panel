import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";

const NON_PROPERTY_SHEETS = new Set(["Property Names", "Config Lists"]);
const PROPERTY_ID_RE = /Property ID:\s*([0-9a-fA-F-]{36})/;
const AREA_LABEL_RE = /^\d+\.\s*(.+)$/;
const AREA_CATEGORY_RE = /^Area Category:\s*(.+)$/i;
const ITEM_TYPES = new Set(["INVENTORY", "SUPPLIES", "MAINTENANCE"]);
const PHOTO_REQUIREMENT_TYPES = new Set(["ALWAYS_REQUIRED", "REQUIRED_IF_ISSUE", "NOT_REQUIRED"]);

export interface ParsedConfigItemRow {
  rowNumber: number;
  areaName: string;
  areaCategory: string;
  itemType: "INVENTORY" | "SUPPLIES" | "MAINTENANCE";
  itemName: string;
  expectedQuantity: number | null;
  requiredThreshold: number | null;
  criticalThreshold: number | null;
  photoRequirementTypeRaw: string;
  activeRaw: string;
}

export interface ParsedConfigSection {
  areaName: string;
  areaCategory: string;
  rows: ParsedConfigItemRow[];
}

export interface ParsedPropertyConfig {
  sheet: string;
  propertyId: string;
  sections: ParsedConfigSection[];
}

export interface ConfigParseResult {
  properties: ParsedPropertyConfig[];
  skippedSheets: { sheet: string; reason: string }[];
}

function cellStr(value: unknown): string {
  return String(value ?? "").trim();
}

function parseIntOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function parseAuditConfigWorkbook(workbook: WorkBook): ConfigParseResult {
  const properties: ParsedPropertyConfig[] = [];
  const skippedSheets: { sheet: string; reason: string }[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (NON_PROPERTY_SHEETS.has(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

    const propertyIdMatch = cellStr(rows[1]?.[0]).match(PROPERTY_ID_RE);
    if (!propertyIdMatch) {
      skippedSheets.push({ sheet: sheetName, reason: "No 'Property ID:' cell found in row 2" });
      continue;
    }

    const sectionsByKey = new Map<string, ParsedConfigSection>();
    const sectionOrder: string[] = [];
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
      if (!ITEM_TYPES.has(itemType)) continue; // stray/unrecognized row — ignore

      const itemName = cellStr(row[1]);
      if (!itemName) continue;

      const key = `${currentAreaLabel}::${currentAreaCategory}`;
      let section = sectionsByKey.get(key);
      if (!section) {
        section = { areaName: currentAreaLabel, areaCategory: currentAreaCategory, rows: [] };
        sectionsByKey.set(key, section);
        sectionOrder.push(key);
      }

      section.rows.push({
        rowNumber: i + 1,
        areaName: currentAreaLabel,
        areaCategory: currentAreaCategory,
        itemType: itemType as ParsedConfigItemRow["itemType"],
        itemName,
        expectedQuantity: parseIntOrNull(row[2]),
        requiredThreshold: parseIntOrNull(row[3]),
        criticalThreshold: parseIntOrNull(row[4]),
        photoRequirementTypeRaw: cellStr(row[5]),
        activeRaw: cellStr(row[6]),
      });
    }

    const sections = sectionOrder.map((key) => sectionsByKey.get(key)!);
    if (sections.length === 0 || sections.every((sec) => sec.rows.length === 0)) {
      skippedSheets.push({ sheet: sheetName, reason: "No area/item rows filled in — nothing to import" });
      continue;
    }

    properties.push({ sheet: sheetName, propertyId: propertyIdMatch[1], sections });
  }

  return { properties, skippedSheets };
}

export type SyncItemInput = {
  itemType: "INVENTORY" | "SUPPLIES" | "MAINTENANCE";
  name: string;
  expectedQuantity?: number | null;
  requiredThreshold?: number | null;
  criticalThreshold?: number | null;
  photoRequirementType: "ALWAYS_REQUIRED" | "REQUIRED_IF_ISSUE" | "NOT_REQUIRED";
  isActive?: boolean;
};
export type SyncAreaInput = { areaName: string; areaCategoryName: string; items: SyncItemInput[] };

/**
 * Converts a parsed property's raw rows into the exact payload shape
 * AuditPropertyService.bulkSyncAuditConfig expects, catching sheet-format problems (a
 * photoRequirementType/active value that isn't one of the enum/Yes-No options) locally —
 * these are typos in the sheet, not DB-resolution issues, so there's no need to round-trip to
 * the server just to learn about them.
 */
export function buildSyncSections(property: ParsedPropertyConfig): {
  sections: SyncAreaInput[];
  formatErrors: { rowNumber: number; message: string }[];
} {
  const formatErrors: { rowNumber: number; message: string }[] = [];
  const sections: SyncAreaInput[] = [];

  for (const section of property.sections) {
    const items: SyncItemInput[] = [];
    for (const row of section.rows) {
      const photoRaw = row.photoRequirementTypeRaw.trim().toUpperCase();
      if (!PHOTO_REQUIREMENT_TYPES.has(photoRaw)) {
        formatErrors.push({
          rowNumber: row.rowNumber,
          message: `"${row.itemName}": Photo Requirement "${row.photoRequirementTypeRaw}" isn't one of ALWAYS_REQUIRED / REQUIRED_IF_ISSUE / NOT_REQUIRED`,
        });
        continue;
      }
      const activeRaw = row.activeRaw.trim().toLowerCase();
      if (activeRaw !== "" && activeRaw !== "yes" && activeRaw !== "no") {
        formatErrors.push({
          rowNumber: row.rowNumber,
          message: `"${row.itemName}": Active "${row.activeRaw}" isn't "Yes" or "No"`,
        });
        continue;
      }

      items.push({
        itemType: row.itemType,
        name: row.itemName,
        expectedQuantity: row.expectedQuantity,
        requiredThreshold: row.requiredThreshold,
        criticalThreshold: row.criticalThreshold,
        photoRequirementType: photoRaw as SyncItemInput["photoRequirementType"],
        isActive: activeRaw !== "no",
      });
    }
    sections.push({ areaName: section.areaName, areaCategoryName: section.areaCategory, items });
  }

  return { sections, formatErrors };
}
