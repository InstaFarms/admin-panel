"use client";

import React, { useState, useTransition } from "react";
import { HiOutlineExclamationCircle, HiArrowRight } from "react-icons/hi";
import toast from "react-hot-toast";

import PropertyApplicabilitySelector from "@/components/common/PropertyApplicabilitySelector";

import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import { previewBulkUpdate, executeBulkUpdate } from "@/actions/bulkActions";

import { Button, Card, Label, Select, TextInput, Datepicker, Modal, Spinner, Table, ModalHeader, ModalBody, TableHeadCell, TableHead, TableBody, TableRow, TableCell, ModalFooter, Checkbox } from "flowbite-react";

import { useRouter } from "next/navigation";

export default function BulkSpecialDateForm({
    brandName,
    brandId,
    basePath = "/admin/properties/bulk-update"
}: {
    brandName?: string;
    brandId?: string;
    basePath?: string;
}) {
    const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
    const [isAppliedToAll, setIsAppliedToAll] = useState(false);
    const [preloadedEntities, setPreloadedEntities] = useState<any[]>([]);
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    console.log("Render - Target Date:", targetDate);

    const [operationType, setOperationType] = useState<"increase" | "decrease" | "set_fixed">("increase");
    const [operationMode, setOperationMode] = useState<"percentage" | "flat">("percentage");
    const [operationValue, setOperationValue] = useState<number>(0);

    const [previewData, setPreviewData] = useState<any | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const [isPreviewing, startPreviewTransition] = useTransition();
    const [isExecuting, startExecuteTransition] = useTransition();

    const router = useRouter(); // Initialize router

    // Preload entities for the selector
    React.useEffect(() => {
        (async () => {
            const res = await getAllPropertiesForSelector(brandName);
            if (res.success && res.data) {
                setPreloadedEntities(res.data);
            }
        })();
    }, [brandName]);

    const handlePreview = () => {
        if (!isAppliedToAll && selectedPropertyIds.length === 0) {
            toast.error("Please select at least one property or apply to all.");
            return;
        }
        if (!targetDate) {
            toast.error("Please select a date.");
            return;
        }

        if (operationType !== "set_fixed" && operationValue <= 0) {
            // Technically set_fixed could be 0?
            if (operationValue < 0) {
                toast.error("Value must be positive.");
                return;
            }
        }

        // Format date to YYYY-MM-DD manually to avoid timezone issues
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const payload = {
            propertyIds: selectedPropertyIds,
            isAppliedToAll,
            brandId,
            date: dateStr,
            operation: {
                type: operationType,
                mode: operationType === "set_fixed" ? undefined : operationMode,
                value: operationValue,
            },
        };

        startPreviewTransition(() => {
            (async () => {
                const res = await previewBulkUpdate(payload);
                if (res.success) {
                    setPreviewData(res.data);
                    setShowPreviewModal(true);
                } else {
                    toast.error(res.message);
                }
            })();
        });
    };

    const handleExecute = () => {
        if (confirmText !== "CONFIRM") {
            toast.error("Please type CONFIRM to proceed.");
            return;
        }

        const year = targetDate!.getFullYear();
        const month = String(targetDate!.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate!.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const payload = {
            propertyIds: selectedPropertyIds,
            isAppliedToAll,
            brandId,
            date: dateStr,
            operation: {
                type: operationType,
                mode: operationType === "set_fixed" ? undefined : operationMode,
                value: operationValue,
            },
        };

        setShowConfirmModal(false); // Close modal first or keep check
        startExecuteTransition(() => {
            (async () => {
                const res = await executeBulkUpdate(payload);
                if (res.success) {
                    toast.success(res.message);
                    setShowPreviewModal(false);
                    setShowConfirmModal(false);
                    setConfirmText("");
                    router.push(basePath);
                    router.refresh();
                } else {
                    toast.error(res.message);
                }
            })();
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Bulk Special Date Update</h2>

                {/* Property Selection Scope */}
                <PropertyApplicabilitySelector
                    appliesToAllEntities={isAppliedToAll}
                    setAppliesToAllEntities={setIsAppliedToAll}
                    entityIds={selectedPropertyIds}
                    setEntityIds={setSelectedPropertyIds}
                    preloadedEntities={preloadedEntities}
                    startTransition={startPreviewTransition}
                    brandId={brandId}
                    title="Property Applicability"
                />

                {/* Single Date Selection */}
                <div className="flex flex-col gap-2 max-w-md">
                    <Label>Select Date</Label>
                    <Datepicker
                        value={targetDate}
                        onChange={(date: Date | null) => {
                            console.log("Selected Date:", date);
                            if (date) setTargetDate(date);
                        }}
                    />
                </div>

                {/* Operation Rules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-2">
                    <div className="flex flex-col gap-2">
                        <Label>Action</Label>
                        <Select
                            value={operationType}
                            onChange={(e: any) => setOperationType(e.target.value)}
                        >
                            <option value="increase">Increase Price</option>
                            <option value="decrease">Decrease Price</option>
                            <option value="set_fixed">Set Fixed Price</option>
                        </Select>
                    </div>

                    {operationType !== "set_fixed" && (
                        <div className="flex flex-col gap-2">
                            <Label>Mode</Label>
                            <Select
                                value={operationMode}
                                onChange={(e: any) => setOperationMode(e.target.value)}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat Amount (₹)</option>
                            </Select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Label>Value</Label>
                        <TextInput
                            type="number"
                            min={0}
                            placeholder={operationType === "set_fixed" ? "Fixed Price" : "Amount"}
                            value={operationValue}
                            onChange={(e) => setOperationValue(Number(e.target.value))}
                        />
                    </div>
                </div>

                <Button
                    onClick={handlePreview}
                    disabled={isPreviewing || isExecuting}
                    color="purple"
                    className="mt-4"
                >
                    {isPreviewing ? <Spinner size="sm" className="mr-2" /> : null}
                    Preview Changes
                </Button>
            </Card>

            {/* Preview Modal */}
            <Modal show={showPreviewModal} size="xl" onClose={() => setShowPreviewModal(false)}>
                <ModalHeader>Confirm Changes</ModalHeader>
                <ModalBody>
                    {previewData && (
                        <div className="flex flex-col gap-4">
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2 font-semibold">
                                    <HiOutlineExclamationCircle size={20} />
                                    Summary
                                </div>
                                <p>{previewData.message}</p>
                                <ul className="list-disc list-inside mt-2 text-sm">
                                    <li>Total Properties: <strong>{previewData.affectedProperties ?? 0}</strong></li>
                                    <li>Target Date: <strong>{targetDate?.toDateString()}</strong></li>
                                    <li>Operation: <strong>{operationType.toUpperCase()}</strong> {operationType !== 'set_fixed' && `by ${operationValue}${operationMode === 'percentage' ? '%' : ''}`}</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">
                                    {previewData.sampleChanges.length <= 5 ? "Changes" : "Sample Changes (First 5)"}
                                </h4>
                                <div className="overflow-x-auto">
                                    <Table hoverable striped>
                                        <TableHead>
                                          <TableRow>
                                              <TableHeadCell>Property</TableHeadCell>
                                              <TableHeadCell>Base Price</TableHeadCell>
                                              <TableHeadCell>New Price</TableHeadCell>
                                              <TableHeadCell>Diff</TableHeadCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody className="divide-y">
                                            {previewData.sampleChanges.map((item: any, idx: number) => (
                                                <TableRow key={idx} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                                    <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                        {item.propertyName}
                                                    </TableCell>
                                                    <TableCell>₹{item.currentBasePrice}</TableCell>
                                                    <TableCell className="font-bold text-green-600">₹{item.newBasePrice}</TableCell>
                                                    <TableCell>
                                                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">* Prices shown are based on the property's base price for the selected day.</p>
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <Label htmlFor="confirm-input" className="mb-2 block text-red-600 font-bold">Type 'CONFIRM' to execute these changes:</Label>
                                <TextInput
                                    id="confirm-input"
                                    placeholder="CONFIRM"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    className="mb-4"
                                />
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="failure"
                        onClick={handleExecute}
                        disabled={confirmText !== "CONFIRM" || isExecuting}
                    >
                        {isExecuting ? <Spinner size="sm" className="mr-2" /> : null}
                        Execute Update
                    </Button>
                    <Button color="gray" onClick={() => setShowPreviewModal(false)} disabled={isExecuting}>
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
