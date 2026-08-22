"use client";

import { Amenity } from "@/utils/types";
import { TextInput } from "flowbite-react";
import { useEffect, useRef, useState } from "react";

interface AddAmenitySearchBarProps {
  options: Amenity[];
  addedIds: string[];
  onSelect: (amenity: Amenity) => void;
  onInteract?: () => void;
  isLoading?: boolean;
  isLoaded?: boolean;
}

export default function AddAmenitySearchBar({
  options,
  addedIds,
  onSelect,
  onInteract,
  isLoading = false,
  isLoaded = true,
}: AddAmenitySearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableOptions = options.filter((a) => !addedIds.includes(a.id));
  const trimmedQuery = searchQuery.toLowerCase().trim();
  const filteredOptions = availableOptions.filter((a) =>
    a.name.toLowerCase().includes(trimmedQuery)
  );
  const showResults = showDropdown && trimmedQuery.length > 0 && isLoaded;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (amenity: Amenity) => {
    onSelect(amenity);
    setSearchQuery("");
    setShowDropdown(false);
  };

  return (
    <div className="relative my-3 w-full max-w-xl" ref={dropdownRef}>
      <TextInput
        value={searchQuery}
        onChange={(e) => {
          onInteract?.();
          setSearchQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          onInteract?.();
          setShowDropdown(true);
        }}
        onClick={() => onInteract?.()}
        placeholder="Search amenities to add..."
        className="w-full"
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {!isLoaded
          ? "Focus, click, or type to load amenities."
          : isLoading
          ? "Loading amenities..."
          : `${availableOptions.length} amenities available to add.`}
      </p>
      {showResults && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
          <li className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {filteredOptions.length} result{filteredOptions.length === 1 ? "" : "s"}
          </li>
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches or all added</li>
          ) : (
            filteredOptions.slice(0, 20).map((x) => (
              <li
                key={x.id}
                role="option"
                className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSelect(x)}
              >
                {x.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

