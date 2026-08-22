"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
    Button,
    Checkbox,
    Label,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableRow,
    TableCell,
} from "flowbite-react";
import { HiUpload, HiDownload } from "react-icons/hi";

import { bulkImportAuditMasterItems } from "@/actions/auditMasterActions";

type AuditMasterType = "area-categories" | "checklist-categories" | "checklist-items" | "issue-types";

interface AuditMasterExcelImportProps {
    type: AuditMasterType;
    onDone: () => void;
}

interface ImportSummary {
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
}

const TEMPLATE_COLUMNS: Record<AuditMasterType, string[]> = {
    "area-categories": ["name", "weight", "isActive"],
    "checklist-categories": ["name", "itemType", "weight", "isActive"],
    "checklist-items": ["itemType", "category", "name", "defaultPhotoRequirementType", "isActive"],
    "issue-types": ["code", "label", "description", "isActive"],
};

const TEMPLATE_SAMPLE_ROW: Record<AuditMasterType, (string | number)[]> = {
    "area-categories": ["Kitchen", 10, "TRUE"],
    "checklist-categories": ["Kitchen Appliances", "INVENTORY", 5, "TRUE"],
    "checklist-items": ["INVENTORY", "Kitchen Appliances", "Microwave", "ALWAYS_REQUIRED", "TRUE"],
    "issue-types": ["DAMAGED", "Damaged", "Item is physically damaged", "TRUE"],
};

export default function AuditMasterExcelImport({ type, onDone }: AuditMasterExcelImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [summary, setSummary] = useState<ImportSummary | null>(null);

    const downloadTemplate = () => {
        const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS[type], TEMPLATE_SAMPLE_ROW[type]]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Template");
        XLSX.writeFile(workbook, `${type}-import-template.xlsx`);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setShowOptions(false);
        setIsImporting(true);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

            if (rows.length === 0) {
                toast.error("The uploaded file has no data rows");
                return;
            }

            const response: any = await bulkImportAuditMasterItems(type, rows, replaceExisting);

            if (!response.success) {
                toast.error(response.message || "Import failed");
                return;
            }

            setSummary(response.data);
            onDone();
        } catch (error: any) {
            toast.error(error.message || "Failed to parse the file");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
            />

            <Button size="sm" color="light" onClick={() => setShowOptions(!showOptions)} disabled={isImporting}>
                <HiUpload className="mr-2 h-4 w-4" />
                {isImporting ? "Importing..." : "Import Excel"}
            </Button>

            {showOptions && (
                <div className="absolute top-full right-0 mt-2 z-50 w-72 rounded-lg border border-gray-300 bg-white p-4 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                            <HiDownload className="h-4 w-4" />
                            Download template
                        </button>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="replaceExisting"
                                checked={replaceExisting}
                                onChange={(e) => setReplaceExisting(e.target.checked)}
                            />
                            <Label htmlFor="replaceExisting" className="text-sm">
                                Update rows that already exist
                            </Label>
                        </div>

                        <Button size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                            Choose file to upload
                        </Button>
                    </div>
                </div>
            )}

            <Modal show={summary !== null} onClose={() => setSummary(null)} size="lg">
                <ModalHeader>Import Results</ModalHeader>
                <ModalBody>
                    {summary && (
                        <div className="space-y-4">
                            <div className="flex gap-2 text-sm">
                                <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                    Created: {summary.created}
                                </span>
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                    Updated: {summary.updated}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    Skipped: {summary.skipped}
                                </span>
                                {summary.errors.length > 0 && (
                                    <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                        Errors: {summary.errors.length}
                                    </span>
                                )}
                            </div>

                            {summary.errors.length > 0 && (
                                <div className="max-h-64 overflow-y-auto">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeadCell>Row</TableHeadCell>
                                                <TableHeadCell>Error</TableHeadCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody className="divide-y">
                                            {summary.errors.map((err, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{err.row}</TableCell>
                                                    <TableCell>{err.message}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="gray" onClick={() => setSummary(null)}>
                        Close
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
