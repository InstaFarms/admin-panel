"use client";

import { TABS, type TabType } from "@/constants/collections";
import {
  HiInformationCircle,
  HiOfficeBuilding,
  HiQuestionMarkCircle,
  HiGlobe,
} from "react-icons/hi";
import type { IconType } from "react-icons";

const TAB_ICONS: Record<TabType, IconType> = {
  basic: HiInformationCircle,
  properties: HiOfficeBuilding,
  faqs: HiQuestionMarkCircle,
  info: HiInformationCircle,
  meta: HiGlobe,
};

interface CollectionTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export default function CollectionTabs({ activeTab, onChange }: CollectionTabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {TABS.map(tab => {
          const Icon = TAB_ICONS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
