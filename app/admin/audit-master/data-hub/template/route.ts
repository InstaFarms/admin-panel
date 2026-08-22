import ExcelJS from "exceljs";

import { apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { addAuditReportSheet, addValidationListsSheet } from "@/lib/auditReportWorkbook";

/**
 * Blank audit report template for one property: same sheet the real report export produces
 * (see addAuditReportSheet), but built from the property's CURRENT config instead of a
 * completed session — Category/Checklist Item/Expected-Required-Critical Qty are filled in,
 * Quantity/Status/Comments and the Conducted By/Audit Date rows are left blank for the auditor
 * to fill in by hand (or in Excel) and re-upload via "Import audited report data".
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) {
      return new Response("propertyId is required", { status: 400 });
    }

    const token = await getApiAuthToken();

    const [propertyResponse, areasResponse, areaCatResponse, checklistItemResponse, supervisorsResponse] = await Promise.all([
      apiGet<{ success: boolean; data: any }>(`/api/properties/${propertyId}`, { token }),
      apiGet<{ success: boolean; data: any[] }>(`/api/audit-properties/areas?propertyId=${propertyId}`, { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/area-categories/paginate?perPage=500", { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/checklist-items/paginate?perPage=1000", { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/supervisors", { token }),
    ]);

    const property = propertyResponse?.data;
    if (!property) {
      return new Response("Property not found", { status: 404 });
    }
    const areas = areasResponse?.data ?? [];
    if (areas.length === 0) {
      return new Response("This property has no active audit configuration to build a template from", { status: 404 });
    }

    const itemsByArea = await Promise.all(
      areas.map((area: any) =>
        apiGet<{ success: boolean; data: { inventory: any[]; supplies: any[]; maintenance: any[] } }>(
          `/api/audit-properties/items/${area.id}`,
          { token }
        ).then((res) => res?.data ?? { inventory: [], supplies: [], maintenance: [] })
      )
    );

    const items: any[] = [];
    areas.forEach((area: any, areaIdx: number) => {
      const grouped = itemsByArea[areaIdx];
      const withSection = (list: any[], section: string) =>
        list.map((item) => ({
          section,
          masterName: item.name,
          areaName: area.areaName,
          areaWeight: area.weight,
          areaCategory: area.categoryName,
          expectedQuantity: item.expectedQuantity,
          requiredThreshold: item.requiredThreshold,
          criticalThreshold: item.criticalThreshold,
          // Deliberately blank — this is what the auditor fills in.
          observedQuantity: undefined,
          status: "",
          notes: "",
          issueType: null,
        }));
      items.push(
        ...withSection(grouped.inventory, "INVENTORY"),
        ...withSection(grouped.supplies, "SUPPLIES"),
        ...withSection(grouped.maintenance, "MAINTENANCE")
      );
    });

    const workbook = new ExcelJS.Workbook();
    addValidationListsSheet(workbook, {
      checklistItemNames: (checklistItemResponse?.data ?? []).map((i: any) => i.name),
      areaCategoryNames: (areaCatResponse?.data ?? []).map((c: any) => c.name),
      supervisors: (supervisorsResponse?.data ?? []).map((sv: any) => ({ name: sv.name, phone: sv.phone })),
    });
    addAuditReportSheet(workbook, "Audit Template", {
      session: {
        propertyId,
        propertyName: property.propertyName,
        supervisorName: "",
        supervisorPhone: "",
        auditType: "ROUTINE",
        completedAt: null,
        startedAt: null,
      },
      passedItems: items,
      failedItems: [],
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safePropertyName = (property.propertyName || "property").replace(/[^a-z0-9]+/gi, "-");
    const filename = `${safePropertyName}-audit-template.xlsx`;

    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Admin Audit Template Export] Failed", error);
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 500 });
  }
}
