import ExcelJS from "exceljs";

type UnknownRecord = Record<string, unknown>;

export type PropertyOnboardingBaselineExport = {
  id: string;
  propertyId?: string | null;
  propertyName?: string | null;
  propertyCode?: string | null;
  sourceSessionId?: string | null;
  versionNumber?: number | null;
  supersedesBaselineId?: string | null;
  frozenBy?: string | null;
  frozenAt?: string | Date | null;
  baselineCreatedAt?: string | Date | null;
  baselineUpdatedAt?: string | Date | null;
  sessionStatus?: string | null;
  sessionPropertySnapshot?: unknown;
  baselineSnapshot?: unknown;
};

type SheetColumn = {
  header: string;
  width?: number;
  isLink?: boolean;
};

const COLORS = {
  title: "FF1F3864",
  header: "FFD9EAF7",
  border: "FFBFBFBF",
  white: "FFFFFFFF",
  hyperlink: "FF0563C1",
};

const thinBorder = { style: "thin" as const, color: { argb: COLORS.border } };

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is UnknownRecord =>
          !!entry && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

function valueAt(record: UnknownRecord, key: string): unknown {
  return record[key];
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  return String(value);
}

/** Supervisor-entered values must not become spreadsheet formulas when downloaded. */
function safeCellText(value: unknown): string {
  const result = text(value);
  return /^[\s]*[=+\-@]/.test(result) ? `'${result}` : result;
}

function enumLabel(value: unknown): string {
  return text(value).replaceAll("_", " ");
}

function dateText(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("en-IN");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function recordEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (Array.isArray(value)) {
    if (value.length === 0) return [[prefix || "Value", ""]];
    return value.flatMap((entry, index) =>
      recordEntries(entry, `${prefix}[${index + 1}]`),
    );
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value as UnknownRecord);
    if (!entries.length) return [[prefix || "Value", ""]];
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, entry]) =>
        recordEntries(entry, prefix ? `${prefix}.${key}` : key),
      );
  }
  return [[prefix || "Value", safeCellText(value)]];
}

function withoutKeys(record: UnknownRecord, keys: string[]): UnknownRecord {
  const omitted = new Set(keys);
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !omitted.has(key)),
  );
}

function metadataText(value: unknown): string {
  return recordEntries(value)
    .filter(([key]) => key !== "Value")
    .map(([key, entry]) => `${key}: ${entry}`)
    .join("; ");
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  columns: SheetColumn[],
  rows: unknown[][],
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 2 }],
  });
  sheet.columns = columns.map((column) => ({ width: column.width ?? 20 }));

  const titleRow = sheet.getRow(1);
  titleRow.height = 26;
  titleRow.getCell(1).value = title;
  sheet.mergeCells(1, 1, 1, columns.length);
  for (let index = 1; index <= columns.length; index += 1) {
    titleRow.getCell(index).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.title },
    };
  }
  titleRow.getCell(1).font = {
    bold: true,
    size: 14,
    color: { argb: COLORS.white },
  };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const headerRow = sheet.getRow(2);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.header },
    };
    cell.border = {
      top: thinBorder,
      right: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  headerRow.height = 30;

  const safeRows = rows.length
    ? rows
    : [["No records captured", ...columns.slice(1).map(() => "")]];
  safeRows.forEach((values) => {
    const row = sheet.addRow(values.map(safeCellText));
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      const raw = text(value);
      if (columns[index]?.isLink && isHttpUrl(raw)) {
        cell.value = { text: raw, hyperlink: raw };
        cell.font = { color: { argb: COLORS.hyperlink }, underline: true };
      }
      cell.border = {
        top: thinBorder,
        right: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
      };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });

  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columns.length },
  };
  return sheet;
}

function recordText(record: UnknownRecord, key: string): string {
  return text(valueAt(record, key));
}

function recordCount(record: UnknownRecord, key: string): number {
  return asRecords(valueAt(record, key)).length;
}

function slug(value: unknown): string {
  return text(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function propertyOnboardingExcelFilename(
  baseline: PropertyOnboardingBaselineExport,
): string {
  const property = slug(baseline.propertyName) || "property";
  const version = Number.isInteger(baseline.versionNumber)
    ? baseline.versionNumber
    : "baseline";
  return `${property}-onboarding-${version}.xlsx`;
}

/**
 * Creates a human-readable record of one frozen property-onboarding baseline.
 * Onboarding details come from the frozen snapshot; current property name/code
 * are deliberately included as separately labeled reference metadata.
 */
export async function createPropertyOnboardingWorkbook(
  baseline: PropertyOnboardingBaselineExport,
): Promise<Buffer> {
  const review = asRecord(baseline.baselineSnapshot);
  const session = asRecord(valueAt(review, "session"));
  const template = asRecord(valueAt(session, "templateSnapshot"));
  const levels = asRecords(valueAt(review, "levels"));
  const areas = asRecords(valueAt(review, "areas"));
  const issues = asRecords(valueAt(review, "issues"));
  const exceptions = asRecords(valueAt(review, "exceptions"));
  const frozenPropertySnapshot = asRecord(valueAt(session, "propertySnapshot"));
  // Older baselines may predate a property snapshot inside baselineSnapshot.
  // In that narrow case, retain the session snapshot as a compatibility fallback.
  const snapshot = Object.keys(frozenPropertySnapshot).length
    ? frozenPropertySnapshot
    : asRecord(baseline.sessionPropertySnapshot);
  const version = text(baseline.versionNumber || "");

  const templateLevelsById = new Map(
    asRecords(valueAt(template, "levels")).map((level) => [
      recordText(level, "id"),
      level,
    ]),
  );
  const areaById = new Map(
    areas.map((area) => [
      recordText(area, "id"),
      recordText(area, "displayName"),
    ]),
  );
  const levelById = new Map(
    levels.map((level) => [
      recordText(level, "id"),
      recordText(level, "nameSnapshot"),
    ]),
  );
  const levelFamilyById = new Map(
    levels.map((level) => [
      recordText(level, "id"),
      enumLabel(
        valueAt(
          templateLevelsById.get(recordText(level, "levelMasterId")) || {},
          "family",
        ),
      ),
    ]),
  );
  const locationById = new Map(
    asRecords(valueAt(template, "locations")).map((location) => [
      recordText(location, "id"),
      recordText(location, "name"),
    ]),
  );
  const itemById = new Map<string, string>();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Magostays Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const items: Array<{ area: UnknownRecord; item: UnknownRecord }> = [];
  const mediaRows: unknown[][] = [];
  const mediaMetadataRows: unknown[][] = [];
  areas.forEach((area) => {
    const areaName = recordText(area, "displayName");
    asRecords(valueAt(area, "media")).forEach((media) => {
      const url = recordText(media, "storageUrl") || recordText(media, "url");
      mediaRows.push([
        version,
        "Area reference",
        areaName,
        "",
        enumLabel(valueAt(media, "mediaType") || valueAt(media, "type")),
        enumLabel(valueAt(media, "purpose")),
        url,
        metadataText(
          valueAt(media, "captureMetadata") || valueAt(media, "metadata"),
        ),
        recordText(media, "id"),
        recordText(media, "uploadedBy"),
        valueAt(media, "sortOrder"),
        dateText(valueAt(media, "createdAt")),
        dateText(valueAt(media, "updatedAt")),
        recordText(area, "id"),
        "",
      ]);
      mediaMetadataRows.push(
        ...recordEntries(
          valueAt(media, "captureMetadata") || valueAt(media, "metadata"),
        ).map(([field, value]) => [
          version,
          "Area reference",
          areaName,
          "",
          recordText(media, "id"),
          field,
          value,
          recordText(area, "id"),
          "",
        ]),
      );
    });
    asRecords(valueAt(area, "items")).forEach((item) => {
      items.push({ area, item });
      itemById.set(
        recordText(item, "id"),
        recordText(item, "questionSnapshot"),
      );
      asRecords(valueAt(item, "media")).forEach((media) => {
        const url = recordText(media, "storageUrl") || recordText(media, "url");
        mediaRows.push([
          version,
          "Item evidence",
          areaName,
          recordText(item, "questionSnapshot"),
          enumLabel(valueAt(media, "mediaType") || valueAt(media, "type")),
          enumLabel(valueAt(media, "purpose")),
          url,
          metadataText(
            valueAt(media, "captureMetadata") || valueAt(media, "metadata"),
          ),
          recordText(media, "id"),
          recordText(media, "uploadedBy"),
          valueAt(media, "sortOrder"),
          dateText(valueAt(media, "createdAt")),
          dateText(valueAt(media, "updatedAt")),
          recordText(area, "id"),
          recordText(item, "id"),
        ]);
        mediaMetadataRows.push(
          ...recordEntries(
            valueAt(media, "captureMetadata") || valueAt(media, "metadata"),
          ).map(([field, value]) => [
            version,
            "Item evidence",
            areaName,
            recordText(item, "questionSnapshot"),
            recordText(media, "id"),
            field,
            value,
            recordText(area, "id"),
            recordText(item, "id"),
          ]),
        );
      });
    });
  });

  addSheet(
    workbook,
    "Summary",
    `PROPERTY ONBOARDING BASELINE: ${(baseline.propertyName || "PROPERTY").toUpperCase()}`,
    [
      { header: "Field", width: 31 },
      { header: "Value", width: 58 },
    ],
    [
      ["Current property name", baseline.propertyName],
      ["Captured property name", valueAt(snapshot, "propertyName")],
      ["Property code", baseline.propertyCode],
      ["Property ID", baseline.propertyId || valueAt(session, "propertyId")],
      ["Baseline version", version],
      ["Supersedes baseline", baseline.supersedesBaselineId],
      [
        "Frozen at",
        dateText(baseline.frozenAt || valueAt(session, "frozenAt")),
      ],
      ["Baseline record created", dateText(baseline.baselineCreatedAt)],
      ["Baseline record last updated", dateText(baseline.baselineUpdatedAt)],
      ["Frozen by", baseline.frozenBy],
      [
        "Source onboarding session",
        baseline.sourceSessionId || valueAt(session, "id"),
      ],
      ["Onboarding app", enumLabel(valueAt(session, "appType"))],
      [
        "Session status",
        enumLabel(baseline.sessionStatus || valueAt(session, "status")),
      ],
      ["Onboarding template ID", valueAt(session, "templateId")],
      [
        "Onboarding template name",
        valueAt(asRecord(valueAt(template, "template")), "name"),
      ],
      ["Supervisor ID", valueAt(session, "supervisorId")],
      ["Owner ID", valueAt(session, "ownerId")],
      ["Session started", dateText(valueAt(session, "createdAt"))],
      ["Session submitted", dateText(valueAt(session, "submittedAt"))],
      [
        "Declaration accepted",
        dateText(valueAt(session, "declarationAcceptedAt")),
      ],
      ["Current onboarding step", valueAt(session, "currentStep")],
      ["Session version", valueAt(session, "lockVersion")],
      [
        "Validation result",
        valueAt(review, "valid") === true
          ? "Passed"
          : "Review data unavailable",
      ],
      ["Building levels captured", levels.length],
      ["Areas captured", areas.length],
      ["Checklist items captured", items.length],
      ["Media attachments", mediaRows.length],
    ],
  );

  addSheet(
    workbook,
    "Property Details",
    "PROPERTY DETAILS CAPTURED DURING ONBOARDING",
    [
      { header: "Field", width: 40 },
      { header: "Captured value", width: 80 },
    ],
    recordEntries(snapshot),
  );

  addSheet(
    workbook,
    "Building Levels",
    "BUILDING STRUCTURE",
    [
      { header: "Baseline version", width: 16 },
      { header: "Level", width: 26 },
      { header: "Family", width: 18 },
      { header: "Order", width: 12 },
      { header: "Primary entrance", width: 20 },
      { header: "Level ID", width: 38 },
      { header: "Level master ID", width: 38 },
    ],
    levels.map((level) => [
      version,
      recordText(level, "nameSnapshot"),
      levelFamilyById.get(recordText(level, "id")) || "",
      valueAt(level, "ordinal"),
      valueAt(level, "isPrimaryEntrance"),
      recordText(level, "id"),
      recordText(level, "levelMasterId"),
    ]),
  );

  addSheet(
    workbook,
    "Areas",
    "AREAS AND REFERENCE EVIDENCE",
    [
      { header: "Baseline version", width: 16 },
      { header: "Area", width: 32 },
      { header: "Parent area", width: 32 },
      { header: "Instance", width: 12 },
      { header: "Level", width: 22 },
      { header: "Location context", width: 26 },
      { header: "Identification / description", width: 42 },
      { header: "Status", width: 18 },
      { header: "Reference media", width: 18 },
      { header: "Area type", width: 26 },
      { header: "Context", width: 16 },
      { header: "Area ID", width: 38 },
      { header: "Area configuration ID", width: 38 },
      { header: "Area category ID", width: 38 },
      { header: "Template area ID", width: 38 },
    ],
    areas.map((area) => {
      const config = asRecord(valueAt(area, "configSnapshot"));
      return [
        version,
        recordText(area, "displayName"),
        areaById.get(recordText(area, "parentAreaId")) || "",
        valueAt(area, "instanceNumber"),
        levelById.get(recordText(area, "sessionLevelId")) || "",
        locationById.get(recordText(area, "locationMasterId")) || "",
        recordText(area, "identificationDescription"),
        enumLabel(valueAt(area, "status")),
        recordCount(area, "media"),
        recordText(config, "areaName"),
        enumLabel(valueAt(config, "contextType")),
        recordText(area, "id"),
        recordText(area, "areaConfigId"),
        recordText(area, "areaCategoryId"),
        recordText(area, "templateAreaId"),
      ];
    }),
  );

  addSheet(
    workbook,
    "Items",
    "CHECKLIST ITEMS, CONDITIONS, AND REMARKS",
    [
      { header: "Baseline version", width: 16 },
      { header: "Area", width: 32 },
      { header: "Checklist item", width: 42 },
      { header: "Capture mode", width: 16 },
      { header: "Quantity", width: 12 },
      { header: "Condition", width: 24 },
      { header: "Remarks", width: 48 },
      { header: "Status", width: 18 },
      { header: "Min quantity", width: 15 },
      { header: "Max quantity", width: 15 },
      { header: "Min photos", width: 14 },
      { header: "Max photos", width: 14 },
      { header: "Condition required", width: 20 },
      { header: "Remarks rule", width: 28 },
      { header: "Media", width: 12 },
      { header: "Item response ID", width: 38 },
      { header: "Checklist master ID", width: 38 },
      { header: "Template item ID", width: 38 },
    ],
    items.map(({ area, item }) => {
      const rule = asRecord(valueAt(item, "ruleSnapshot"));
      return [
        version,
        recordText(area, "displayName"),
        recordText(item, "questionSnapshot"),
        enumLabel(valueAt(rule, "captureMode")),
        valueAt(item, "quantity"),
        enumLabel(valueAt(item, "condition")),
        recordText(item, "remarks"),
        enumLabel(valueAt(item, "status")),
        valueAt(rule, "minQuantity"),
        valueAt(rule, "maxQuantity"),
        valueAt(rule, "minPhotos"),
        valueAt(rule, "maxPhotos"),
        valueAt(rule, "conditionRequired"),
        enumLabel(valueAt(rule, "remarksRule")),
        recordCount(item, "media"),
        recordText(item, "id"),
        recordText(item, "checklistItemMasterId"),
        recordText(item, "templateItemId"),
      ];
    }),
  );

  const capturedDetailRows: unknown[][] = [
    ...recordEntries(
      withoutKeys(session, ["propertySnapshot", "templateSnapshot"]),
    ).map(([field, value]) => [
      "Frozen session",
      "",
      "",
      recordText(session, "id"),
      field,
      value,
    ]),
    ...levels.flatMap((level) =>
      recordEntries(level).map(([field, value]) => [
        "Building level",
        "",
        "",
        recordText(level, "id"),
        field,
        value,
      ]),
    ),
    ...areas.flatMap((area) => [
      ...recordEntries(
        withoutKeys(area, ["configSnapshot", "items", "media"]),
      ).map(([field, value]) => [
        "Area",
        recordText(area, "displayName"),
        "",
        recordText(area, "id"),
        field,
        value,
      ]),
      ...asRecords(valueAt(area, "items")).flatMap((item) =>
        recordEntries(withoutKeys(item, ["ruleSnapshot", "media"])).map(
          ([field, value]) => [
            "Item response",
            recordText(area, "displayName"),
            recordText(item, "questionSnapshot"),
            recordText(item, "id"),
            field,
            value,
          ],
        ),
      ),
    ]),
  ];
  addSheet(
    workbook,
    "Captured Details",
    "FULLY FLATTENED CAPTURED ONBOARDING RECORDS",
    [
      { header: "Scope", width: 24 },
      { header: "Area", width: 32 },
      { header: "Checklist item", width: 42 },
      { header: "Record ID", width: 38 },
      { header: "Field", width: 44 },
      { header: "Captured value", width: 72 },
    ],
    capturedDetailRows,
  );

  const templateAreas = asRecords(
    valueAt(asRecord(valueAt(template, "template")), "areas"),
  );
  const templateRuleRows = templateAreas.flatMap((templateArea) => {
    const areaName = recordText(templateArea, "areaName");
    return asRecords(valueAt(templateArea, "items")).map((item) => [
      areaName,
      valueAt(templateArea, "isRequired"),
      recordText(item, "questionLabel") || recordText(item, "itemName"),
      enumLabel(valueAt(item, "captureMode")),
      valueAt(item, "minQuantity"),
      valueAt(item, "maxQuantity"),
      valueAt(item, "minPhotos"),
      valueAt(item, "maxPhotos"),
      valueAt(item, "conditionRequired"),
      enumLabel(valueAt(item, "remarksRule")),
    ]);
  });
  addSheet(
    workbook,
    "Template Rules",
    "ONBOARDING TEMPLATE AND CAPTURE RULES",
    [
      { header: "Area type", width: 32 },
      { header: "Area required", width: 18 },
      { header: "Checklist item", width: 42 },
      { header: "Capture mode", width: 16 },
      { header: "Min quantity", width: 15 },
      { header: "Max quantity", width: 15 },
      { header: "Min photos", width: 14 },
      { header: "Max photos", width: 14 },
      { header: "Condition required", width: 20 },
      { header: "Remarks rule", width: 28 },
    ],
    templateRuleRows,
  );

  const configurationRows: unknown[][] = [
    ...recordEntries(template).map(([field, value]) => [
      "Template snapshot",
      "",
      "",
      field,
      value,
    ]),
    ...areas.flatMap((area) => [
      ...recordEntries(valueAt(area, "configSnapshot")).map(
        ([field, value]) => [
          "Area configuration",
          recordText(area, "displayName"),
          "",
          field,
          value,
        ],
      ),
      ...asRecords(valueAt(area, "items")).flatMap((item) =>
        recordEntries(valueAt(item, "ruleSnapshot")).map(([field, value]) => [
          "Item rule",
          recordText(area, "displayName"),
          recordText(item, "questionSnapshot"),
          field,
          value,
        ]),
      ),
    ]),
  ];
  addSheet(
    workbook,
    "Captured Config",
    "CONFIGURATION SNAPSHOTS CAPTURED WITH THIS ONBOARDING",
    [
      { header: "Scope", width: 24 },
      { header: "Area", width: 32 },
      { header: "Checklist item", width: 42 },
      { header: "Field", width: 44 },
      { header: "Captured value", width: 72 },
    ],
    configurationRows,
  );

  addSheet(
    workbook,
    "Media",
    "AREA AND ITEM MEDIA LINKS",
    [
      { header: "Baseline version", width: 16 },
      { header: "Evidence scope", width: 20 },
      { header: "Area", width: 32 },
      { header: "Checklist item", width: 42 },
      { header: "Media type", width: 16 },
      { header: "Purpose", width: 24 },
      { header: "Media link", width: 72, isLink: true },
      { header: "Capture details", width: 60 },
      { header: "Media ID", width: 38 },
      { header: "Uploaded by", width: 38 },
      { header: "Sort order", width: 14 },
      { header: "Created", width: 24 },
      { header: "Updated", width: 24 },
      { header: "Area ID", width: 38 },
      { header: "Item response ID", width: 38 },
    ],
    mediaRows,
  );

  addSheet(
    workbook,
    "Media Metadata",
    "MEDIA CAPTURE METADATA",
    [
      { header: "Baseline version", width: 16 },
      { header: "Evidence scope", width: 20 },
      { header: "Area", width: 32 },
      { header: "Checklist item", width: 42 },
      { header: "Media ID", width: 38 },
      { header: "Field", width: 44 },
      { header: "Captured value", width: 72 },
      { header: "Area ID", width: 38 },
      { header: "Item response ID", width: 38 },
    ],
    mediaMetadataRows,
  );

  const validationRows: unknown[][] = [
    [
      version,
      "Validation result",
      valueAt(review, "valid") === true ? "Passed" : "Not available",
      "All required onboarding data had to pass validation before the baseline could be frozen.",
      "",
      "",
    ],
    ...issues.map((issue) => [
      version,
      "Validation issue",
      enumLabel(valueAt(issue, "code")),
      recordText(issue, "message"),
      areaById.get(recordText(issue, "areaId")) || "",
      itemById.get(recordText(issue, "itemId")) || "",
    ]),
    ...exceptions.map((exception) => [
      version,
      "Condition exception",
      enumLabel(valueAt(exception, "condition")),
      recordText(exception, "item"),
      recordText(exception, "areaName"),
      recordText(exception, "itemId"),
    ]),
  ];
  addSheet(
    workbook,
    "Validation",
    "VALIDATION RESULTS AND CONDITION EXCEPTIONS",
    [
      { header: "Baseline version", width: 16 },
      { header: "Record type", width: 24 },
      { header: "Status / code", width: 26 },
      { header: "Detail", width: 65 },
      { header: "Area", width: 32 },
      { header: "Item", width: 42 },
    ],
    validationRows,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
