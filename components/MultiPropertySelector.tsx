"use client";

import { searchPropertiesWithIds } from "@/actions/propertyActions";
import { Card, Checkbox, Popover, Select, TextInput } from "flowbite-react";
import { MouseEvent, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiSearch, HiLocationMarker } from "react-icons/hi";
import Image from "next/image";
import { v4 } from "uuid";
import MyButton from "@/components/MyButton";
import { resolveImageSrc } from "@/utils/image";

interface MultiPropertySelectorProps {
  entityIds: string[];
  update: (entityId: string, add: boolean, entity?: PropertyData) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export interface PropertyData {
  id: string;
  entityName?: string;
  propertyName?: string;
  entityCode?: string;
  propertyCode?: string;
  area?: string;
  city?: string;
  gallery?: { url?: string; photoUrl?: string }[];
}

function getPropertyName(property: PropertyData) {
  const name = property.propertyName || property.entityName || property.id;
  const code = property.propertyCode || property.entityCode;
  return `${code ? `${code} - ` : ""}${name}`;
}

export default function MultiPropertySelector({
  entityIds,
  update,
  readOnly,
  placeholder = "Search and select properties...",
}: MultiPropertySelectorProps) {
  const [searchResults, setSearchResults] = useState<PropertyData[]>([]);
  const [loading, startTransition] = useTransition();
  const [uniqueId] = useState<string>(v4());

  const handleSearch = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setSearchResults([]);
    const formData = new FormData();
    let searchKey = "";
    let searchValue = "";
    const keyEl = document.getElementById(`entity-searchKey-${uniqueId}`) as HTMLSelectElement | null;
    const valueEl = document.getElementById(`entity-searchValue-${uniqueId}`) as HTMLInputElement | null;
    if (keyEl) searchKey = keyEl.value;
    if (valueEl) searchValue = valueEl.value;
    formData.set("searchKey", searchKey);
    formData.set("searchValue", searchValue);
    formData.set("includeIds", JSON.stringify(entityIds));

    startTransition(() => {
      searchPropertiesWithIds(formData)
        .then((res: { data?: PropertyData[] }) => {
          if (res.data) setSearchResults(res.data);
        })
        .catch(() => toast.error("Search Failed."));
    });
  };

  return (
    <Popover
      content={
        <Card className="m-0 min-w-xl text-black dark:text-white">
          {readOnly ? (
            <h4 className="font-bold">Property Search (Readonly)</h4>
          ) : (
            <div>
              <h4 className="mb-2 font-bold">Search Properties (Name or Code)</h4>
              <div className="flex flex-row items-center gap-2">
                <Select id={`entity-searchKey-${uniqueId}`} className="min-w-36">
                  <option value="Property Name">Property Name</option>
                  <option value="Property Code">Property Code</option>
                </Select>
                <TextInput
                  type="text"
                  id={`entity-searchValue-${uniqueId}`}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById(`search-btn-${uniqueId}`)?.click();
                    }
                  }}
                />
                <MyButton id={`search-btn-${uniqueId}`} onClick={handleSearch} loading={loading} type="submit" className="px-2">
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
                    <Checkbox checked={isSelected} onChange={() => update(result.id, !isSelected, result)} />
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image
                          src={resolveImageSrc(result.gallery?.[0]?.url || result.gallery?.[0]?.photoUrl) ?? "/logo.jpg"}
                          alt={getPropertyName(result)}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{getPropertyName(result)}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {(result.area || result.city) && (
                            <>
                              <HiLocationMarker className="inline w-3 h-3" /> {result.area}
                              {result.area && result.city ? ", " : ""}
                              {result.city}
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
      }
      trigger="click"
      className="z-[9999]"
    >
      <div className="relative">
        <TextInput value="" placeholder={placeholder} readOnly className="cursor-pointer" icon={HiSearch} />
      </div>
    </Popover>
  );
}
