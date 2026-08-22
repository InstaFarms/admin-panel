"use client";

import SearchableSelect from "@/components/SearchableSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PropertyOption = {
  id: string;
  name: string;
  code?: string;
};

export default function PropertySelector({
  properties,
  selectedPropertyId,
}: {
  properties: PropertyOption[];
  selectedPropertyId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = properties.map((property) => ({
    value: property.id,
    label: property.code ? `${property.code} - ${property.name}` : property.name,
  }));

  const selectedPropertyName =
    properties.find((property) => property.id === selectedPropertyId)?.name || "Not selected";

  const onPropertyChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value) nextParams.set("propertyId", value);
    else nextParams.delete("propertyId");
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="space-y-2">
      <SearchableSelect
        id="third-party-property-select"
        placeholder="Search property"
        options={options}
        value={selectedPropertyId}
        onChange={onPropertyChange}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Current selection: {selectedPropertyName}
      </p>
    </div>
  );
}
