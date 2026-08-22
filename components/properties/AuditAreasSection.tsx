"use client";

import { useState, useEffect } from "react";
import { HiPlus, HiTrash, HiPencil } from "react-icons/hi";

import { Accordion, AccordionPanel, AccordionTitle, AccordionContent, Button, Tabs, TabItem, Spinner } from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";
import { AuditArea } from "@/utils/types";

import SectionHeading from "@/components/properties/SectionHeading";
import AddAuditAreaModal from "@/components/properties/modals/AddAuditAreaModal";
import AddChecklistItemModal from "@/components/properties/modals/AddChecklistItemModal";

interface AuditAreasSectionProps {
    auditAreas: AuditArea[];
    auditAreasLoaded?: boolean;
    unsavedAuditItems: any[];
    isLoading: boolean;
    onEnsureAreasLoaded?: () => Promise<void>;
    onAddArea: (data: { categoryId: string, name: string, weight: number, isSystemArea: boolean, isActive: boolean }) => Promise<boolean>;
    onRemoveArea: (id: string) => Promise<boolean>;
    getAreaItems: (areaId: string) => Promise<any>;
    onAddItem: (areaId: string, type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", data: any) => Promise<boolean>;
    onUpdateItem: (type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string, data: any) => Promise<boolean>;
    onRemoveItem: (type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string) => Promise<boolean>;
}

export default function AuditAreasSection({
    auditAreas,
    auditAreasLoaded = true,
    unsavedAuditItems,
    isLoading,
    onEnsureAreasLoaded = async () => {},
    onAddArea,
    onRemoveArea,
    getAreaItems,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
}: AuditAreasSectionProps) {
    const [showAddAreaModal, setShowAddAreaModal] = useState(false);
    const [loadingAreasOnDemand, setLoadingAreasOnDemand] = useState(false);

    const handleAddAreaClick = async () => {
        setLoadingAreasOnDemand(true);
        try {
            await onEnsureAreasLoaded();
            setShowAddAreaModal(true);
        } finally {
            setLoadingAreasOnDemand(false);
        }
    };

    if (isLoading) {
        return (
            <div className="mb-6 flex items-center justify-center p-10">
                <JarvisLoader size="lg" />
                <p className="mt-4 text-gray-500">Loading audit settings and areas...</p>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <SectionHeading
                    title="Audit Areas"
                    description="Configure property audit areas and checklist items to maintain quality and standards."
                />
                <div className="flex items-center gap-2">
                    <Button
                        color="dark"
                        size="sm"
                        onClick={handleAddAreaClick}
                        disabled={loadingAreasOnDemand}
                    >
                        {loadingAreasOnDemand ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <HiPlus className="mr-2 h-4 w-4" />
                                Add Area
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {!auditAreasLoaded && !loadingAreasOnDemand && (
                <p className="mb-3 text-sm text-gray-500">
                    Audit areas will load when you click Add Area for the first time.
                </p>
            )}

            {auditAreas.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No audit areas configured for this property.</p>
            ) : (
                <Accordion collapseAll className="mb-4">
                    {auditAreas.map((area) => (
                        <AccordionPanel key={area.id}>
                            <AccordionTitle>
                                <div className="flex justify-between items-center w-full pr-10">
                                    <span>
                                        {area.areaName} <span className="text-sm font-normal text-gray-500">({area.categoryName})</span>
                                    </span>
                                    <Button
                                        as="span"
                                        role="button"
                                        tabIndex={0}
                                        size="xs"
                                        color="failure"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Are you sure you want to delete this area and all its items?")) {
                                                onRemoveArea(area.id);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (confirm("Are you sure you want to delete this area and all its items?")) {
                                                    onRemoveArea(area.id);
                                                }
                                            }
                                        }}
                                    >
                                        <HiTrash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </AccordionTitle>
                            <AccordionContent>
                                <AreaItemsTabs
                                    areaId={area.id}
                                    unsavedAuditItems={unsavedAuditItems}
                                    getAreaItems={getAreaItems}
                                    onAddItem={onAddItem}
                                    onUpdateItem={onUpdateItem}
                                    onRemoveItem={onRemoveItem}
                                />
                            </AccordionContent>
                        </AccordionPanel>
                    ))}
                </Accordion>
            )}

            <AddAuditAreaModal
                show={showAddAreaModal}
                onClose={() => setShowAddAreaModal(false)}
                onSave={async (data: any) => {
                    const res = await onAddArea(data);
                    if (res) setShowAddAreaModal(false);
                    return res;
                }}
            />
        </div>
    );
}

function AreaItemsTabs({
    areaId,
    unsavedAuditItems,
    getAreaItems,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
}: {
    areaId: string;
    unsavedAuditItems: any[];
    getAreaItems: (areaId: string) => Promise<any>;
    onAddItem: (areaId: string, type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", data: any) => Promise<boolean>;
    onUpdateItem: (type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string, data: any) => Promise<boolean>;
    onRemoveItem: (type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE", id: string) => Promise<boolean>;
}) {
    const [items, setItems] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState<{ show: boolean; type: "INVENTORY" | "SUPPLIES" | "MAINTENANCE" | null; initialData?: any }>({
        show: false,
        type: null,
    });

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const result = await getAreaItems(areaId);
            if (result.success && result.data) {
                setItems(result.data);
            }
        } catch (err) {
            console.error("Failed to load items", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, [areaId]);

    const localItems = unsavedAuditItems.filter(i => i.propertyAuditAreaId === areaId);

    const combinedInventory = [
        ...(items?.inventory || []),
        ...localItems.filter(i => i.type === "INVENTORY")
    ];
    const combinedMaintenance = [
        ...(items?.maintenance || []),
        ...localItems.filter(i => i.type === "MAINTENANCE")
    ];
    const combinedSupplies = [
        ...(items?.supplies || []),
        ...localItems.filter(i => i.type === "SUPPLIES")
    ];

    return (
        <div>
            <Tabs variant="underline">
                <TabItem active title="Inventory">
                    <ItemList
                        type="INVENTORY"
                        items={combinedInventory}
                        isLoading={isLoading}
                        onAdd={() => setShowAddItemModal({ show: true, type: "INVENTORY" })}
                        onEdit={(item) => setShowAddItemModal({ show: true, type: "INVENTORY", initialData: item })}
                        onRemove={(id) => onRemoveItem("INVENTORY", id).then((res) => { if (res) loadItems(); })}
                    />
                </TabItem>
                <TabItem title="Maintenance">
                    <ItemList
                        type="MAINTENANCE"
                        items={combinedMaintenance}
                        isLoading={isLoading}
                        onAdd={() => setShowAddItemModal({ show: true, type: "MAINTENANCE" })}
                        onEdit={(item) => setShowAddItemModal({ show: true, type: "MAINTENANCE", initialData: item })}
                        onRemove={(id) => onRemoveItem("MAINTENANCE", id).then((res) => { if (res) loadItems(); })}
                    />
                </TabItem>
                <TabItem title="Supplies">
                    <ItemList
                        type="SUPPLIES"
                        items={combinedSupplies}
                        isLoading={isLoading}
                        onAdd={() => setShowAddItemModal({ show: true, type: "SUPPLIES" })}
                        onEdit={(item) => setShowAddItemModal({ show: true, type: "SUPPLIES", initialData: item })}
                        onRemove={(id) => onRemoveItem("SUPPLIES", id).then((res) => { if (res) loadItems(); })}
                    />
                </TabItem>
            </Tabs>

            <AddChecklistItemModal
                show={showAddItemModal.show}
                type={showAddItemModal.type || "INVENTORY"}
                initialData={showAddItemModal.initialData}
                onClose={() => setShowAddItemModal({ show: false, type: null })}
                onSave={async (data: any) => {
                    let res;
                    if (showAddItemModal.initialData) {
                        res = await onUpdateItem(showAddItemModal.type!, showAddItemModal.initialData.id, data);
                    } else {
                        res = await onAddItem(areaId, showAddItemModal.type!, data);
                    }
                    if (res) {
                        setShowAddItemModal({ show: false, type: null });
                        loadItems();
                    }
                    return res;
                }}
            />
        </div>
    );
}

function ItemList({
    type,
    items,
    isLoading,
    onAdd,
    onEdit,
    onRemove,
}: {
    type: string;
    items: any[];
    isLoading: boolean;
    onAdd: () => void;
    onEdit: (item: any) => void;
    onRemove: (id: string) => void;
}) {
    return (
        <div className="mt-4 space-y-2">
            <div className="flex justify-end">
                <Button size="xs" onClick={onAdd}>
                    <HiPlus className="mr-1 h-3 w-3" />
                    Add Item
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4">
                    <JarvisLoader size="md" />
                </div>
            ) : items.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No items added.</p>
            ) : (
                <div className="border rounded divide-y">
                    {items.map((item) => (
                        <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                            <div>
                                <span className="font-medium">{item.name}</span>
                                {(type === "INVENTORY" || type === "SUPPLIES") && (
                                    <>
                                        <span className="ml-2 text-gray-500 text-xs">Exp: {item.expectedQuantity}</span>
                                        <span className="ml-1 text-gray-400 text-xs">| Req: {item.requiredThreshold}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button size="xs" color="gray" onClick={() => onEdit(item)}>
                                    <HiPencil className="h-4 w-4" />
                                </Button>
                                <Button size="xs" color="failure" onClick={() => onRemove(item.id)}>
                                    <HiTrash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

