"use client";

import { useState, useTransition, useEffect } from "react";
import toast from "react-hot-toast";

import { Button, Card, Label, Select, TextInput, Checkbox, Badge } from "flowbite-react";
import { useRouter } from "next/navigation";

import { DAYS_OF_WEEK } from "@/constants/coupons";
import { OPERATION_TYPES, BULK_VALDIATION_MESSAGES } from "@/constants/bulk";

import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import { executePermanentBulkUpdate } from "@/actions/bulkActions";

import PropertyApplicabilitySelector from "@/components/common/PropertyApplicabilitySelector";

export default function PermanentPriceUpdateForm({
    brandName,
    brandId,
    basePath = "/admin/properties/permanent-price-update"
}: {
    brandName?: string;
    brandId?: string;
    basePath?: string;
}) {
    const router = useRouter();
    const [loading, startTransition] = useTransition();

    // Action Row State
    const [operationType, setOperationType] = useState<string>("increase_percentage");
    const [operationValue, setOperationValue] = useState<string>("");

    // Days Row State
    const [applicableDays, setApplicableDays] = useState<string[]>([...DAYS_OF_WEEK]);

    // Target Row State
    const [appliesToAllEntities, setAppliesToAllEntities] = useState(true);
    const [entityIds, setEntityIds] = useState<string[]>([]);
    const [preloadedEntities, setPreloadedEntities] = useState<any[]>([]);

    useEffect(() => {
        startTransition(() => {
            getAllPropertiesForSelector(brandName).then((res) => {
                if (res.data) {
                    setPreloadedEntities(res.data);
                    setEntityIds(res.data.map((e: any) => e.id));
                }
            });
        });
    }, [brandName]);

    const handleSelectAllDays = () => {
        if (applicableDays.length === DAYS_OF_WEEK.length) {
            setApplicableDays([]);
        } else {
            setApplicableDays([...DAYS_OF_WEEK]);
        }
    };

    const toggleDay = (day: string) => {
        setApplicableDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = async () => {
        if (!operationValue) {
            toast.error(BULK_VALDIATION_MESSAGES.valueRequired);
            return;
        }
        if (applicableDays.length === 0) {
            toast.error(BULK_VALDIATION_MESSAGES.daysRequired);
            return;
        }
        if (!appliesToAllEntities && entityIds.length === 0) {
            toast.error(BULK_VALDIATION_MESSAGES.entityRequired.replace(/entity/gi, "property"));
            return;
        }

        let type, mode;
        if (operationType === "set_fixed") {
            type = "set_fixed";
            mode = "flat";
        } else {
            [type, mode] = operationType.split("_");
        }

        const payload = {
            entityType: "PROPERTY",
            propertyIds: entityIds,
            isAppliedToAll: appliesToAllEntities,
            brandId,
            applicableDays,
            operation: {
                type,
                mode,
                value: parseFloat(operationValue),
            },
        };

        startTransition(() => {
            executePermanentBulkUpdate(payload).then((res) => {
                if (res.success) {
                    toast.success(res.message || "Update executed successfully");
                    setOperationValue("");
                    router.push(basePath);
                    router.refresh();
                } else {
                    toast.error(res.message || "Failed to execute update");
                }
            });
        });
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Action Row */}
            <Card className="bg-slate-50 dark:bg-gray-900 border-none shadow-none">
                <h6 className="text-md font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    1. The Action Row <Badge color="info">What to do?</Badge>
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="operationType">Operation Type</Label>
                        <Select
                            id="operationType"
                            value={operationType}
                            onChange={(e) => setOperationType(e.target.value)}
                            className="mt-1"
                        >
                            {OPERATION_TYPES.map((op) => (
                                <option key={op.value} value={op.value}>
                                    {op.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="operationValue">Value</Label>
                        <TextInput
                            id="operationValue"
                            type="number"
                            placeholder="Enter amount or %"
                            value={operationValue}
                            onChange={(e) => setOperationValue(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </div>
            </Card>

            {/* Days Row */}
            <Card className="bg-slate-50 dark:bg-gray-900 border-none shadow-none">
                <div className="flex justify-between items-center mb-2">
                    <h6 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        2. The Days Row <Badge color="success">When to apply?</Badge>
                    </h6>
                    <Button size="xs" color="gray" onClick={handleSelectAllDays}>
                        {applicableDays.length === DAYS_OF_WEEK.length ? "Deselect All" : "Select All"}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="flex items-center gap-2">
                            <Checkbox
                                id={`day-${day}`}
                                checked={applicableDays.includes(day)}
                                onChange={() => toggleDay(day)}
                            />
                            <Label htmlFor={`day-${day}`} className="capitalize">
                                {day}
                            </Label>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Target Row */}
            <Card className="bg-slate-50 dark:bg-gray-900 border-none shadow-none">
                <h6 className="text-md font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    3. The Target Row <Badge color="warning">Where to apply?</Badge>
                </h6>
                <PropertyApplicabilitySelector
                    appliesToAllEntities={appliesToAllEntities}
                    setAppliesToAllEntities={setAppliesToAllEntities}
                    entityIds={entityIds}
                    setEntityIds={setEntityIds}
                    preloadedEntities={preloadedEntities}
                    startTransition={startTransition}
                    brandId={brandId}
                    title="Property Applicability"
                />
            </Card>

            <div className="flex justify-end mt-4">
                <Button
                    color="blue"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8"
                >
                    {loading ? "Executing..." : "Apply Permanent Changes"}
                </Button>
            </div>
        </div>
    );
}
