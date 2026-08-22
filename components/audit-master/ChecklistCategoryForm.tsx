"use client";

import { useState, useEffect } from "react";

import { Button, Label, TextInput, Select, ToggleSwitch } from "flowbite-react";

interface ChecklistCategoryFormProps {
    initialData?: {
        name: string;
        weight: number;
        itemType: string;
        isActive?: boolean;
    };
    isSubmitting: boolean;
    onSubmit: (data: { name: string; weight: number; itemType: string; isActive: boolean }) => void;
    onCancel: () => void;
}

export default function ChecklistCategoryForm({ initialData, isSubmitting, onSubmit, onCancel }: ChecklistCategoryFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        weight: 0,
        itemType: "INVENTORY",
        isActive: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                weight: initialData.weight,
                itemType: initialData.itemType,
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
                    <Label htmlFor="name">Category Name <span className="text-red-500">*</span></Label>
                </div>
                <TextInput
                    id="name"
                    type="text"
                    placeholder="e.g. Cleaning"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="itemType">Item Type <span className="text-red-500">*</span></Label>
                </div>
                <Select
                    id="itemType"
                    required
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                >
                    <option value="INVENTORY">Inventory</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="MAINTENANCE">Maintenance</option>
                </Select>
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="weight">Weight (Display Order) <span className="text-red-500">*</span></Label>
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

            <div className="flex items-center gap-2">
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
