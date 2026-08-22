"use client";

import { Checkbox, TextInput } from "flowbite-react";
import { HiPencil, HiTrash } from "react-icons/hi";
import MyButton from "@/components/MyButton";

export interface PropertySelection {
  id: string;
  name: string;
  code: string;
  isSelected: boolean;
}

interface CollectionPropertiesProps {
  selectedIds: string[];
  selectedDetails: PropertySelection[];
  availableProperties: PropertySelection[];
  searchTerm: string;
  loading: boolean;
  onSearchChange: (term: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onSelectAll: () => void;
}

export default function CollectionProperties({
  selectedIds,
  selectedDetails,
  availableProperties,
  searchTerm,
  loading,
  onSearchChange,
  onToggle,
  onRemove,
  onSelectAll,
}: CollectionPropertiesProps) {
  const visibleNotSelected = availableProperties.filter(p => !selectedIds.includes(p.id));
  const allVisibleSelected = visibleNotSelected.length > 0 && visibleNotSelected.every(p => p.isSelected);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Collection properties
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Link properties for this brand (same brand as the collection).
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {selectedIds.length} propert{selectedIds.length === 1 ? "y" : "ies"} selected
        </p>
      </div>

      {selectedIds.length > 0 && (
        <div className="w-full bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selected properties ({selectedIds.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">S. No.</th>
                  <th className="px-6 py-3">Property name</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {selectedDetails.map((row, i) => (
                  <tr key={row.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{i + 1}</td>
                    <td className="px-6 py-4">
                      <a href={`/admin/properties/${row.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                        {row.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.code}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <a href={`/admin/properties/${row.id}`} target="_blank" rel="noopener noreferrer">
                          <div className="rounded-md bg-blue-600 p-1">
                            <HiPencil size={20} className="text-white" />
                          </div>
                        </a>
                        <button type="button" onClick={() => onRemove(row.id)}>
                          <div className="rounded-md bg-red-600 p-1">
                            <HiTrash size={20} className="text-white" />
                          </div>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add properties
          </h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <TextInput
                placeholder="Search by property name or code…"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <MyButton
              type="button" size="sm"
              onClick={onSelectAll}
              disabled={visibleNotSelected.length === 0}
            >
              {allVisibleSelected ? "Deselect all" : "Select all"}
              {searchTerm && ` (${visibleNotSelected.length})`}
            </MyButton>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8 gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-gray-600 dark:text-gray-400">Loading properties…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {visibleNotSelected.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? "No properties found for this brand."
                  : selectedIds.length === 0
                    ? "Search by name or code to find properties."
                    : "All matching properties are already selected."}
              </div>
            ) : (
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        onChange={onSelectAll}
                        disabled={visibleNotSelected.length === 0}
                      />
                    </th>
                    <th className="px-6 py-3">Property name</th>
                    <th className="px-6 py-3">Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {visibleNotSelected.map(row => (
                    <tr key={row.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={row.isSelected}
                          onChange={() => onToggle(row.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/admin/properties/${row.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          {row.name}
                        </a>
                      </td>
                      <td className="px-6 py-4">{row.code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
