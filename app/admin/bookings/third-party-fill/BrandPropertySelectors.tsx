"use client";

import SearchableSelect from "@/components/SearchableSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BrandOption = {
  id: string;
  name: string;
};

type PropertyOption = {
  id: string;
  name: string;
  code?: string;
  brandId?: string | null;
};

interface BrandPropertySelectorsProps {
  brands: BrandOption[];
  properties: PropertyOption[];
  selectedBrandId: string;
  selectedPropertyId: string;
}

export default function BrandPropertySelectors({
  brands,
  properties,
  selectedBrandId,
  selectedPropertyId,
}: BrandPropertySelectorsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const brandOptions = brands.map((brand) => ({
    value: brand.id,
    label: brand.name,
  }));

  const filteredProperties = properties.filter((property) => {
    if (!selectedBrandId) return true;
    return !property.brandId || property.brandId === selectedBrandId;
  });

  const propertyOptions = filteredProperties.map((property) => ({
    value: property.id,
    label: property.code ? `${property.code} - ${property.name}` : property.name,
  }));

  const selectedBrandName =
    brands.find((brand) => brand.id === selectedBrandId)?.name || "Not selected";
  const selectedPropertyName =
    properties.find((property) => property.id === selectedPropertyId)?.name || "Not selected";

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const onBrandChange = (brandId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (brandId) nextParams.set("brandId", brandId);
    else nextParams.delete("brandId");

    const selectedProperty = properties.find((property) => property.id === selectedPropertyId);
    const shouldClearProperty =
      selectedProperty &&
      brandId &&
      selectedProperty.brandId &&
      selectedProperty.brandId !== brandId;
    if (shouldClearProperty) nextParams.delete("propertyId");

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-lg border border-gray-700 bg-gray-800/30 p-3 text-xs text-gray-300">
        <span className="font-semibold text-gray-100">Current:</span> Brand: {selectedBrandName} | Property:{" "}
        {selectedPropertyName}
      </div>

      <SearchableSelect
        id="tp-brand-select"
        label="Brand (shown by name, stores id)"
        placeholder="Search brand"
        options={brandOptions}
        value={selectedBrandId}
        onChange={onBrandChange}
      />

      <SearchableSelect
        id="tp-property-select"
        label="Property (shown by name/code, stores id)"
        placeholder="Search property"
        options={propertyOptions}
        value={selectedPropertyId}
        onChange={(value) => updateParam("propertyId", value)}
      />
    </div>
  );
}

