"use client";

import { useState, type ComponentType } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Checkbox,
} from "flowbite-react";
import {
  HiDownload,
  HiUpload,
  HiSwitchHorizontal,
  HiDocumentReport,
  HiAdjustments,
  HiTemplate,
} from "react-icons/hi";

import PropertySelector from "@/components/PropertySelector";
import { JarvisLoader } from "@/components/JarvisLogo";
import { getPropertyAuditSessions } from "@/actions/auditActions";
import { formatAdminDate } from "@/lib/dateUtils";
import AuditReportImport from "@/components/audit-master/AuditReportImport";
import AuditConfigImport from "@/components/audit-master/AuditConfigImport";

type AccentColor = "blue" | "purple" | "green" | "amber" | "indigo";

const ACCENT_BADGE: Record<AccentColor, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
};

const ACCENT_STEP: Record<AccentColor, string> = {
  blue: "text-blue-500 dark:text-blue-400",
  purple: "text-purple-500 dark:text-purple-400",
  green: "text-emerald-500 dark:text-emerald-400",
  amber: "text-amber-500 dark:text-amber-400",
  indigo: "text-indigo-500 dark:text-indigo-400",
};

function SectionCard({
  step,
  title,
  description,
  icon: Icon,
  accent,
  children,
}: {
  step: number;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: AccentColor;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ACCENT_BADGE[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${ACCENT_STEP[accent]}`}>Step {step}</p>
          <h6 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h6>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">{children}</div>
    </Card>
  );
}

interface AuditSessionRow {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  supervisorName: string;
  conductedByRole: string;
  auditType: string;
  issuesCount: number;
}

async function downloadFromResponse(response: Response, fallbackFilename: string) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Export failed");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || fallbackFilename;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function AuditExportPage() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AuditSessionRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [exportingReports, setExportingReports] = useState(false);
  const [exportingConfig, setExportingConfig] = useState(false);
  const [templatePropertyId, setTemplatePropertyId] = useState<string | null>(null);
  const [exportingTemplate, setExportingTemplate] = useState(false);

  const handlePropertyChange = async (id: string | null) => {
    setPropertyId(id);
    setSelectedIds(new Set());
    setSessions([]);
    if (!id) return;

    setLoadingSessions(true);
    const result: any = await getPropertyAuditSessions(id);
    if (result.success) {
      setSessions(result.data || []);
    } else {
      toast.error(result.message || "Failed to load audit sessions");
    }
    setLoadingSessions(false);
  };

  const toggleSession = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportReports = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one audit report to export");
      return;
    }
    setExportingReports(true);
    try {
      const response = await fetch("/admin/audit-master/data-hub/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selectedIds) }),
      });
      await downloadFromResponse(response, "audit-reports.xlsx");
    } catch (error: any) {
      toast.error(error.message || "Export failed");
    } finally {
      setExportingReports(false);
    }
  };

  const handleExportConfig = async () => {
    setExportingConfig(true);
    try {
      const response = await fetch("/admin/audit-master/data-hub/config");
      await downloadFromResponse(response, "mago-property-configuration.xlsx");
    } catch (error: any) {
      toast.error(error.message || "Export failed");
    } finally {
      setExportingConfig(false);
    }
  };

  const handleExportTemplate = async () => {
    if (!templatePropertyId) {
      toast.error("Select a property first");
      return;
    }
    setExportingTemplate(true);
    try {
      const response = await fetch(`/admin/audit-master/data-hub/template?propertyId=${templatePropertyId}`);
      await downloadFromResponse(response, "audit-template.xlsx");
    } catch (error: any) {
      toast.error(error.message || "Export failed");
    } finally {
      setExportingTemplate(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <Breadcrumb className="bg-transparent p-0">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="#">Audit Data Hub</BreadcrumbItem>
          </Breadcrumb>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <HiSwitchHorizontal className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">
                Audit Master
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Audit Data Hub</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-gray-500 dark:text-slate-300">
            Move audit data in and out of the system: export a property&apos;s past reports, export the full Mago
            configuration catalogue, or import a completed audit workbook straight into real audit sessions.
          </p>
        </div>
      </section>

      <SectionCard
        step={1}
        title="Export a property's past audit reports"
        description="Pick a property, choose which of its past audits to include, then export — one workbook, one sheet per selected report."
        icon={HiDocumentReport}
        accent="blue"
      >
        <div className="mb-4 max-w-md">
          <PropertySelector propertyId={propertyId} update={handlePropertyChange} appType="MAGO_ADMIN" />
        </div>

        {loadingSessions && (
          <div className="flex items-center justify-center py-8">
            <JarvisLoader size="md" />
          </div>
        )}

        {!loadingSessions && propertyId && sessions.length === 0 && (
          <p className="text-sm text-gray-500">No audit sessions found for this property.</p>
        )}

        {!loadingSessions && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              {sessions.map((session) => (
                <label
                  key={session.id}
                  className="flex items-center gap-3 border-b border-gray-100 p-3 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                >
                  <Checkbox
                    checked={selectedIds.has(session.id)}
                    onChange={() => toggleSession(session.id)}
                  />
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {formatAdminDate(session.completedAt || session.startedAt)}
                    </span>
                    <Badge color={session.status === "COMPLETED" ? "success" : "warning"}>
                      {session.status}
                    </Badge>
                    <span className="text-xs text-gray-500">{session.auditType}</span>
                    <span className="text-xs text-gray-500">
                      by {session.supervisorName} ({session.conductedByRole})
                    </span>
                    {session.issuesCount > 0 ? (
                      <Badge color="failure">{session.issuesCount} issue{session.issuesCount === 1 ? "" : "s"}</Badge>
                    ) : (
                      <Badge color="success">Compliant</Badge>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div>
              <Button color="blue" onClick={handleExportReports} disabled={exportingReports || selectedIds.size === 0}>
                <HiDownload className="mr-2 h-4 w-4" />
                {exportingReports ? "Exporting..." : `Export Selected (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        step={2}
        title="Export a blank audit template for a property"
        description="Pick a property and export a blank copy of its report — same look as an exported audit report (Category, Checklist Item, Expected/Required/Critical Qty already filled in from its current configuration), but with Quantity, Status, and Comments left empty for someone to fill in and re-upload via Import audited report data."
        icon={HiTemplate}
        accent="indigo"
      >
        <div className="mb-4 max-w-md">
          <PropertySelector propertyId={templatePropertyId} update={setTemplatePropertyId} appType="MAGO_ADMIN" />
        </div>
        <Button color="indigo" onClick={handleExportTemplate} disabled={exportingTemplate || !templatePropertyId}>
          <HiDownload className="mr-2 h-4 w-4" />
          {exportingTemplate ? "Exporting..." : "Export Blank Template"}
        </Button>
      </SectionCard>

      <SectionCard
        step={3}
        title="Export property configuration data"
        description={
          'Exports every Mago-brand property\'s audit configuration (areas + checklist items) into one workbook — same layout as the shared "Property Configuration" template, with dropdowns for Category, Checklist Item, Photo Requirement, and Active.'
        }
        icon={HiAdjustments}
        accent="purple"
      >
        <Button color="purple" onClick={handleExportConfig} disabled={exportingConfig}>
          <HiDownload className="mr-2 h-4 w-4" />
          {exportingConfig ? "Exporting... this can take a minute" : "Export Property Configuration"}
        </Button>
      </SectionCard>

      <SectionCard
        step={4}
        title="Import property configuration data"
        description="Upload a Property Configuration workbook (one sheet per property, matching the exported config format with a Property ID and area-wise Category/Checklist Item/Photo Requirement/Active rows). Every property is validated against current master data first — area categories and checklist items that don't exist yet are created automatically — review the results, then confirm to sync each property's full configuration."
        icon={HiAdjustments}
        accent="amber"
      >
        <AuditConfigImport />
      </SectionCard>

      <SectionCard
        step={5}
        title="Import audited report data"
        description="Upload a completed audit report workbook (one sheet per property, matching the exported report format with a Property ID, Conducted By, Audit Date, and filled-in Status/Quantity columns). Every property is validated against its current configuration first — review the results, fix anything flagged, then confirm to write the results into real audit sessions."
        icon={HiUpload}
        accent="green"
      >
        <AuditReportImport />
      </SectionCard>
    </div>
  );
}
