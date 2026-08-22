"use client";

import { Select, Label } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Status filter only. Search is handled by the common Searchbar in the list header.
 */
export default function CouponFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-40 shrink-0">
      <Label htmlFor="status-filter" className="sr-only">
        Status
      </Label>
      <Select
        id="status-filter"
        defaultValue={searchParams.get("status")?.toString() || "all"}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="min-w-0"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
    </div>
  );
}
