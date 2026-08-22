"use client";

import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import SectionHeading from "@/components/properties/SectionHeading";
import { CancellationPlan, DiscountPlan } from "@/utils/types";

interface PlansSectionProps {
  discountPlans: DiscountPlan[];
  shortTermCancellationPlan: CancellationPlan | null;
  longTermCancellationPlan: CancellationPlan | null;
  discountSearchQuery: string;
  setDiscountSearchQuery: (value: string) => void;
  shortTermSearchQuery: string;
  setShortTermSearchQuery: (value: string) => void;
  longTermSearchQuery: string;
  setLongTermSearchQuery: (value: string) => void;
  discountSearchResults: DiscountPlan[];
  shortTermSearchResults: CancellationPlan[];
  longTermSearchResults: CancellationPlan[];
  searchDiscountPlans: (query: string) => void;
  searchShortTermPlans: (query: string) => void;
  searchLongTermPlans: (query: string) => void;
  addDiscountPlan: (plan: DiscountPlan) => void;
  removeDiscountPlan: (planId: string) => void;
  addShortTermPlan: (plan: CancellationPlan) => void;
  removeShortTermPlan: () => void;
  addLongTermPlan: (plan: CancellationPlan) => void;
  removeLongTermPlan: () => void;
}

interface SearchDropdownProps<T extends { id: string; name?: string }> {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  results: T[];
  onSearch: (query: string) => void;
  onSelect: (item: T) => void;
  resultLabel: string;
}

function SearchDropdown<T extends { id: string; name?: string }>({
  query,
  setQuery,
  placeholder,
  results,
  onSearch,
  onSelect,
  resultLabel,
}: SearchDropdownProps<T>) {
  const trimmedQuery = query.trim();
  const showDropdown = trimmedQuery.length > 0;

  return (
    <div className="relative">
      <TextInput
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onSearch(next);
        }}
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {showDropdown ? `${results.length} ${resultLabel} found` : "Type to search plans"}
      </p>
      {showDropdown && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                onClick={() => onSelect(item)}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.name || "--"}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">No matching plans</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlansSection({
  discountPlans,
  shortTermCancellationPlan,
  longTermCancellationPlan,
  discountSearchQuery,
  setDiscountSearchQuery,
  shortTermSearchQuery,
  setShortTermSearchQuery,
  longTermSearchQuery,
  setLongTermSearchQuery,
  discountSearchResults,
  shortTermSearchResults,
  longTermSearchResults,
  searchDiscountPlans,
  searchShortTermPlans,
  searchLongTermPlans,
  addDiscountPlan,
  removeDiscountPlan,
  addShortTermPlan,
  removeShortTermPlan,
  addLongTermPlan,
  removeLongTermPlan,
}: PlansSectionProps) {
  const sectionCardClass =
    "w-full border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <section className={sectionCardClass}>
        <SectionHeading
          title="Plans Overview"
          description="Manage discount plans and cancellation policies for this property."
        />
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Discount plans: {discountPlans.length}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              shortTermCancellationPlan
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            Short-term policy: {shortTermCancellationPlan ? "Selected" : "Not selected"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              longTermCancellationPlan
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            Long-term policy: {longTermCancellationPlan ? "Selected" : "Not selected"}
          </span>
        </div>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Discount Plans"
          description="Search and add multiple discount plans."
        />
        <div className="max-w-xl">
          <SearchDropdown
            query={discountSearchQuery}
            setQuery={setDiscountSearchQuery}
            placeholder="Search discount plans..."
            results={discountSearchResults}
            onSearch={searchDiscountPlans}
            onSelect={addDiscountPlan}
            resultLabel="discount plan(s)"
          />
        </div>
        {discountPlans.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
            No discount plans selected yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Plan Name</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {discountPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-gray-900 dark:text-gray-100">{plan.name}</TableCell>
                    <TableCell>
                      <Button size="sm" color="failure" onClick={() => removeDiscountPlan(plan.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Short-Term Cancellation Policy"
          description="Select one policy for shorter stays."
        />
        <div className="max-w-xl">
          <SearchDropdown
            query={shortTermSearchQuery}
            setQuery={setShortTermSearchQuery}
            placeholder="Search short-term cancellation plans..."
            results={shortTermSearchResults}
            onSearch={searchShortTermPlans}
            onSelect={addShortTermPlan}
            resultLabel="short-term plan(s)"
          />
        </div>
        {shortTermCancellationPlan ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
            <span className="font-medium text-gray-900 dark:text-gray-100">{shortTermCancellationPlan.name}</span>
            <Button size="sm" color="failure" onClick={removeShortTermPlan}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
            No short-term cancellation policy selected yet.
          </div>
        )}
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Long-Term Cancellation Policy"
          description="Select one policy for extended stays."
        />
        <div className="max-w-xl">
          <SearchDropdown
            query={longTermSearchQuery}
            setQuery={setLongTermSearchQuery}
            placeholder="Search long-term cancellation plans..."
            results={longTermSearchResults}
            onSearch={searchLongTermPlans}
            onSelect={addLongTermPlan}
            resultLabel="long-term plan(s)"
          />
        </div>
        {longTermCancellationPlan ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
            <span className="font-medium text-gray-900 dark:text-gray-100">{longTermCancellationPlan.name}</span>
            <Button size="sm" color="failure" onClick={removeLongTermPlan}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
            No long-term cancellation policy selected yet.
          </div>
        )}
      </section>
    </div>
  );
}
