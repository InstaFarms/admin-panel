"use client";

import { TextInput } from "flowbite-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { HiSearch } from "react-icons/hi";

export default function EnquirySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (searchTerm) {
          params.set("search", searchTerm);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.replace(`?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, router]);

  return (
    <div className="mb-4">
      <TextInput
        id="search"
        type="text"
        icon={HiSearch}
        placeholder="Search by name, email, or subject..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={isPending}
        className="max-w-md"
      />
    </div>
  );
}