"use client";

import { getAllPropertiesForSelector, getPropertyById, searchProperty } from "@/actions/propertyActions";
import { _PropertyBase } from "@/utils/types";
import { useDebouncedCallback } from "@/utils/debounce";
import { Card, Checkbox, Popover, Select, TextInput } from "flowbite-react";
import { MouseEvent, useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiSearch } from "react-icons/hi";
import { v4 } from "uuid";
import MyButton from "./MyButton";

const SEARCH_DEBOUNCE_MS = 400;

interface PropertySelectorProps {
  propertyId: string | null;
  update: (propertyId: string | null) => void;
  readOnly?: boolean;
  appType?: string;
  brandId?: string;
  /**
   * When true, load ALL properties up front and show them by default; the
   * search box then filters that list client-side (instant "shortlist")
   * instead of requiring a server search before anything appears. Opt-in so
   * the many other call sites keep their type-to-search behaviour.
   */
  loadAllByDefault?: boolean;
}

function getPropertyName(property: any) {
  if (!property) return "";

  const name = property.propertyName || property.entityName;
  const code = property.propertyCode || property.entityCode;

  if (name) {
    return code ? `${code} - ${name}` : name;
  }

  if (code) {
    return code;
  }

  return property.id || "Unknown Property";
}

function getPropertyId(property: any): string {
  return property?.propertyId || property?.entityId || property?.id || "";
}

export default function PropertySelector({
  propertyId,
  update,
  readOnly,
  appType,
  brandId,
  loadAllByDefault,
}: PropertySelectorProps) {
  const [searchResults, setSearchResults] = useState<_PropertyBase[]>([]);
  const [allProperties, setAllProperties] = useState<_PropertyBase[]>([]);
  const [loading, startTransition] = useTransition();
  const [uniqueId] = useState<string>(v4());
  const [searchKey, setSearchKey] = useState<string>("Property Name");
  const [searchValue, setSearchValue] = useState<string>("");

  // loadAllByDefault: fetch the whole list once, then filter it client-side.
  useEffect(() => {
    if (!loadAllByDefault) return;
    if (brandId !== undefined && !brandId) return;
    startTransition(() => {
      getAllPropertiesForSelector(undefined, appType)
        .then((res) => {
          const data = (res?.data ?? []).map((item: any) => {
            const normalizedId = getPropertyId(item);
            return normalizedId && item.id !== normalizedId ? { ...item, id: normalizedId } : item;
          });
          setAllProperties(data);
        })
        .catch((err) => {
          console.log(err);
          toast.error("Could not load properties.");
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAllByDefault, appType, brandId]);

  // The rows to render: filtered full list (loadAllByDefault) or server results.
  const filteredAll = (() => {
    if (!loadAllByDefault) return null;
    const q = searchValue.trim().toLowerCase();
    if (!q) return allProperties;
    return allProperties.filter((p: any) => {
      const hay =
        searchKey === "Property Code"
          ? `${p.propertyCode ?? p.entityCode ?? ""}`
          : `${p.propertyName ?? p.entityName ?? ""}`;
      return hay.toLowerCase().includes(q);
    });
  })();
  const results: _PropertyBase[] = filteredAll ?? searchResults;

  const selectedProperty =
    results.find((x) => getPropertyId(x) === propertyId) ??
    allProperties.find((x) => getPropertyId(x) === propertyId) ??
    searchResults.find((x) => getPropertyId(x) === propertyId);

  const runSearch = useCallback(
    (sk: string, sv: string) => {
      // In loadAllByDefault mode the list is filtered client-side; skip server search.
      if (loadAllByDefault) return;
      if (brandId !== undefined && !brandId) {
        setSearchResults([]);
        update(null);
        return;
      }

      const trimmedValue = sv.trim();
      if (!trimmedValue) {
        setSearchResults([]);
        return;
      }

    const formData = new FormData();
      formData.set("searchKey", sk);
      formData.set("searchValue", trimmedValue);
      if (brandId) {
        formData.set("brandId", brandId);
      }

    startTransition(() => {
      searchProperty(formData, { appType })
        .then((res) => {
          if (res.data) {
            const brandScopedResults = brandId
              ? res.data.filter((item: any) => {
                  const itemBrandId = item?.brandId ?? item?.brand?.id ?? null;
                  return itemBrandId ? itemBrandId === brandId : true;
                })
              : res.data;
            const normalizedResults = brandScopedResults.map((item: any) => {
              const normalizedId = getPropertyId(item);
              return normalizedId && item.id !== normalizedId ? { ...item, id: normalizedId } : item;
            });
            // if previously selected customer is not in new results, reset
            if (!normalizedResults.find((x) => getPropertyId(x) === propertyId)) {
              update(null);
            }
            setSearchResults(normalizedResults);
          }
        })
        .catch((err) => {
          console.log(err);
          toast.error("Search Failed.");
        });
    });
    },
    [propertyId, update, appType, brandId, loadAllByDefault]
  );

  useEffect(() => {
    if (brandId === undefined) {
      return;
    }
    setSearchResults([]);
    setSearchValue("");
    update(null);
  }, [brandId, update]);

  const debouncedSearch = useDebouncedCallback(
    (sk: string, sv: string) => runSearch(sk, sv),
    SEARCH_DEBOUNCE_MS
  );

  const handleSearch = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    debouncedSearch.cancel();
    runSearch(searchKey, searchValue);
  };

  const handleSearchValueChange = (value: string) => {
    setSearchValue(value);
    // loadAllByDefault filters the already-loaded list from `filteredAll` — no
    // server round trip per keystroke.
    if (loadAllByDefault) return;
    if (value.trim()) {
      debouncedSearch(searchKey, value);
    } else {
      debouncedSearch.cancel();
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (propertyId) {
      startTransition(() => {
        getPropertyById(propertyId, { appType }).then(({ data }) => {
          if (data) {
            setSearchResults((prev) => {
              if (prev.some((x) => x.id === propertyId)) return prev;
              return [data, ...prev];
            });
          }
        });
      });
    }
  }, [propertyId, appType]);

  const propertyName = selectedProperty ? getPropertyName(selectedProperty) : null;

  return (
    <Popover
      content={
        <Card className="m-0 min-w-xl text-black dark:text-white">
          {readOnly ? (
            <h4 className="font-bold">Property Detail (Readonly)</h4>
          ) : (
            <div>
              <h4 className="mb-2 font-bold">
                Search Properties using Name or Code
              </h4>
              <div className="flex flex-row items-center gap-2">
                <Select
                  id={`property-searchKey-${uniqueId}`}
                  className="min-w-36"
                  value={searchKey}
                  onChange={(e) => {
                    const nextSearchKey = e.target.value;
                    setSearchKey(nextSearchKey);
                    if (searchValue.trim()) {
                      debouncedSearch.cancel();
                      runSearch(nextSearchKey, searchValue);
                    }
                  }}
                >
                  <option value="Property Name">Property Name</option>
                  <option value="Property Code">Property Code</option>
                </Select>
                <TextInput
                  type="text"
                  id={`property-searchValue-${uniqueId}`}
                  className="w-full"
                  value={searchValue}
                  onChange={(e) => handleSearchValueChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <MyButton
                  onClick={(e) => handleSearch(e)}
                  loading={loading}
                  type="submit"
                  className="px-2"
                >
                  <HiSearch size={24} />
                </MyButton>
              </div>
            </div>
          )}
          {loading && results.length === 0 ? (
            <div>{loadAllByDefault ? "Loading properties..." : "Searching..."}</div>
          ) : results.length === 0 ? (
            <div>No properties found.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto flex flex-col gap-3">
              {results.map((result) => {
                const property = result as any;
                const resultId = getPropertyId(property);
                const propertyName: string = property.propertyName || property.entityName || "";
                const propertyCode: string = property.propertyCode || property.entityCode || "";
                const displayName = propertyName
                  ? (propertyCode ? `${propertyCode} - ${propertyName}` : propertyName)
                  : (propertyCode || resultId || "Unknown Property");
                
                return (
                  <label key={resultId || result.id} className="flex items-center gap-4">
                    <Checkbox
                      checked={resultId === propertyId}
                      onChange={() =>
                        !readOnly &&
                        update(propertyId === resultId ? null : resultId)
                      }
                    />
                    <div className="flex w-full cursor-pointer flex-col">
                      <div className="font-bold">{displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ID: {resultId || result.id}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </Card>
      }
      className="z-[9999]"
    >
      <TextInput
        value={propertyName || ""}
        placeholder="Select Property"
        readOnly
      ></TextInput>
    </Popover>
  );
}
