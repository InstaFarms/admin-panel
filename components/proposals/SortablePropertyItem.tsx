import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "flowbite-react";

import { GripVertical, X } from "lucide-react";

import Image from "next/image";

import { SortableProperty } from "@/utils/types";

import { getPropertyImage } from "@/lib/propertyUtils";

interface SortablePropertyItemProps {
    property: SortableProperty;
    onRemove: (id: string) => void;
}

export default function SortablePropertyItem({ property, onRemove }: SortablePropertyItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: property.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    console.log("SortablePropertyItem rendering:", property);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
                <GripVertical size={20} />
            </div>

            {/* Property Image */}
            <div className="w-20 h-20 relative bg-gray-200 rounded overflow-hidden flex-shrink-0">
                <Image
                    src={getPropertyImage(property)}
                    alt={property.propertyName || "Property"}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Property Info */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate dark:text-white" title={property.propertyName}>
                    {property.propertyName}
                </p>
                <p className="text-xs text-gray-500">
                    {property.propertyCode} • {property.area}, {property.city}
                </p>
            </div>

            {/* Remove Button */}
            <Button
                color="failure"
                size="sm"
                onClick={() => onRemove(property.id)}
            >
                <X size={16} />
            </Button>
        </div>
    );
}