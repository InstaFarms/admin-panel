import ExcelJS from "exceljs";

import {
  createPropertyOnboardingWorkbook,
  propertyOnboardingExcelFilename,
  type PropertyOnboardingBaselineExport,
} from "@/lib/propertyOnboardingWorkbook";

const baseline: PropertyOnboardingBaselineExport = {
  id: "baseline-1",
  propertyId: "property-1",
  propertyName: "Hilltop Retreat",
  propertyCode: "ONB-HILLTOP",
  sourceSessionId: "session-1",
  versionNumber: 1,
  frozenBy: "supervisor-1",
  frozenAt: "2026-08-29T12:00:00.000Z",
  sessionStatus: "FROZEN",
  sessionPropertySnapshot: { propertyName: "Session fallback should not win" },
  baselineSnapshot: {
    valid: true,
    issues: [],
    exceptions: [],
    session: {
      id: "session-1",
      propertyId: "property-1",
      templateId: "template-1",
      appType: "SUPERVISOR",
      supervisorId: "supervisor-1",
      status: "FROZEN",
      propertySnapshot: {
        propertyName: "Hilltop Retreat",
        address: "=Do not evaluate this as a formula",
        plusPrefix: "+Do not evaluate this as a formula",
        minusPrefix: "-Do not evaluate this as a formula",
        atPrefix: "@Do not evaluate this as a formula",
        spaceFormula: " =Do not evaluate this as a formula",
        bedrooms: 2,
      },
      currentStep: 4,
      declarationAcceptedAt: "2026-08-29T11:59:00.000Z",
      submittedAt: "2026-08-29T12:00:00.000Z",
      frozenAt: "2026-08-29T12:00:00.000Z",
      templateSnapshot: {
        levels: [{ id: "level-ground", family: "GROUND" }],
        locations: [{ id: "location-garden", name: "Garden" }],
        template: {
          id: "template-1",
          name: "Standard baseline",
          areas: [
            {
              areaName: "Bedroom",
              isRequired: true,
              items: [
                {
                  itemName: "Queen bed",
                  captureMode: "ASSET",
                  minQuantity: 1,
                  maxQuantity: 2,
                  minPhotos: 1,
                  maxPhotos: 3,
                  conditionRequired: true,
                  remarksRule: "REQUIRED_FOR_EXCEPTION",
                },
              ],
            },
          ],
        },
      },
    },
    levels: [
      {
        id: "session-level-1",
        levelMasterId: "level-ground",
        nameSnapshot: "Ground Floor",
        ordinal: 1,
        isPrimaryEntrance: true,
      },
    ],
    areas: [
      {
        id: "area-1",
        areaConfigId: "area-config-1",
        areaCategoryId: "area-category-1",
        templateAreaId: "template-area-1",
        displayName: "Bedroom 1",
        instanceNumber: 1,
        sessionLevelId: "session-level-1",
        locationMasterId: "location-garden",
        identificationDescription: "Main bedroom",
        status: "COMPLETED",
        configSnapshot: {
          areaName: "Bedroom",
          contextType: "INDOOR",
          requiresReferencePhoto: true,
        },
        media: [
          {
            id: "area-media-1",
            storageUrl: "https://media.example/bedroom.jpg",
            mediaType: "PHOTO",
            purpose: "AREA_REFERENCE",
            captureMetadata: {
              capturedAt: "2026-08-29T11:00:00.000Z",
              latitude: 12.3,
            },
            uploadedBy: "supervisor-1",
            sortOrder: 0,
            createdAt: "2026-08-29T11:00:00.000Z",
          },
        ],
        items: [
          {
            id: "item-response-1",
            templateItemId: "template-item-1",
            checklistItemMasterId: "checklist-1",
            questionSnapshot: "Queen bed",
            quantity: 2,
            condition: "OK",
            remarks: "Minor scratch on frame",
            status: "COMPLETED",
            ruleSnapshot: {
              captureMode: "ASSET",
              minQuantity: 1,
              maxQuantity: 2,
              minPhotos: 1,
              maxPhotos: 3,
              conditionRequired: true,
              remarksRule: "REQUIRED_FOR_EXCEPTION",
            },
            media: [
              {
                id: "item-media-1",
                storageUrl: "https://media.example/bed.jpg",
                mediaType: "PHOTO",
                purpose: "ONBOARDING_BASELINE",
                captureMetadata: { note: "Frame detail" },
                uploadedBy: "supervisor-1",
                sortOrder: 1,
                createdAt: "2026-08-29T11:30:00.000Z",
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("property onboarding workbook", () => {
  it("creates readable sheets for the complete frozen onboarding baseline", async () => {
    const buffer = await createPropertyOnboardingWorkbook(baseline);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Summary",
      "Property Details",
      "Building Levels",
      "Areas",
      "Items",
      "Captured Details",
      "Template Rules",
      "Captured Config",
      "Media",
      "Media Metadata",
      "Validation",
    ]);
    expect(workbook.getWorksheet("Summary")?.getCell("B3").text).toBe(
      "Hilltop Retreat",
    );
    expect(workbook.getWorksheet("Building Levels")?.getCell("C3").text).toBe(
      "GROUND",
    );
    expect(workbook.getWorksheet("Items")?.getCell("E3").text).toBe("2");
    expect(workbook.getWorksheet("Media")?.getCell("G3").hyperlink).toBe(
      "https://media.example/bedroom.jpg",
    );
    expect(workbook.getWorksheet("Media")?.getCell("N3").text).toBe("area-1");
    expect(workbook.getWorksheet("Media")?.getCell("O4").text).toBe(
      "item-response-1",
    );
    expect(workbook.getWorksheet("Captured Details")?.getCell("F3").text).toBe(
      "SUPERVISOR",
    );
    const propertyDetails = workbook.getWorksheet("Property Details");
    const propertyRows = propertyDetails
      ? (propertyDetails.getRows(3, propertyDetails.rowCount - 2) ?? [])
      : [];
    const propertyValue = (field: string) => {
      const row = propertyRows.find(
        (candidate) => candidate.getCell(1).text === field,
      );
      return row?.getCell(2).text;
    };
    expect(propertyValue("address")).toBe(
      "'=Do not evaluate this as a formula",
    );
    expect(propertyValue("plusPrefix")).toBe(
      "'+Do not evaluate this as a formula",
    );
    expect(propertyValue("minusPrefix")).toBe(
      "'-Do not evaluate this as a formula",
    );
    expect(propertyValue("atPrefix")).toBe(
      "'@Do not evaluate this as a formula",
    );
    expect(propertyValue("spaceFormula")).toBe(
      "' =Do not evaluate this as a formula",
    );
  });

  it("uses a safe, recognizable filename", () => {
    expect(propertyOnboardingExcelFilename(baseline)).toBe(
      "hilltop-retreat-onboarding-1.xlsx",
    );
  });
});
