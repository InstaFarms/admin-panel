"use client";

import { useEffect, useRef, useState } from "react";

import { HiChevronDown, HiX } from "react-icons/hi";

import { Label, TextInput } from "flowbite-react";

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    id?: string;
    label?: string;
    placeholder?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    /**
     * Notified on every keystroke so the caller can widen `options` beyond the
     * page it was initially given (e.g. a debounced server-side search). The
     * local label filter still applies, so callers must make sure any field the
     * server matches on is present in the option label.
     */
    onQueryChange?: (query: string) => void;
}

export default function SearchableSelect({
    id,
    label,
    placeholder = "Search...",
    options,
    value,
    onChange,
    required,
    disabled,
    onQueryChange,
}: SearchableSelectProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = query
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    const handleSelect = (opt: Option) => {
        onChange(opt.value);
        setQuery("");
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setQuery("");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        onQueryChange?.(e.target.value);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <div className="mb-2 block">
                    <Label htmlFor={id}>{label}</Label>
                </div>
            )}
            <div className="relative">
                {isOpen ? (
                    <TextInput
                        id={id}
                        type="text"
                        placeholder={placeholder}
                        value={query}
                        onChange={handleInputChange}
                        autoFocus
                        disabled={disabled}
                    />
                ) : (
                    <div
                        className={`flex items-center justify-between w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 cursor-pointer dark:border-gray-600 dark:bg-gray-700 dark:text-white ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"}`}
                        onClick={() => !disabled && setIsOpen(true)}
                    >
                        <span className={selectedOption ? "" : "text-gray-500 dark:text-gray-400"}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <div className="flex items-center gap-1">
                            {value && !disabled && (
                                <HiX
                                    className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    onClick={handleClear}
                                />
                            )}
                            <HiChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto dark:bg-gray-700 dark:border-gray-600">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No results found
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filtered.map((opt) => (
                                <li
                                    key={opt.value}
                                    className={`px-4 py-2 text-sm cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-600 ${opt.value === value
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                                        }`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    {opt.label}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
