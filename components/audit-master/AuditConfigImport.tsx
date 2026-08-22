"use client";

import { Fragment, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
    Badge,
    Button,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableRow,
    TableCell,
} from "flowbite-react";
import { HiUpload, HiX } from "react-icons/hi";

import { parseAuditConfigWorkbook, buildSyncSections, type SyncAreaInput } from "@/lib/auditConfigImportParser";
import { bulkValidateAuditConfigImport, bulkApplyAuditConfigImport } from "@/actions/auditActions";

interface PropertyPayload {
    sheet: string;
    propertyId: string;
    sections: SyncAreaInput[];
}

interface Issue {
    rowNumber?: number;
    message: string;
}

interface PropertyReport {
    sheet: string;
    propertyId: string;
    propertyName: string | null;
    areaCount: number;
    itemCount: number;
    pendingNewAreaCategories: string[];
    pendingNewChecklistItems: { name: string; itemType: string }[];
    errors: { section: string; item?: string; message: string }[];
    formatWarnings: Issue[];
}

type ImportRowStatus = "pending" | "importing" | "SYNCED" | "SKIPPED_BLOCKED" | "FAILED";

interface ImportProgress {
    status: ImportRowStatus;
    message?: string;
}

const IMPORT_STATUS_BADGE: Record<ImportRowStatus, { color: "gray" | "info" | "success" | "failure"; label: string }> = {
    pending: { color: "gray", label: "Queued" },
    importing: { color: "info", label: "Syncing…" },
    SYNCED: { color: "success", label: "Synced" },
    SKIPPED_BLOCKED: { color: "failure", label: "Blocked" },
    FAILED: { color: "failure", label: "Failed" },
};

export default function AuditConfigImport() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const requestId = useRef(0);
    const importAbortRef = useRef(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [properties, setProperties] = useState<PropertyPayload[] | null>(null);
    const [skippedSheets, setSkippedSheets] = useState<{ sheet: string; reason: string }[]>([]);
    const [reports, setReports] = useState<PropertyReport[] | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [importStarted, setImportStarted] = useState(false);
    const [importProgress, setImportProgress] = useState<Record<string, ImportProgress>>({});

    const reset = () => {
        requestId.current++;
        importAbortRef.current = true; // stops an in-flight import loop after its current property
        setFileName(null);
        setIsValidating(false);
        setIsImporting(false);
        setProperties(null);
        setSkippedSheets([]);
        setReports(null);
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
            const parsed = parseAuditConfigWorkbook(workbook);

            if (parsed.properties.length === 0) {
                toast.error("No configured properties found in this workbook");
                return;
            }

            const formatWarningsByProperty = new Map<string, Issue[]>();
            const payload: PropertyPayload[] = parsed.properties.map((property) => {
                const { sections, formatErrors } = buildSyncSections(property);
                if (formatErrors.length > 0) formatWarningsByProperty.set(property.propertyId, formatErrors);
                return { sheet: property.sheet, propertyId: property.propertyId, sections };
            });

            const response: any = await bulkValidateAuditConfigImport(payload);
            if (thisRequest !== requestId.current) return;
            if (!response.success) {
                toast.error(response.message || "Validation failed");
                return;
            }

            setProperties(payload);
            setSkippedSheets(parsed.skippedSheets);
            setReports(
                response.data.properties.map((r: any) => ({
                    ...r,
                    formatWarnings: formatWarningsByProperty.get(r.propertyId) || [],
                }))
            );
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

    const blockedReports = (reports || []).filter((r) => r.errors.length > 0);
    const readyReports = (reports || []).filter((r) => r.errors.length === 0);
    const totalPendingNewItems = readyReports.reduce((sum, r) => sum + r.pendingNewChecklistItems.length, 0);
    const canConfirm = readyReports.length > 0;

    // Syncs one property at a time (rather than one bulk call) so the table can show live
    // per-row progress as each one lands.
    const handleConfirm = async () => {
        if (!properties) return;
        const readyIds = new Set(readyReports.map((r) => r.propertyId));
        const targets = properties.filter((p) => readyIds.has(p.propertyId));
        if (targets.length === 0) return;

        importAbortRef.current = false;
        setImportStarted(true);
        setIsImporting(true);
        setImportProgress(Object.fromEntries(targets.map((p) => [p.propertyId, { status: "pending" as const }])));

        for (const property of targets) {
            if (importAbortRef.current) break;

            setImportProgress((prev) => ({ ...prev, [property.propertyId]: { status: "importing" } }));
            try {
                const response: any = await bulkApplyAuditConfigImport([property]);
                if (!response.success) {
                    setImportProgress((prev) => ({
                        ...prev,
                        [property.propertyId]: { status: "FAILED", message: response.message || "Sync failed" },
                    }));
                    continue;
                }
                const result = response.data.properties[0];
                const summary = result.summary
                    ? `+${result.summary.areasCreated} areas, +${result.summary.itemsCreated} items, +${result.summary.checklistItemsCreated} new checklist items`
                    : result.message;
                setImportProgress((prev) => ({ ...prev, [property.propertyId]: { status: result.status, message: summary } }));
            } catch (error: any) {
                setImportProgress((prev) => ({
                    ...prev,
                    [property.propertyId]: { status: "FAILED", message: error.message || "Sync failed" },
                }));
            }
        }

        setIsImporting(false);
    };

    return (
        <div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fileInputRef.current?.click()} disabled={isValidating || isImporting} color="purple">
                    <HiUpload className="mr-2 h-4 w-4" />
                    {isValidating ? "Reading & validating..." : fileName ? "Upload a different workbook" : "Upload configuration workbook"}
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
                <p className="mt-2 text-xs text-gray-500">
                    {skippedSheets.length} sheet{skippedSheets.length === 1 ? "" : "s"} skipped:{" "}
                    {skippedSheets
                        .filter((s) => s.reason.startsWith("No area/item"))
                        .map((s) => s.sheet)
                        .join(", ") || "none"}
                    {skippedSheets.some((s) => !s.reason.startsWith("No area/item")) && (
                        <span className="mt-1 block font-medium text-red-600 dark:text-red-400">
                            Needs fixing before it can be imported:{" "}
                            {skippedSheets
                                .filter((s) => !s.reason.startsWith("No area/item"))
                                .map((s) => `${s.sheet} (${s.reason})`)
                                .join("; ")}
                        </span>
                    )}
                </p>
            )}

            {reports && reports.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {!importStarted ? (
                            <>
                                <Badge color="success">Ready: {readyReports.length}</Badge>
                                <Badge color="failure">Blocked: {blockedReports.length}</Badge>
                                {totalPendingNewItems > 0 && (
                                    <Badge color="info">{totalPendingNewItems} new checklist item{totalPendingNewItems === 1 ? "" : "s"} will be created</Badge>
                                )}
                            </>
                        ) : (
                            <>
                                <Badge color="success">Synced: {Object.values(importProgress).filter((p) => p.status === "SYNCED").length}</Badge>
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

                    <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeadCell>Property</TableHeadCell>
                                    <TableHeadCell>Areas / Items</TableHeadCell>
                                    <TableHeadCell>New master data</TableHeadCell>
                                    <TableHeadCell>Status</TableHeadCell>
                                    {importStarted && <TableHeadCell>Import</TableHeadCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {reports.map((r) => {
                                    const blocked = r.errors.length > 0;
                                    const isExpanded = expanded.has(r.propertyId);
                                    const hasDetails = r.errors.length > 0 || r.formatWarnings.length > 0;
                                    return (
                                        <Fragment key={r.propertyId}>
                                            <TableRow className={blocked ? "bg-red-50 dark:bg-red-950/30" : undefined}>
                                                <TableCell className="font-medium">
                                                    {r.propertyName || r.sheet}
                                                    <div className="text-xs text-gray-400">{r.sheet}</div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {r.areaCount} area{r.areaCount === 1 ? "" : "s"}, {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {r.pendingNewAreaCategories.length > 0 && (
                                                        <div>{r.pendingNewAreaCategories.length} new area categor{r.pendingNewAreaCategories.length === 1 ? "y" : "ies"}</div>
                                                    )}
                                                    {r.pendingNewChecklistItems.length > 0 && (
                                                        <div>{r.pendingNewChecklistItems.length} new checklist item{r.pendingNewChecklistItems.length === 1 ? "" : "s"}</div>
                                                    )}
                                                    {r.pendingNewAreaCategories.length === 0 && r.pendingNewChecklistItems.length === 0 && (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {blocked ? (
                                                            <Badge color="failure">{r.errors.length} error{r.errors.length === 1 ? "" : "s"}</Badge>
                                                        ) : (
                                                            <Badge color="success">Ready</Badge>
                                                        )}
                                                        {r.formatWarnings.length > 0 && (
                                                            <Badge color="warning">{r.formatWarnings.length} format warning{r.formatWarnings.length === 1 ? "" : "s"}</Badge>
                                                        )}
                                                        {hasDetails && (
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
                                            {isExpanded && hasDetails && (
                                                <TableRow>
                                                    <TableCell colSpan={importStarted ? 5 : 4} className="bg-gray-50 dark:bg-gray-900">
                                                        <ul className="space-y-1 text-xs">
                                                            {r.errors.map((e, i) => (
                                                                <li key={`e-${i}`} className="text-red-600 dark:text-red-400">
                                                                    {e.section}
                                                                    {e.item ? ` / ${e.item}` : ""}: {e.message}
                                                                </li>
                                                            ))}
                                                            {r.formatWarnings.map((w, i) => (
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
                            <Button color="purple" onClick={handleConfirm} disabled={!canConfirm}>
                                {`Confirm & Sync (${readyReports.length}${blockedReports.length > 0 ? `, ${blockedReports.length} blocked skipped` : ""})`}
                            </Button>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isImporting
                                    ? "Syncing — watch the Import column above for live progress per property."
                                    : "Sync finished. Upload a new file to run another import."}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
