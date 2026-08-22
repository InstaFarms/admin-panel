"use client";

import SearchableSelect from "@/components/SearchableSelect";
import { getOwnerById, getOwners } from "@/actions/userManagementActions";
import { useDebouncedCallback } from "@/utils/debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_PAGE_SIZE = 50;

interface OwnerOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
}

interface OwnerSearchFilterProps {
  owners: OwnerOption[];
  effectiveOwnerId: string | null;
}

// The server can match on name, email or phone, but SearchableSelect also
// filters locally on the label — so every searchable field has to appear in it,
// otherwise a valid server hit gets filtered straight back out.
function toOption(owner: OwnerOption) {
  const first = owner.firstName ?? "";
  const last = owner.lastName ?? "";
  const fullName = `${first} ${last}`.trim() || owner.email || owner.id;
  const emailSuffix = owner.email ? ` (${owner.email})` : "";
  const phoneSuffix = owner.mobileNumber ? ` · ${owner.mobileNumber}` : "";
  return { value: owner.id, label: `${fullName}${emailSuffix}${phoneSuffix}` };
}

function searchKeyFor(query: string): "Name" | "Email" | "Phone" {
  if (query.includes("@")) return "Email";
  if (/^[\d+\s-]+$/.test(query)) return "Phone";
  return "Name";
}

export default function OwnerSearchFilter({
  owners,
  effectiveOwnerId,
}: OwnerSearchFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seeded with the page the server rendered; widened as the user types, so
  // owners outside that first page stay reachable.
  const [known, setKnown] = useState<OwnerOption[]>(owners);

  const merge = useCallback((incoming: OwnerOption[]) => {
    setKnown((prev) => {
      const byId = new Map(prev.map((o) => [o.id, o]));
      for (const owner of incoming) byId.set(owner.id, owner);
      return [...byId.values()];
    });
  }, []);

  useEffect(() => {
    merge(owners);
  }, [owners, merge]);

  // The selected owner may sit outside that page, leaving no option to render
  // and the picker showing its placeholder instead of who is selected. Resolve
  // it by id, once per id — `known` is a dependency here, so without the guard
  // a lookup that never yields a matching row would refetch on every merge.
  const resolved = useRef(new Set<string>());
  useEffect(() => {
    if (!effectiveOwnerId) return;
    if (known.some((o) => o.id === effectiveOwnerId)) return;
    if (resolved.current.has(effectiveOwnerId)) return;
    resolved.current.add(effectiveOwnerId);
    let cancelled = false;
    getOwnerById(effectiveOwnerId).then((res) => {
      if (!cancelled && res.data?.id) merge([res.data as OwnerOption]);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveOwnerId, known, merge]);

  const runSearch = useDebouncedCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    getOwners({
      limit: SEARCH_PAGE_SIZE,
      offset: 0,
      searchKey: searchKeyFor(trimmed),
      searchValue: trimmed,
    }).then((res) => {
      if (res.data?.length) merge(res.data as OwnerOption[]);
    });
  }, 350);

  const onOwnerChange = (ownerId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (ownerId) nextParams.set("ownerId", ownerId);
    else nextParams.delete("ownerId");
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="max-w-xl">
      <SearchableSelect
        id="wallet-owner-filter"
        label="Select Owner"
        placeholder="Search owner by name, email or phone"
        options={known.map(toOption)}
        value={effectiveOwnerId ?? ""}
        onChange={onOwnerChange}
        onQueryChange={runSearch}
      />
    </div>
  );
}
