"use client";

import { useState, useEffect } from "react";

import { Button, Label, TextInput, ToggleSwitch } from "flowbite-react";

// UI: "Audit Area Type" form — backed by the area-categories API / propertyAuditAreaCategoryMaster table
interface AreaCategoryFormProps {
    initialData?: {
        name: string;
        weight: number;
        isActive?: boolean;
    };
    isSubmitting: boolean;
    onSubmit: (data: { name: string; weight: number; isActive: boolean }) => void;
    onCancel: () => void;
}

export default function AreaCategoryForm({ initialData, isSubmitting, onSubmit, onCancel }: AreaCategoryFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        weight: 0,
        isActive: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                weight: initialData.weight,
                isActive: initialData.isActive ?? true
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="name">
                        Audit Area Type Name <span className="text-red-500">*</span>
                    </Label>
                </div>
                <TextInput
                    id="name"
                    type="text"
                    placeholder="e.g. Living Room"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="weight">
                        Weight (Display Order) <span className="text-red-500">*</span>
                    </Label>
                </div>
                <TextInput
                    id="weight"
                    type="number"
                    placeholder="0"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                />
            </div>
            <div>
                <ToggleSwitch
                    checked={formData.isActive}
                    label="Is Active"
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
            </div>
            <div className="flex gap-2 mt-4">
                <Button color="gray" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : initialData ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    );
}
