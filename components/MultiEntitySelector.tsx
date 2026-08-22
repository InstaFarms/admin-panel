"use client";

import { searchPropertiesWithIds } from "@/actions/propertyActions";

import { Card, Checkbox, Select, TextInput } from "flowbite-react";

import { MouseEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { HiSearch, HiLocationMarker } from "react-icons/hi";

import Image from "next/image";

import { v4 } from "uuid";

import MyButton from "@/components/MyButton";
import { resolveImageSrc } from "@/utils/image";

interface MultiEntitySelectorProps {
    entityIds: string[];
    update: (entityId: string, add: boolean, entity?: EntityData) => void;
    readOnly?: boolean;
    placeholder?: string;
    brandId?: string;
    appType?: string;
}

export interface EntityData {
    id: string;
    entityName?: string;
    propertyName?: string;
    entityCode?: string;
    propertyCode?: string;
    area?: string;
    city?: string;
    gallery?: { url?: string; photoUrl?: string }[];
}

function getEntityName(entity: EntityData) {
    const name = entity.entityName || entity.propertyName || entity.id;
    const code = entity.entityCode || entity.propertyCode;
    return `${code ? `${code} - ` : ""}${name}`;
}

export default function MultiEntitySelector({
    entityIds,
    update,
    readOnly,
    placeholder = "Search and select properties...",
    brandId,
    appType
}: MultiEntitySelectorProps) {
    const [searchResults, setSearchResults] = useState<EntityData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [uniqueId] = useState<string>(v4());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setSearchResults([]);
        const formData = new FormData();
        let searchKey = "";
        let searchValue = "";
        const el1 = document.getElementById(
            `entity-searchKey-${uniqueId}`,
        ) as HTMLSelectElement | null;
        if (el1) {
            searchKey = el1.value;
        }
        const el2 = document.getElementById(
            `entity-searchValue-${uniqueId}`,
        ) as HTMLInputElement | null;
        if (el2) {
            searchValue = el2.value;
        }
        formData.set("searchKey", searchKey);
        formData.set("searchValue", searchValue);
        formData.set("includeIds", JSON.stringify(entityIds));
        if (brandId) formData.set("brandId", brandId);
        if (appType) formData.set("appType", appType);

        setLoading(true);
        try {
            const res = await searchPropertiesWithIds(formData);
            if (res.data) {
                setSearchResults(res.data as EntityData[]);
            } else if (res.error) {
                toast.error(res.error);
            }
        } catch {
            toast.error("Search Failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                <TextInput
                    value=""
                    placeholder={placeholder}
                    readOnly
                    className="cursor-pointer"
                    icon={HiSearch}
                />
            </div>

            {/* Dropdown content */}
            {isOpen && (
                <Card className="absolute left-0 top-full mt-1 z-[9999] m-0 min-w-xl text-black dark:text-white shadow-lg">
                    {readOnly ? (
                        <h4 className="font-bold">Property Search (Readonly)</h4>
                    ) : (
                        <div>
                            <h4 className="mb-2 font-bold">
                                Search Properties (Name or Code)
                            </h4>
                            <div className="flex flex-row items-center gap-2">
                                <Select
                                    id={`entity-searchKey-${uniqueId}`}
                                    className="min-w-36"
                                >
                                    <option value="Property Name">Property Name</option>
                                    <option value="Property Code">Property Code</option>
                                </Select>
                                <TextInput
                                    type="text"
                                    id={`entity-searchValue-${uniqueId}`}
                                    className="w-full"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            document.getElementById(`search-btn-${uniqueId}`)?.click();
                                        }
                                    }}
                                />
                                <MyButton
                                    id={`search-btn-${uniqueId}`}
                                    onClick={handleSearch}
                                    loading={loading}
                                    type="button"
                                    className="px-2"
                                >
                                    <HiSearch size={24} />
                                </MyButton>
                            </div>
                        </div>
                    )}
                    {loading ? (
                        <div className="p-2">Searching...</div>
                    ) : searchResults.length === 0 ? (
                        <div className="p-2 text-gray-500">{readOnly ? "No details available." : "No properties found. Search to see results."}</div>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-2">
                            {searchResults.map((result) => {
                                const isSelected = entityIds.includes(result.id);
                                return (
                                    <label key={result.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => update(result.id, !isSelected, result)}
                                        />
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-200 flex-shrink-0">
                                                <Image
                                                    src={resolveImageSrc(result.gallery?.[0]?.url || result.gallery?.[0]?.photoUrl) ?? "/logo.jpg"}
                                                    alt={getEntityName(result)}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-medium">{getEntityName(result)}</div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    {(result.area || result.city) && (
                                                        <>
                                                            <HiLocationMarker className="inline w-3 h-3" /> {result.area}{result.area && result.city ? ", " : ""}{result.city}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
