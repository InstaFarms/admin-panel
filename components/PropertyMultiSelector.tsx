"use client";

import { searchProperty } from "@/actions/propertyActions";
import { _PropertyBase, Property } from "@/utils/types";
import { Card, Checkbox, Label, Popover, Select, TextInput } from "flowbite-react";
import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiSearch, HiX } from "react-icons/hi";
import { v4 } from "uuid";

interface PropertyMultiSelectorProps {
  selectedPropertyIds: string[];
  onSelectionChange: (propertyIds: string[]) => void;
  onAddProperty?: (property: any) => void;
  onAreaChange?: (areaId: string | null, areaName: string | null) => void;
  availableProperties?: Property[];
  readOnly?: boolean;
  enforceAreaMatch?: boolean;
  singleSelect?: boolean;
  /** When true, hide the built-in "Selected Properties" list (e.g. when parent shows its own table) */
  hideSelectedList?: boolean;
}

function getPropertyName(property: any) {
  const code = property.propertyCode || property.code_name || '';
  const name = property.propertyName || property.name || property.id;
  return `${code ? `${code} - ` : ""}${name}`;
}

export default function PropertyMultiSelector({
  selectedPropertyIds,
  onSelectionChange,
  onAddProperty,
  onAreaChange,
  availableProperties = [],
  readOnly,
  enforceAreaMatch = true,
  singleSelect = false,
  hideSelectedList = false,
}: PropertyMultiSelectorProps) {
  const [searchResults, setSearchResults] = useState<_PropertyBase[]>([]);
  const [cachedProperties, setCachedProperties] = useState<Map<string, any>>(new Map());
  const [loading, startTransition] = useTransition();
  const [uniqueId, setUniqueId] = useState<string>("");
  const [searchKey, setSearchKey] = useState<string>("Property Name");
  const [searchValue, setSearchValue] = useState<string>("");

  // Generate UUID only on client side to avoid hydration mismatch
  useEffect(() => {
    setUniqueId(v4());
  }, []);

  const performSearch = () => {
    if (!uniqueId) {
      return;
    }

    if (!searchValue || searchValue.trim() === "") {
      toast.error("Please enter a search value");
      return;
    }

    if (!searchKey) {
      toast.error("Please select a search key");
      return;
    }

    setSearchResults([]);

    const formData = new FormData();
    formData.set("searchKey", searchKey);
    formData.set("searchValue", searchValue);

    startTransition(() => {
      searchProperty(formData)
        .then((res) => {
          if (res.data) {
            // Limit to 5 results
            setSearchResults(res.data.slice(0, 5));
            if (res.data.length === 0) {
              toast("No properties found");
            } else {
              toast.success(`Found ${res.data.length} properties`);
            }
          } else if (res.error) {
            toast.error(res.error);
          }
        })
        .catch(() => {
          toast.error("Search Failed.");
        });
    });
  };

  const handleToggleProperty = (propertyId: string, property?: any) => {
    if (readOnly) return;

    if (selectedPropertyIds.includes(propertyId)) {
      // Remove property
      const newIds = selectedPropertyIds.filter(id => id !== propertyId);
      onSelectionChange(newIds);

      // If all properties removed, reset area
      if (newIds.length === 0 && onAreaChange) {
        onAreaChange(null, null);
      }
    } else {
      // Check for single select mode
      if (singleSelect && selectedPropertyIds.length > 0) {
        // In single select, we replace the existing selection
        // No need to check area match against previous selection since we are replacing it

        if (property) {
          setCachedProperties(prev => new Map(prev).set(propertyId, property));
          if (onAddProperty) {
            onAddProperty(property);
          }

          // Notify parent of area
          if (onAreaChange) {
            const areaId = property.area?.id || property.areaId || null;
            const areaName = property.area?.area || null;
            onAreaChange(areaId, areaName);
          }
        }

        onSelectionChange([propertyId]);
        return;
      }

      // Add property - check area match first (only for multi-select)
      if (enforceAreaMatch && selectedPropertyIds.length > 0 && property) {
        const firstProperty = getSelectedPropertyData(selectedPropertyIds[0]);
        const firstAreaId = firstProperty?.area?.id || firstProperty?.areaId;
        const newAreaId = property.area?.id || property.areaId;

        if (firstAreaId && newAreaId && firstAreaId !== newAreaId) {
          const firstAreaName = firstProperty?.area?.area || 'unknown';
          const newAreaName = property.area?.area || 'unknown';
          toast.error(`Cannot select property from different area. First property is in "${firstAreaName}", but this property is in "${newAreaName}".`);
          return;
        }
      }

      // Cache the property data
      if (property) {
        setCachedProperties(prev => new Map(prev).set(propertyId, property));
        if (onAddProperty) {
          onAddProperty(property);
        }

        // Notify parent of area (for first property)
        if (selectedPropertyIds.length === 0 && onAreaChange) {
          const areaId = property.area?.id || property.areaId || null;
          const areaName = property.area?.area || null;
          onAreaChange(areaId, areaName);
        }
      }
      onSelectionChange([...selectedPropertyIds, propertyId]);
    }
  };

  const handleRemoveProperty = (propertyId: string) => {
    if (readOnly) return;
    onSelectionChange(selectedPropertyIds.filter(id => id !== propertyId));
  };

  const clearAll = () => {
    if (readOnly) return;
    onSelectionChange([]);
  };

  // Get selected property details from availableProperties or cachedProperties
  const getSelectedPropertyData = (id: string) => {
    return availableProperties.find(p => p.id === id) || cachedProperties.get(id);
  };
  const selectedProperties = selectedPropertyIds.map(id => getSelectedPropertyData(id)).filter(Boolean);

  // Don't render inputs until uniqueId is set (client-side only)
  if (!uniqueId) {
    return (
      <div className="space-y-3">
        <div className="mb-2 block">
          <Label>Properties</Label>
        </div>
        <Card className="m-0 text-black dark:text-white">
          <div>Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Popover */}
      {!readOnly && (
        <Popover
          content={
            <Card className="m-0 min-w-xl text-black dark:text-white">
              <div>
                <h4 className="mb-2 font-bold">
                  Search Properties (max 5 results)
                </h4>
                <div className="flex flex-row items-center gap-2">
                  <Select
                    id={`property-searchKey-${uniqueId}`}
                    className="min-w-36"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                  >
                    <option value="Property Name">Property Name</option>
                    <option value="Property Code">Property Code</option>
                  </Select>
                  <TextInput
                    type="text"
                    id={`property-searchValue-${uniqueId}`}
                    className="w-full"
                    placeholder="Search..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        performSearch();
                      }
                    }}
                  />
                  <button
                    id={`search-btn-${uniqueId}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      performSearch();
                    }}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                  >
                    {loading ? (
                      <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <HiSearch size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {loading ? (
                <div className="mt-3 text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="mt-3 text-gray-500">Search for properties to add</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mt-3">
                  {searchResults.map((result) => {
                    const isSelected = selectedPropertyIds.includes(result.id);
                    return (
                      <label
                        key={result.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleProperty(result.id, result)}
                          disabled={readOnly}
                        />
                        <div className="font-medium">{getPropertyName(result)}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </Card>
          }
          trigger="click"
          className="z-[9999]"
        >
          <div className="w-full">
            <TextInput
              readOnly
              value=""
              placeholder="Click to search and add properties..."
              className="w-full cursor-pointer"
            />
          </div>
        </Popover>
      )}

      {/* Selected Properties List - hidden when parent shows its own (e.g. owners UserEditor table) */}
      {!hideSelectedList && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Selected Properties ({selectedPropertyIds.length})
            </span>
            {!readOnly && selectedPropertyIds.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {selectedPropertyIds.length === 0 && (
              <div className="text-sm text-gray-400 italic p-1">No properties selected</div>
            )}

            {selectedProperties.map(property => (
              <div key={property.id} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm w-full dark:bg-gray-700 dark:border-gray-600">
                <div className="flex items-center gap-4">
                  <div>
                    <h5 className="font-semibold text-sm text-gray-900 dark:text-white">{getPropertyName(property)}</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {property.area?.area}{property.area?.area && property.city?.city ? ", " : ""}{property.city?.city}
                    </p>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveProperty(property.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {/* Show IDs that don't have matching property data yet */}
            {selectedPropertyIds
              .filter(id => !selectedProperties.find(p => p.id === id))
              .map(id => (
                <div key={id} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm w-full dark:bg-gray-700 dark:border-gray-600">
                  <div className="flex items-center gap-4">
                    <div>
                      <h5 className="font-semibold text-sm text-gray-900 dark:text-white">Property</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{id}</p>
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveProperty(id);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}