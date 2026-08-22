"use client";

import { useState, useEffect, useMemo } from "react";

import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, TextInput, ToggleSwitch } from "flowbite-react";

import { getAuditMasterData } from "@/actions/auditMasterActions";

import SearchableSelect from "@/components/SearchableSelect";

interface AddAuditAreaModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (data: { categoryId: string, name: string, weight: number, isSystemArea: boolean, isActive: boolean }) => Promise<boolean>;
}

export default function AddAuditAreaModal({
    show,
    onClose,
    onSave,
}: AddAuditAreaModalProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [areaName, setAreaName] = useState("");
    const [weight, setWeight] = useState<number>(0);
    const [isSystemArea, setIsSystemArea] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            loadMasterData();
        }
    }, [show]);

    const loadMasterData = async () => {
        try {
            // Fetches from area-categories API (propertyAuditAreaCategoryMaster table), displayed as "Audit Area Type"
            const data = await getAuditMasterData("area-categories", { perPage: 100 });
            setCategories(data?.data || []);
        } catch (err) {
            console.error("Failed to load audit master data", err);
        }
    };

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.id, label: c.name })),
        [categories],
    );

    const handleSave = async () => {
        if (!selectedCategory || !areaName || weight === undefined) return;
        setLoading(true);
        try {
            await onSave({
                categoryId: selectedCategory,
                name: areaName,
                weight,
                isSystemArea,
                isActive
            });
            setAreaName("");
            setSelectedCategory("");
            setWeight(0);
            setIsSystemArea(false);
            setIsActive(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <ModalHeader>Add Audit Area</ModalHeader>
            <ModalBody>
                <div className="space-y-4">
                    <div>
                        {/* Backed by area-categories API / propertyAuditAreaCategoryMaster table */}
                        <SearchableSelect
                            id="category"
                            label="Audit Area Type"
                            placeholder="Search audit area types..."
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            required
                        />
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="areaName">Area Name (e.g. Master Bedroom, Kitchen)</Label>
                        </div>
                        <TextInput
                            id="areaName"
                            placeholder="Enter area name"
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <div className="mb-2 block">
                            <Label htmlFor="weight">Weight / Order</Label>
                        </div>
                        <TextInput
                            id="weight"
                            type="number"
                            placeholder="e.g. 10"
                            value={weight}
                            onChange={(e) => setWeight(Number(e.target.value))}
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-4 pt-2">
                        <ToggleSwitch
                            checked={isSystemArea}
                            label="Is System Area"
                            onChange={setIsSystemArea}
                        />
                        <ToggleSwitch
                            checked={isActive}
                            label="Is Active"
                            onChange={setIsActive}
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleSave} disabled={loading || !selectedCategory || !areaName}>
                    {loading ? "Adding..." : "Add Area"}
                </Button>
                <Button color="gray" onClick={onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </Modal>
    );
}
