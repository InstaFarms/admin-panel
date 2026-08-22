import ExcelJS from "exceljs";

import { apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { addAuditReportSheet, addValidationListsSheet } from "@/lib/auditReportWorkbook";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auditId } = await params;
    const token = await getApiAuthToken();
    const response = await apiGet<{ success: boolean; data: any; message?: string }>(
      `/api/supervisor-audits/${auditId}/report`,
      { token }
    );

    const reportData = response?.data;
    if (!reportData?.session) {
      return new Response(response?.message || "Audit report not found", { status: 404 });
    }

    const [areaCatResponse, checklistItemResponse, supervisorsResponse] = await Promise.all([
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/area-categories/paginate?perPage=500", { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/audit-master/checklist-items/paginate?perPage=1000", { token }),
      apiGet<{ success: boolean; data: any[] }>("/api/supervisors", { token }),
    ]);

    const workbook = new ExcelJS.Workbook();
    addValidationListsSheet(workbook, {
      checklistItemNames: (checklistItemResponse?.data ?? []).map((i: any) => i.name),
      areaCategoryNames: (areaCatResponse?.data ?? []).map((c: any) => c.name),
      supervisors: (supervisorsResponse?.data ?? []).map((sv: any) => ({ name: sv.name, phone: sv.phone })),
    });
    const { auditDate } = addAuditReportSheet(workbook, "Audit Report", reportData);

    const buffer = await workbook.xlsx.writeBuffer();
    const safePropertyName = (reportData.session.propertyName || "property").replace(/[^a-z0-9]+/gi, "-");
    const filename = `${safePropertyName}-audit-${auditDate.replace(/\s+/g, "-")}.xlsx`;

    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Admin Audit Export] Failed", error);
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 500 });
  }
}
