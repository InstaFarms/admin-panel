"use client";

import { useState, useEffect } from "react";

import { Button, Label, TextInput, Textarea, ToggleSwitch } from "flowbite-react";

interface IssueTypeFormProps {
    initialData?: {
        code: string;
        label: string;
        description: string;
        isActive?: boolean;
    };
    isSubmitting: boolean;
    onSubmit: (data: { code: string; label: string; description: string; isActive: boolean }) => void;
    onCancel: () => void;
}

export default function IssueTypeForm({ initialData, isSubmitting, onSubmit, onCancel }: IssueTypeFormProps) {
    const [formData, setFormData] = useState({
        code: "",
        label: "",
        description: "",
        isActive: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                code: initialData.code,
                label: initialData.label,
                description: initialData.description || "",
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
                    <Label htmlFor="code">
                        Code (Unique) <span className="text-red-500">*</span>
                    </Label>
                </div>
                <TextInput
                    id="code"
                    type="text"
                    placeholder="e.g. BROKEN"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="label">
                        Label <span className="text-red-500">*</span>
                    </Label>
                </div>
                <TextInput
                    id="label"
                    type="text"
                    placeholder="e.g. Broken Item"
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
            </div>
            <div>
                <div className="mb-2 block">
                    <Label htmlFor="description">Description</Label>
                </div>
                <Textarea
                    id="description"
                    placeholder="Details about this issue type..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
