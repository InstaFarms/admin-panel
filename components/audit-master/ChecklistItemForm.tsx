"use client";

import { useState, useEffect } from "react";

import { Button, Label, TextInput, Select, ToggleSwitch } from "flowbite-react";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import toast from "react-hot-toast";

interface ChecklistItemFormProps {
    initialData?: {
        name: string;
        itemType: string;
        categoryId: string;
        defaultPhotoRequirementType: string;
        isActive?: boolean;
    };
    isSubmitting: boolean;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function ChecklistItemForm({ initialData, isSubmitting, onSubmit, onCancel }: ChecklistItemFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        itemType: "INVENTORY",
        categoryId: "",
        defaultPhotoRequirementType: "ALWAYS_REQUIRED",
        isActive: true
    });
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                itemType: initialData.itemType,
                categoryId: initialData.categoryId,
                defaultPhotoRequirementType: initialData.defaultPhotoRequirementType,
                isActive: initialData.isActive ?? true
            });
            // Fetch categories for the initial item type
            fetchCategories(initialData.itemType);
        } else {
            // Fetch default categories
            fetchCategories("INVENTORY");
        }
    }, [initialData]);

    const fetchCategories = async (type: string) => {
        setIsLoadingCategories(true);
        const result = await getAuditMasterData("checklist-categories", {
            itemType: type,
            perPage: 100
        });
        if (result.success) {
            setCategories(result.data);
        } else {
            console.error("Failed to fetch categories:", result.message);
            toast.error("Failed to fetch checklist categories");
        }
        setIsLoadingCategories(false);
    };

    const handleItemTypeChange = (newType: string) => {
        setFormData({ ...formData, itemType: newType, categoryId: "" });
        fetchCategories(newType);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="itemType">
                        Item Type <span className="text-red-500">*</span>
                    </Label>
                </div>
                <Select
                    id="itemType"
                    required
                    value={formData.itemType}
                    onChange={(e) => handleItemTypeChange(e.target.value)}
                >
                    <option value="INVENTORY">Inventory</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="MAINTENANCE">Maintenance</option>
                </Select>
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="category">
                        Category <span className="text-red-500">*</span>
                    </Label>
                </div>
                <Select
                    id="category"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    disabled={isLoadingCategories}
                >
                    <option value="">{isLoadingCategories ? "Loading categories..." : "Select Category"}</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </Select>
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="name">
                        Item Name <span className="text-red-500">*</span>
                    </Label>
                </div>
                <TextInput
                    id="name"
                    type="text"
                    placeholder="e.g. Sofa 3-seater"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
