"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { Button, Card, Label, Select, TextInput, Checkbox, Badge } from "flowbite-react";
import { useRouter } from "next/navigation";

import { DAYS_OF_WEEK } from "@/constants/coupons";
import { OPERATION_TYPES, BULK_VALDIATION_MESSAGES } from "@/constants/bulk";

import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import { executePermanentBulkUpdate } from "@/actions/bulkActions";

import PropertyApplicabilitySelector from "@/components/common/PropertyApplicabilitySelector";
import ConfirmModal from "@/components/ConfirmModal";

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

    const [showConfirm, setShowConfirm] = useState(false);

    // Read by the late-resolving preload effect below, which would otherwise
    // close over the mode as it was at mount time.
    const appliesToAllEntitiesRef = useRef(appliesToAllEntities);
    appliesToAllEntitiesRef.current = appliesToAllEntities;

    useEffect(() => {
        let cancelled = false;
        startTransition(() => {
            getAllPropertiesForSelector(brandName).then((res) => {
                const all = res.data;
                if (cancelled || !all) return;
                setPreloadedEntities(all);
                // Seed the "all properties" default ONLY while still in that
                // mode. This fetch resolves late; without the guard it used to
                // clobber a selection the user had already made after switching
                // to "Specific Properties", silently widening a one-property
                // update to the entire brand.
                setEntityIds((prev) =>
                    appliesToAllEntitiesRef.current ? all.map((e: any) => e.id) : prev
                );
            });
        });
        return () => {
            cancelled = true;
        };
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

    // Validate first, then confirm — this writes permanent prices across many
    // properties with no undo beyond the log's revert action.
    const handleRequestConfirm = () => {
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
        setShowConfirm(true);
    };

    const handleSubmit = async () => {
        setShowConfirm(false);

        let type, mode;
        if (operationType === "set_fixed") {
            type = "set_fixed";
            mode = "flat";
        } else {
            [type, mode] = operationType.split("_");
        }

        const payload = {
            entityType: "PROPERTY",
            // In "All Properties" mode send the EXCLUSIONS and let the server
            // resolve the brand's full set. Sending the enumerated entityIds
            // instead would silently cap the update at the selector's single
            // fetched page (perPage: 1000).
            ...(appliesToAllEntities
                ? {
                      excludePropertyIds: preloadedEntities
                          .map((e: any) => e.id)
                          .filter((id: string) => !entityIds.includes(id)),
                  }
                : { propertyIds: entityIds }),
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
                    onClick={handleRequestConfirm}
                    disabled={loading}
                    className="px-8"
                >
                    {loading ? "Executing..." : "Apply Permanent Changes"}
                </Button>
            </div>

            <ConfirmModal
                showModal={showConfirm}
                tone="danger"
                title="Apply permanent price changes?"
                confirmLabel="Apply Permanent Changes"
                loadingLabel="Executing..."
                loading={loading}
                acceptCallback={handleSubmit}
                closeCallback={() => setShowConfirm(false)}
                confirmationText={
                    <>
                        <span className="font-semibold">
                            {OPERATION_TYPES.find((o) => o.value === operationType)?.label}
                        </span>{" "}
                        of <span className="font-semibold">{operationValue || 0}</span> will be
                        applied to{" "}
                        <span className="font-semibold">
                            {applicableDays.length === DAYS_OF_WEEK.length
                                ? "every day"
                                : `${applicableDays.length} day(s)`}
                        </span>{" "}
                        across{" "}
                        <span className="font-semibold">
                            {appliesToAllEntities
                                ? `ALL ${brandName ?? ""} properties${
                                      preloadedEntities.length - entityIds.length > 0
                                          ? ` except ${preloadedEntities.length - entityIds.length}`
                                          : ""
                                  }`
                                : `${entityIds.length} selected propert${entityIds.length === 1 ? "y" : "ies"}`}
                        </span>
                        . This changes stored prices permanently — it can only be undone from the
                        logs list.
                    </>
                }
            />
        </div>
    );
}
