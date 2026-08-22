"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
    Badge,
    Button,
    Label,
    Select,
    Checkbox,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableRow,
    TableCell,
} from "flowbite-react";
import { HiUpload, HiX } from "react-icons/hi";

import { parseAuditReportWorkbook, type ParsedPropertySession, type SkippedSheet } from "@/lib/auditReportImportParser";
import { validateAuditReportImport, applyAuditReportImport } from "@/actions/auditActions";
import { getSupervisors } from "@/actions/supervisorActions";

interface PropertyReport {
    sheet: string;
    propertyId: string;
    propertyName: string | null;
    resolvedSupervisorId: string | null;
    resolvedSupervisorName: string | null;
    conductorSource: "phone" | "name" | "override" | "unresolved";
    auditDateISO: string | null;
    alreadyImported: boolean;
    counts: {
        maintenanceGood: number;
        maintenanceNeedsAttention: number;
        maintenanceCritical: number;
        quantityOk: number;
        quantityShortage: number;
        quantityCritical: number;
        skippedForErrors: number;
    };
    errors: { rowNumber?: number; message: string }[];
    warnings: { rowNumber?: number; message: string }[];
}

interface Supervisor {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
}

type ImportRowStatus = "pending" | "importing" | "IMPORTED" | "SKIPPED_ALREADY_IMPORTED" | "SKIPPED_BLOCKED" | "FAILED";

interface ImportProgress {
    status: ImportRowStatus;
    message?: string;
}

const IMPORT_STATUS_BADGE: Record<ImportRowStatus, { color: "gray" | "info" | "success" | "failure"; label: string }> = {
    pending: { color: "gray", label: "Queued" },
    importing: { color: "info", label: "Importing…" },
    IMPORTED: { color: "success", label: "Imported" },
    SKIPPED_ALREADY_IMPORTED: { color: "gray", label: "Already imported" },
    SKIPPED_BLOCKED: { color: "failure", label: "Blocked" },
    FAILED: { color: "failure", label: "Failed" },
};

// Most-actionable first: a missing Property ID is a one-line fix (paste the id in), a missing
// audit date means the sheet still needs to be filled in, and an empty template is expected
// noise (not every property has been audited yet) — ordering the summary badges this way keeps
// the thing the admin can fix in 10 seconds right at the front.
const SKIP_REASON_ORDER = ["MISSING_PROPERTY_ID", "MISSING_AUDIT_DATE", "EMPTY_TEMPLATE"] as const;
const SKIP_REASON_LABEL: Record<(typeof SKIP_REASON_ORDER)[number], string> = {
    MISSING_PROPERTY_ID: "missing Property ID",
    MISSING_AUDIT_DATE: "missing Audit Date",
    EMPTY_TEMPLATE: "not filled in",
};
const SKIP_REASON_BADGE_COLOR: Record<(typeof SKIP_REASON_ORDER)[number], "failure" | "warning" | "gray"> = {
    MISSING_PROPERTY_ID: "failure",
    MISSING_AUDIT_DATE: "warning",
    EMPTY_TEMPLATE: "gray",
};

export default function AuditReportImport() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const requestId = useRef(0);
    const importAbortRef = useRef(false);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [sessions, setSessions] = useState<ParsedPropertySession[] | null>(null);
    const [skippedSheets, setSkippedSheets] = useState<SkippedSheet[]>([]);
    const [showSkipped, setShowSkipped] = useState(false);
    const [reports, setReports] = useState<PropertyReport[] | null>(null);
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [forceReimport, setForceReimport] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [importStarted, setImportStarted] = useState(false);
    const [importProgress, setImportProgress] = useState<Record<string, ImportProgress>>({});

    useEffect(() => {
        getSupervisors().then((res: any) => {
            if (res.success) setSupervisors(res.data || []);
        });
    }, []);

    const reset = () => {
        requestId.current++; // invalidates any in-flight validate response
        importAbortRef.current = true; // stops an in-flight import loop after its current property
        setFileName(null);
        setIsValidating(false);
        setIsImporting(false);
        setSessions(null);
        setSkippedSheets([]);
        setShowSkipped(false);
        setReports(null);
        setOverrides({});
        setForceReimport(new Set());
        setExpanded(new Set());
        setImportStarted(false);
        setImportProgress({});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        reset();
        const thisRequest = ++requestId.current;
        setFileName(file.name);
        setIsValidating(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const parsed = parseAuditReportWorkbook(workbook);

            if (parsed.sessions.length === 0) {
                toast.error("No audited properties found in this workbook");
                return;
            }

            const response: any = await validateAuditReportImport(parsed.sessions);
            if (thisRequest !== requestId.current) return; // cleared/re-uploaded while validating
            if (!response.success) {
                toast.error(response.message || "Validation failed");
                return;
            }

            setSessions(parsed.sessions);
            setSkippedSheets(parsed.skippedSheets);
            setReports(response.data.properties);
        } catch (error: any) {
            if (thisRequest !== requestId.current) return;
            toast.error(error.message || "Failed to parse the file");
        } finally {
            if (thisRequest === requestId.current) setIsValidating(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const toggleExpanded = (propertyId: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(propertyId)) next.delete(propertyId);
            else next.add(propertyId);
            return next;
        });
    };

    const toggleForce = (propertyId: string) => {
        setForceReimport((prev) => {
            const next = new Set(prev);
            if (next.has(propertyId)) next.delete(propertyId);
            else next.add(propertyId);
            return next;
        });
    };

    const effectiveSupervisorId = (report: PropertyReport) => overrides[report.propertyId] ?? report.resolvedSupervisorId ?? "";

    const importableReports = (reports || []).filter((r) => r.errors.length === 0);
    const readyCount = importableReports.filter((r) => effectiveSupervisorId(r)).length;
    const needsConductorCount = importableReports.filter((r) => !effectiveSupervisorId(r)).length;
    const blockedCount = (reports || []).length - importableReports.length;
    const canConfirm = importableReports.length > 0 && needsConductorCount === 0;

    const alreadyImportedIds = importableReports.filter((r) => r.alreadyImported).map((r) => r.propertyId);
    const allForceChecked = alreadyImportedIds.length > 0 && alreadyImportedIds.every((id) => forceReimport.has(id));
    const toggleForceAll = () => {
        setForceReimport((prev) => {
            const next = new Set(prev);
            if (allForceChecked) {
                alreadyImportedIds.forEach((id) => next.delete(id));
            } else {
                alreadyImportedIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    // Imports one property at a time (rather than one bulk call) purely so the table can show
    // live per-row progress as each one lands — the backend already supports a full batch in
    // one call, this just trades a little throughput for visible incremental feedback.
    const handleConfirm = async () => {
        if (!sessions) return;
        const targets = importableReports.filter((r) => effectiveSupervisorId(r));
        if (targets.length === 0) return;

        importAbortRef.current = false;
        setImportStarted(true);
        setIsImporting(true);
        setImportProgress(Object.fromEntries(targets.map((r) => [r.propertyId, { status: "pending" as const }])));

        for (const r of targets) {
            if (importAbortRef.current) break;
            const session = sessions.find((sess) => sess.propertyId === r.propertyId);
            if (!session) continue;

            setImportProgress((prev) => ({ ...prev, [r.propertyId]: { status: "importing" } }));
            try {
                const response: any = await applyAuditReportImport([session], overrides, Array.from(forceReimport));
                if (!response.success) {
                    setImportProgress((prev) => ({ ...prev, [r.propertyId]: { status: "FAILED", message: response.message || "Import failed" } }));
                    continue;
                }
                const result = response.data.properties[0];
                setImportProgress((prev) => ({ ...prev, [r.propertyId]: { status: result.status, message: result.message } }));
            } catch (error: any) {
                setImportProgress((prev) => ({ ...prev, [r.propertyId]: { status: "FAILED", message: error.message || "Import failed" } }));
            }
        }

        setIsImporting(false);
    };

    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
            />
            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fileInputRef.current?.click()} disabled={isValidating || isImporting} color="dark">
                    <HiUpload className="mr-2 h-4 w-4" />
                    {isValidating ? "Reading & validating..." : fileName ? "Upload a different workbook" : "Upload audited report workbook"}
                </Button>

                {fileName && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        <span className="max-w-xs truncate">{fileName}</span>
                        {isValidating && <span className="text-xs text-gray-400">validating...</span>}
                        <button
                            type="button"
                            onClick={reset}
                            disabled={isImporting}
                            title="Remove this file and start over"
                            className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-600 dark:hover:text-white"
                        >
                            <HiX className="h-4 w-4" />
                        </button>
                    </span>
                )}
            </div>

            {skippedSheets.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setShowSkipped((prev) => !prev)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                    >
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                                {skippedSheets.length} sheet{skippedSheets.length === 1 ? "" : "s"} not imported
                            </span>
                            {SKIP_REASON_ORDER.map((code) => {
                                const count = skippedSheets.filter((s) => s.reasonCode === code).length;
                                if (count === 0) return null;
                                return (
                                    <Badge key={code} color={SKIP_REASON_BADGE_COLOR[code]}>
                                        {count} {SKIP_REASON_LABEL[code]}
                                    </Badge>
                                );
                            })}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{showSkipped ? "Hide" : "Show"} details</span>
                    </button>
                    {showSkipped && (
                        <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto border-t border-gray-200 text-sm dark:divide-gray-700 dark:border-gray-700">
                            {skippedSheets.map((s) => (
                                <li key={s.sheet} className="px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{s.sheet}</span>
                                        <Badge color={SKIP_REASON_BADGE_COLOR[s.reasonCode]}>{SKIP_REASON_LABEL[s.reasonCode]}</Badge>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.reason}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {reports && reports.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {!importStarted ? (
                            <>
                                <Badge color="success">Ready: {readyCount}</Badge>
                                <Badge color="warning">Needs conductor: {needsConductorCount}</Badge>
                                <Badge color="failure">Blocked: {blockedCount}</Badge>
                            </>
                        ) : (
                            <>
                                <Badge color="success">Imported: {Object.values(importProgress).filter((p) => p.status === "IMPORTED").length}</Badge>
                                <Badge color="info">In progress: {Object.values(importProgress).filter((p) => p.status === "pending" || p.status === "importing").length}</Badge>
                                <Badge color="failure">
                                    Failed: {Object.values(importProgress).filter((p) => p.status === "FAILED" || p.status === "SKIPPED_BLOCKED").length}
                                </Badge>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (isImporting) {
                                    importAbortRef.current = true;
                                } else {
                                    reset();
                                }
                            }}
                            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 hover:underline dark:text-gray-400 dark:hover:text-red-400"
                        >
                            <HiX className="h-3.5 w-3.5" />
                            {isImporting ? "Stop after current property" : "Cancel this import"}
                        </button>
                    </div>

                    {!importStarted && alreadyImportedIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Checkbox id="force-reimport-all" checked={allForceChecked} onChange={toggleForceAll} />
                            <Label htmlFor="force-reimport-all" className="text-sm">
                                Re-import all {alreadyImportedIds.length} already-imported propert{alreadyImportedIds.length === 1 ? "y" : "ies"} anyway
                            </Label>
                        </div>
                    )}

                    <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeadCell>Property</TableHeadCell>
                                    <TableHeadCell>Audit Date</TableHeadCell>
                                    <TableHeadCell>Conductor</TableHeadCell>
                                    <TableHeadCell>Results</TableHeadCell>
                                    <TableHeadCell>Status</TableHeadCell>
                                    {importStarted && <TableHeadCell>Import</TableHeadCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {reports.map((r) => {
                                    const blocked = r.errors.length > 0;
                                    const isExpanded = expanded.has(r.propertyId);
                                    return (
                                        <Fragment key={r.propertyId}>
                                            <TableRow className={blocked ? "bg-red-50 dark:bg-red-950/30" : undefined}>
                                                <TableCell className="font-medium">
                                                    {r.propertyName || r.sheet}
                                                    <div className="text-xs text-gray-400">{r.sheet}</div>
                                                </TableCell>
                                                <TableCell>{r.auditDateISO || "—"}</TableCell>
                                                <TableCell>
                                                    {blocked ? (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    ) : (
                                                        <Select
                                                            sizing="sm"
                                                            value={effectiveSupervisorId(r)}
                                                            onChange={(e) =>
                                                                setOverrides((prev) => ({ ...prev, [r.propertyId]: e.target.value }))
                                                            }
                                                        >
                                                            <option value="">Select supervisor...</option>
                                                            {supervisors.map((sv) => (
                                                                <option key={sv.id} value={sv.id}>
                                                                    {sv.name}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    )}
                                                    {!blocked && r.conductorSource !== "unresolved" && !overrides[r.propertyId] && (
                                                        <div className="mt-1 text-xs text-gray-400">
                                                            matched by {r.conductorSource} from sheet
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.counts.maintenanceGood > 0 && <Badge color="success">{r.counts.maintenanceGood} good</Badge>}
                                                        {r.counts.maintenanceNeedsAttention > 0 && (
                                                            <Badge color="warning">{r.counts.maintenanceNeedsAttention} attention</Badge>
                                                        )}
                                                        {(r.counts.maintenanceCritical > 0 || r.counts.quantityCritical > 0) && (
                                                            <Badge color="failure">
                                                                {r.counts.maintenanceCritical + r.counts.quantityCritical} critical
                                                            </Badge>
                                                        )}
                                                        {r.counts.quantityShortage > 0 && <Badge color="warning">{r.counts.quantityShortage} shortage</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {blocked && <Badge color="failure">{r.errors.length} error{r.errors.length === 1 ? "" : "s"}</Badge>}
                                                        {r.warnings.length > 0 && <Badge color="warning">{r.warnings.length} warning{r.warnings.length === 1 ? "" : "s"}</Badge>}
                                                        {r.alreadyImported && (
                                                            <div className="flex items-center gap-1">
                                                                <Badge color="gray">Already imported</Badge>
                                                                <Checkbox
                                                                    id={`force-${r.propertyId}`}
                                                                    checked={forceReimport.has(r.propertyId)}
                                                                    onChange={() => toggleForce(r.propertyId)}
                                                                />
                                                                <Label htmlFor={`force-${r.propertyId}`} className="text-xs">
                                                                    re-import anyway
                                                                </Label>
                                                            </div>
                                                        )}
                                                        {(r.errors.length > 0 || r.warnings.length > 0) && (
                                                            <button
                                                                type="button"
                                                                className="text-left text-xs text-blue-600 hover:underline dark:text-blue-400"
                                                                onClick={() => toggleExpanded(r.propertyId)}
                                                            >
                                                                {isExpanded ? "Hide details" : "Show details"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {importStarted && (
                                                    <TableCell>
                                                        {importProgress[r.propertyId] ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <Badge color={IMPORT_STATUS_BADGE[importProgress[r.propertyId].status].color}>
                                                                    {IMPORT_STATUS_BADGE[importProgress[r.propertyId].status].label}
                                                                </Badge>
                                                                {importProgress[r.propertyId].message && (
                                                                    <span className="max-w-xs text-xs text-gray-500 dark:text-gray-400">
                                                                        {importProgress[r.propertyId].message}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                            {isExpanded && (r.errors.length > 0 || r.warnings.length > 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={importStarted ? 6 : 5} className="bg-gray-50 dark:bg-gray-900">
                                                        <ul className="space-y-1 text-xs">
                                                            {r.errors.map((e, i) => (
                                                                <li key={`e-${i}`} className="text-red-600 dark:text-red-400">
                                                                    {e.rowNumber ? `Row ${e.rowNumber}: ` : ""}
                                                                    {e.message}
                                                                </li>
                                                            ))}
                                                            {r.warnings.map((w, i) => (
                                                                <li key={`w-${i}`} className="text-amber-600 dark:text-amber-400">
                                                                    {w.rowNumber ? `Row ${w.rowNumber}: ` : ""}
                                                                    {w.message}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        {!importStarted ? (
                            <>
                                <Button onClick={handleConfirm} disabled={!canConfirm}>
                                    {`Confirm & Import (${readyCount}${blockedCount > 0 ? `, ${blockedCount} blocked skipped` : ""})`}
                                </Button>
                                {needsConductorCount > 0 && (
                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                        Pick a conductor for every non-blocked property before confirming.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isImporting
                                    ? "Importing — watch the Import column above for live progress per property."
                                    : "Import finished. Upload a new file to run another import."}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
