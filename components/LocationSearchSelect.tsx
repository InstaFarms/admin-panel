"use client";

import AsyncSelect from "react-select/async";
import { useCallback, useRef } from "react";
import { searchLocations } from "@/actions/propertyActions";
import type { LocationSearchResult } from "@/actions/propertyActions";

export type LocationOption = { value: string; label: string; type?: string };
type LocationType = "state" | "city" | "area" | "destination" | "region" | "locality";

interface LocationSearchSelectProps {
  value?: LocationOption | null;
  onChange?: (option: LocationOption | null) => void;
  types?: LocationType[];
  placeholder?: string;
  isClearable?: boolean;
  inputId?: string;
  name?: string;
  excludeIds?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  state: "State",
  city: "City",
  area: "Area",
  destination: "Destination",
  region: "Region",
  locality: "Locality",
};

const DEBOUNCE_MS = 300;

export default function LocationSearchSelect({
  value,
  onChange,
  types,
  placeholder = "Search...",
  isClearable = true,
  inputId,
  name,
  excludeIds,
}: LocationSearchSelectProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadOptions = useCallback(
    (inputValue: string): Promise<LocationOption[]> => {
      return new Promise((resolve) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (inputValue.trim().length < 1) return resolve([]);
        timerRef.current = setTimeout(async () => {
          const results = await searchLocations(inputValue, types);
          const excluded = new Set(excludeIds ?? []);
          resolve(
            results
              .filter((r) => !excluded.has(r.id))
              .map((r: LocationSearchResult) => ({
                value: r.id,
                label:
                  types && types.length === 1
                    ? r.name
                    : `${r.name} (${TYPE_LABELS[r.type] ?? r.type})`,
                type: r.type,
              })),
          );
        }, DEBOUNCE_MS);
      });
    },
    [types, excludeIds],
  );

  return (
    <AsyncSelect
      inputId={inputId}
      name={name}
      cacheOptions
      loadOptions={loadOptions}
      value={value ?? null}
      onChange={onChange ?? (() => {})}
      placeholder={placeholder}
      isClearable={isClearable}
      noOptionsMessage={({ inputValue }) =>
        inputValue.length < 1 ? "Type to search..." : "No results found"
      }
      loadingMessage={() => "Searching..."}
      classNames={{
        control: (state) =>
          [
            "!rounded-lg !bg-gray-50 dark:!bg-gray-700",
            "!border !border-gray-300 dark:!border-gray-600",
            "!shadow-none !transition-colors !duration-100",
            "!min-h-[42px] !cursor-text",
            state.isFocused
              ? "!border-cyan-500 dark:!border-cyan-500 !ring-1 !ring-cyan-500"
              : "hover:!border-gray-400 dark:hover:!border-gray-500",
          ].join(" "),
        valueContainer: () => "!px-3 !py-1 !gap-1",
        menu: () =>
          [
            "!mt-1 !rounded-lg !overflow-hidden",
            "!border !border-gray-200 dark:!border-gray-600",
            "!bg-white dark:!bg-gray-700",
            "!shadow-lg !z-50",
          ].join(" "),
        menuList: () => "!py-1",
        option: (state) =>
          [
            "!px-3 !py-2 !text-sm !cursor-pointer !transition-colors",
            state.isSelected
              ? "!bg-cyan-600 !text-white"
              : state.isFocused
              ? "!bg-gray-100 dark:!bg-gray-600 !text-gray-900 dark:!text-white"
              : "!text-gray-800 dark:!text-gray-100",
          ].join(" "),
        input: () => "!text-gray-900 dark:!text-white !text-sm !m-0 !p-0",
        singleValue: () => "!text-gray-900 dark:!text-white !text-sm",
        placeholder: () => "!text-gray-400 dark:!text-gray-400 !text-sm",
        indicatorsContainer: () => "!pr-1",
        indicatorSeparator: () => "!bg-gray-200 dark:!bg-gray-600 !my-2",
        clearIndicator: () =>
          "!text-gray-400 hover:!text-gray-600 dark:!text-gray-400 dark:hover:!text-gray-200 !p-1 !cursor-pointer",
        dropdownIndicator: () =>
          "!text-gray-400 dark:!text-gray-400 !p-1",
        loadingIndicator: () => "!text-gray-400 dark:!text-gray-400",
        noOptionsMessage: () =>
          "!text-gray-500 dark:!text-gray-400 !text-sm !py-4 !text-center",
        loadingMessage: () =>
          "!text-gray-500 dark:!text-gray-400 !text-sm !py-4 !text-center",
      }}
      unstyled
    />
  );
}
