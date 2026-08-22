"use client";

import { Card, Button, Spinner } from "flowbite-react";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

import SortablePropertyItem from "@/components/proposals/SortablePropertyItem";

import { SortableProperty as Property } from "@/utils/types";

interface SelectedPropertiesProps {
    selectedProperties: Property[];
    onRemoveProperty: (id: string) => void;
    onDragEnd: (event: DragEndEvent) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
    isValid: boolean;
    isEditing?: boolean;
}

export default function SelectedProperties({
    selectedProperties,
    onRemoveProperty,
    onDragEnd,
    isSubmitting,
    onSubmit,
    isValid,
    isEditing = false
}: SelectedPropertiesProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold dark:text-white">3. Selected Properties ({selectedProperties.length})</h3>
                <span className="text-sm text-gray-500">Minimum 3 required</span>
            </div>

            {selectedProperties.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed dark:bg-gray-800 dark:border-gray-700">
                    Add at least 3 properties from Step 2 above.
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={selectedProperties.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {selectedProperties.map((property) => (
                                <SortablePropertyItem key={property.id} property={property} onRemove={onRemoveProperty} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <div className="mt-6 flex justify-end">
                <Button size="lg" disabled={isSubmitting || !isValid} onClick={onSubmit}>
                    {isSubmitting ? (
                        <>
                            <Spinner size="sm" className="mr-3" /> {isEditing ? "Updating..." : "Publishing..."}
                        </>
                    ) : (
                        isEditing ? "Update Proposal" : "Create & Publish Proposal"
                    )}
                </Button>
            </div>
        </Card>
    );
}
