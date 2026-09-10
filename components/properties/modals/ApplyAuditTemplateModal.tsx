"use client";

import { useEffect, useState } from "react";

import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Select, Spinner } from "flowbite-react";

import { getAuditTemplates } from "@/actions/auditTemplateActions";

interface AuditTemplateSummary {
    id: string;
    name: string;
    isDefault?: boolean;
    isActive?: boolean;
    areas?: { items?: unknown[] }[];
}

interface ApplyAuditTemplateModalProps {
    show: boolean;
    onClose: () => void;
    onApply: (templateId?: string) => Promise<boolean>;
}

export default function ApplyAuditTemplateModal({
    show,
    onClose,
    onApply,
}: ApplyAuditTemplateModalProps) {
    const [templates, setTemplates] = useState<AuditTemplateSummary[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        setLoading(true);
        getAuditTemplates()
            .then((result) => {
                if (cancelled) return;
                const list: AuditTemplateSummary[] = (result?.data ?? []).filter(
                    (t: AuditTemplateSummary) => t.isActive,
                );
                setTemplates(list);
                const preferred = list.find((t) => t.isDefault) ?? list[0];
                setSelectedId(preferred?.id ?? "");
            })
            .catch((err) => console.error("Failed to load audit templates", err))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [show]);

    const selected = templates.find((t) => t.id === selectedId);
    const areaCount = selected?.areas?.length ?? 0;
    const itemCount = (selected?.areas ?? []).reduce(
        (sum, area) => sum + (area.items?.length ?? 0),
        0,
    );

    const handleApply = async () => {
        if (!selectedId) return;
        setApplying(true);
        try {
            const ok = await onApply(selectedId);
            if (ok) onClose();
        } finally {
            setApplying(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <ModalHeader>Apply Audit Template</ModalHeader>
            <ModalBody>
                {loading ? (
                    <div className="flex items-center justify-center p-6">
                        <Spinner size="lg" />
                    </div>
                ) : templates.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No active audit templates exist yet. Create one under Audit Master &rarr; Templates.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="auditTemplate">Template</Label>
                            </div>
                            <Select
                                id="auditTemplate"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                        {t.isDefault ? " (default)" : ""}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {selected && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Adds {areaCount} area(s) and {itemCount} checklist item(s).
                            </p>
                        )}

                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                            This <strong>copies</strong> the template&apos;s areas and checklist items onto this
                            property. Later edits to the template will not change this property. Areas that
                            already exist here are skipped, so applying twice is safe.
                        </p>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleApply} disabled={applying || loading || !selectedId}>
                    {applying ? "Applying..." : "Apply Template"}
                </Button>
                <Button color="gray" onClick={onClose} disabled={applying}>
                    Cancel
                </Button>
            </ModalFooter>
        </Modal>
    );
}
