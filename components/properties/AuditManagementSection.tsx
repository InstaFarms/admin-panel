"use client";

import LabelWrapper from "@/components/LabelWrapper";

import { PropertyManagementType } from "@/utils/types";

import { Select, TextInput, ToggleSwitch } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

interface AuditManagementSectionProps {
    propertyManagementType: PropertyManagementType | null;
    setPropertyManagementType: (value: PropertyManagementType | null) => void;
    auditEnabled: boolean;
    setAuditEnabled: (value: boolean) => void;
    maxAuditGapDays: number | null;
    setMaxAuditGapDays: (value: number | null) => void;
    isLoading?: boolean;
}

export default function AuditManagementSection({
    propertyManagementType,
    setPropertyManagementType,
    auditEnabled,
    setAuditEnabled,
    maxAuditGapDays,
    setMaxAuditGapDays,
    isLoading = false,
}: AuditManagementSectionProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center p-10">
                <JarvisLoader size="lg" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1000px]">
            <div className="grid grid-cols-2 gap-5">
                <LabelWrapper label="Management Type">
                    <Select
                        id="propertyManagementType"
                        name="propertyManagementType"
                        value={propertyManagementType || ""}
                        onChange={(e) => setPropertyManagementType(e.target.value as PropertyManagementType || null)}
                        disabled={isLoading}
                    >
                        <option value="">Select Management Type</option>
                        <option value="MAGO_MANAGED">Mago Managed</option>
                        <option value="LISTING_ONLY">Listing Only</option>
                    </Select>
                </LabelWrapper>

                <LabelWrapper label="Max Audit Gap (Days)">
                    <TextInput
                        type="numeric"
                        id="maxAuditGapDays"
                        name="maxAuditGapDays"
                        placeholder="e.g. 30"
                        value={maxAuditGapDays?.toString() || ""}
                        onChange={(e) => setMaxAuditGapDays(e.target.value ? Number(e.target.value) : null)}
                        disabled={isLoading}
                    />
                </LabelWrapper>

                <div className="flex items-center pt-2 pb-6">
                    <ToggleSwitch
                        label="Enable Audit"
                        checked={auditEnabled}
                        onChange={(val) => setAuditEnabled(val)}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
