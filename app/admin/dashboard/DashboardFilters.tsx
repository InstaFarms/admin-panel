"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface DashboardFiltersProps {
  selectedYear: number;
  selectedMonth: number | null;
}

export default function DashboardFilters({ selectedYear, selectedMonth }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate year options (current year + 5 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleYearChange = (newYear: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('year', newYear);
    if (selectedMonth) {
      params.set('month', selectedMonth.toString());
    }
    router.push(`/admin/dashboard?${params.toString()}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('year', selectedYear.toString());
    if (newMonth) {
      params.set('month', newMonth);
    } else {
      params.delete('month');
    }
    router.push(`/admin/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-row gap-3">
      {/* Year Dropdown */}
      <select
        className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        value={selectedYear}
        onChange={(e) => handleYearChange(e.target.value)}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Month Dropdown */}
      <select
        className="rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        value={selectedMonth || ""}
        onChange={(e) => handleMonthChange(e.target.value)}
      >
        <option value="">Last 3 months</option>
        {monthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
}