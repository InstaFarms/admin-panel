"use client";

import { useEffect, useState, useRef } from "react";

import { TextInput, Spinner, Label } from "flowbite-react";

import { searchCustomer } from "@/actions/customerActions";
import { CustomerBrandName } from "@/constants/customerBrands";

import { CustomerData } from "@/utils/types";

interface CustomerComboboxProps {
    onSelect: (customer: CustomerData | null) => void;
    selectedCustomer?: CustomerData | null;
    label?: string;
    brandName?: CustomerBrandName;
}

export default function CustomerCombobox({ onSelect, selectedCustomer, label = "Select Customer", brandName }: CustomerComboboxProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Update query when selectedCustomer changes externally (or initial load)
    useEffect(() => {
        if (selectedCustomer) {
            setQuery(`${selectedCustomer.firstName} ${selectedCustomer.lastName || ""}`.trim());
        }
    }, [selectedCustomer]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim() || (selectedCustomer && query === `${selectedCustomer.firstName} ${selectedCustomer.lastName || ""}`.trim())) {
                return;
            }

            setLoading(true);
            try {
                const formData = new FormData();
                formData.append("searchKey", "Name");
                formData.append("searchValue", query);

                const res = await searchCustomer(formData, { brandName });
                if (res?.data) {
                    setResults(res.data);
                    setIsOpen(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, selectedCustomer]);


    const handleSelect = (customer: CustomerData) => {
        onSelect(customer);
        setQuery(`${customer.firstName} ${customer.lastName || ""}`.trim());
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!isOpen) setIsOpen(true);
        if (selectedCustomer) {
            onSelect(null); // Clear selection on edit
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <div className="mb-2 block">
                    <Label>{label}</Label>
                </div>
            )}
            <div className="relative">
                <TextInput
                    type="text"
                    placeholder="Search customer by name..."
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Spinner size="sm" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-700 dark:border-gray-600">
                    <ul className="py-1">
                        {results.map((customer) => (
                            <li
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-600 dark:text-white border-b last:border-b-0 border-gray-100 dark:border-gray-600"
                                onClick={() => handleSelect(customer)}
                            >
                                <div className="font-medium text-sm">
                                    {customer.firstName} {customer.lastName}
                                </div>
                                {customer.email && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {customer.email}
                                    </div>
                                )}
                                {customer.mobileNumber && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        {customer.mobileNumber}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isOpen && results.length === 0 && !loading && query && !selectedCustomer && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2 text-sm text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
                    No found.
                </div>
            )}
        </div>
    );
}
