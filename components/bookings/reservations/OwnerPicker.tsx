"use client";

import SearchableSelect from "@/components/SearchableSelect";
import { getOwnerById, getOwners } from "@/actions/userManagementActions";
import { useDebouncedCallback } from "@/utils/debounce";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_PAGE_SIZE = 50;

export interface OwnerOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
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

/**
 * Owner picker for forms. The server caps a page of owners at 100, so the list
 * cannot simply be fetched whole; typing searches server-side and merges the
 * results, which keeps every owner selectable however many there are.
 */
export default function OwnerPicker({
  owners,
  value,
  onChange,
  id = "owner-picker",
  label = "Owner *",
  disabled,
}: {
  owners: OwnerOption[];
  value: string;
  onChange: (ownerId: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
}) {
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

  // A draft can restore an owner who is not in the first page; resolve them by
  // id, once per id, so the picker shows a name rather than its placeholder.
  const resolved = useRef(new Set<string>());
  useEffect(() => {
    if (!value) return;
    if (known.some((o) => o.id === value)) return;
    if (resolved.current.has(value)) return;
    resolved.current.add(value);
    let cancelled = false;
    getOwnerById(value).then((res) => {
      if (!cancelled && res.data?.id) merge([res.data as OwnerOption]);
    });
    return () => {
      cancelled = true;
    };
  }, [value, known, merge]);

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

  return (
    <SearchableSelect
      id={id}
      label={label}
      placeholder="Search owner by name, email or phone"
      options={known.map(toOption)}
      value={value}
      onChange={onChange}
      onQueryChange={runSearch}
      disabled={disabled}
    />
  );
}
