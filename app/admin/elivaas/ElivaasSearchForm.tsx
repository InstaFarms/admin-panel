"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "flowbite-react";

interface City {
  slug: string;
  displayName: string;
  type: string;
}

interface Props {
  cities: City[];
  city: string;
  checkinDate: string;
  checkoutDate: string;
  adults: number;
  children: number;
}

export default function ElivaasSearchForm({ cities, city, checkinDate, checkoutDate, adults, children }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    city,
    checkinDate,
    checkoutDate,
    adults: String(adults),
    children: String(children),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city || !form.checkinDate || !form.checkoutDate) return;
    const qs = new URLSearchParams({
      city: form.city,
      checkinDate: form.checkinDate,
      checkoutDate: form.checkoutDate,
      adults: form.adults,
      children: form.children,
      page: "0",
    });
    router.push(`/admin/elivaas?${qs.toString()}`);
  }

  const cities_sorted = [
    ...cities.filter((c) => c.type === "CITY"),
    ...cities.filter((c) => c.type === "STATE"),
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      {/* City */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Location</label>
        <select
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          required
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select city</option>
          {cities_sorted.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Check-in */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Check-in</label>
        <input
          type="date"
          value={form.checkinDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setForm((f) => ({ ...f, checkinDate: e.target.value }))}
          required
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Check-out */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Check-out</label>
        <input
          type="date"
          value={form.checkoutDate}
          min={form.checkinDate || new Date().toISOString().split("T")[0]}
          onChange={(e) => setForm((f) => ({ ...f, checkoutDate: e.target.value }))}
          required
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Adults */}
      <div className="flex flex-col gap-1 w-20">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Adults</label>
        <input
          type="number"
          min={1}
          max={20}
          value={form.adults}
          onChange={(e) => setForm((f) => ({ ...f, adults: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Children */}
      <div className="flex flex-col gap-1 w-20">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Children</label>
        <input
          type="number"
          min={0}
          max={10}
          value={form.children}
          onChange={(e) => setForm((f) => ({ ...f, children: e.target.value }))}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <Button type="submit">Search</Button>
    </form>
  );
}
