"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface BrandOption {
  id: string;
  name: string;
}

interface BrandFilterSelectProps {
  brands: BrandOption[];
  selectedBrandId?: string;
}

export default function BrandFilterSelect({
  brands,
  selectedBrandId,
}: BrandFilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={selectedBrandId ?? "all"}
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (value === "all") {
          params.delete("brandId");
        } else {
          params.set("brandId", value);
        }
        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ""}`);
      }}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-56"
      aria-label="Filter by brand"
    >
      <option value="all">All</option>
      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>
  );
}
