import ExcelJS from "exceljs";

import { apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { formatAdminDate } from "@/lib/dateUtils";
import { addAuditReportSheet, addValidationListsSheet, safeSheetName } from "@/lib/auditReportWorkbook";

export async function POST(request: Request) {
  try {
    const { sessionIds } = (await request.json()) as { sessionIds?: string[] };
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return new Response("No sessions selected", { status: 400 });
    }

    const token = await getApiAuthToken();

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

    const usedNames = new Set<string>();
    let propertyName = "property";
    const errors: string[] = [];

    for (const sessionId of sessionIds) {
      const response = await apiGet<{ success: boolean; data: any; message?: string }>(
        `/api/supervisor-audits/${sessionId}/report`,
        { token }
      );
      const reportData = response?.data;
      if (!reportData?.session) {
        errors.push(`${sessionId}: ${response?.message || "not found"}`);
        continue;
      }
      propertyName = reportData.session.propertyName || propertyName;
      const date = formatAdminDate(reportData.session.completedAt || reportData.session.startedAt);
      const sheetName = safeSheetName(date, usedNames);
      addAuditReportSheet(workbook, sheetName, reportData);
    }

    if (usedNames.size === 0) {
      return new Response(`No reports could be exported: ${errors.join("; ")}`, { status: 404 });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safePropertyName = propertyName.replace(/[^a-z0-9]+/gi, "-");
    const filename = `${safePropertyName}-audit-reports.xlsx`;

    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Admin Audit Reports Bulk Export] Failed", error);
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 500 });
  }
}
