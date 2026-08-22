"use client";

import { Tooltip } from "flowbite-react";
import { HiHome } from "react-icons/hi";

interface LastMinuteDiscountPlanProperty {
  id: string;
  propertyName?: string | null;
  propertyCode?: string | null;
}

interface LastMinuteDiscountPlanPropertiesTooltipProps {
  properties?: LastMinuteDiscountPlanProperty[];
  children: React.ReactNode;
}

function getPropertyLabel(property: LastMinuteDiscountPlanProperty) {
  const name = property.propertyName || property.id;
  return property.propertyCode ? `${property.propertyCode} - ${name}` : name;
}

export default function LastMinuteDiscountPlanPropertiesTooltip({
  properties = [],
  children,
}: LastMinuteDiscountPlanPropertiesTooltipProps) {
  if (properties.length === 0) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="max-w-[320px] px-1 py-0.5">
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-600">
        <HiHome className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Included properties
        </span>
      </div>
      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm text-gray-700 dark:text-gray-300">
        {properties.map((property, index) => (
          <li key={property.id} className="flex min-w-0 items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 break-words text-gray-900 dark:text-gray-100">
              {getPropertyLabel(property)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} style="auto" placement="top">
      <span className="inline-flex cursor-help items-center justify-center transition-colors hover:text-blue-600 dark:hover:text-blue-400">
        {children}
      </span>
    </Tooltip>
  );
}
