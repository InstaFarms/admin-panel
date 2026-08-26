"use client";

import { searchPropertiesWithIds } from "@/actions/propertyActions";

import { Checkbox } from "flowbite-react";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { HiSearch, HiLocationMarker } from "react-icons/hi";

import Image from "next/image";

import { v4 } from "uuid";

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

type SearchField = "Property Name" | "Property Code";

const SEARCH_DEBOUNCE_MS = 350;

export default function MultiEntitySelector({
    entityIds,
    update,
    readOnly,
    placeholder = "Search and select properties...",
    brandId,
    appType,
}: MultiEntitySelectorProps) {
    const [query, setQuery] = useState("");
    const [searchField, setSearchField] = useState<SearchField>("Property Name");
    const [searchResults, setSearchResults] = useState<EntityData[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [uniqueId] = useState<string>(v4());
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);

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

    const runSearch = async (value: string, field: SearchField) => {
        const requestId = ++requestIdRef.current;
        if (!value.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("searchKey", field);
            formData.set("searchValue", value.trim());
            formData.set("includeIds", JSON.stringify(entityIds));
            if (brandId) formData.set("brandId", brandId);
            if (appType) formData.set("appType", appType);

            const res = await searchPropertiesWithIds(formData);
            if (requestId !== requestIdRef.current) return; // a newer search superseded this one

            if (res.data) {
                setSearchResults(res.data as EntityData[]);
            } else if (res.error) {
                toast.error(res.error);
            }
            setHasSearched(true);
        } catch {
            if (requestId === requestIdRef.current) toast.error("Search failed.");
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    };

    const handleQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(value, searchField), SEARCH_DEBOUNCE_MS);
    };

    const handleFieldChange = (field: SearchField) => {
        setSearchField(field);
        if (query.trim()) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            runSearch(query, field);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <HiSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={readOnly}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-400"
                />
            </div>

            {isOpen && !readOnly && (
                <div className="absolute left-0 top-full z-[9999] mt-2 w-full min-w-xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-1 border-b border-gray-200 p-2 dark:border-slate-700">
                        {(["Property Name", "Property Code"] as const).map((field) => (
                            <button
                                key={field}
                                type="button"
                                onClick={() => handleFieldChange(field)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    searchField === field
                                        ? "bg-primary-600 text-white"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                                }`}
                            >
                                {field}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-72 overflow-y-auto p-2">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500 dark:text-slate-400">
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent dark:border-slate-500" />
                                Searching...
                            </div>
                        ) : !query.trim() ? (
                            <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                Start typing a property name or code
                            </div>
                        ) : searchResults.length === 0 && hasSearched ? (
                            <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                No properties found for &ldquo;{query}&rdquo;
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {searchResults.map((result) => {
                                    const isSelected = entityIds.includes(result.id);
                                    return (
                                        <label
                                            key={result.id}
                                            className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-slate-700/60"
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => update(result.id, !isSelected, result)}
                                            />
                                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-slate-700">
                                                <Image
                                                    src={resolveImageSrc(result.gallery?.[0]?.url || result.gallery?.[0]?.photoUrl) ?? "/logo.jpg"}
                                                    alt={getEntityName(result)}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                    {getEntityName(result)}
                                                </div>
                                                {(result.area || result.city) && (
                                                    <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-slate-400">
                                                        <HiLocationMarker className="h-3 w-3 flex-shrink-0" />
                                                        {result.area}
                                                        {result.area && result.city ? ", " : ""}
                                                        {result.city}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
