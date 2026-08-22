"use client";

import React, { useMemo } from "react";
import { formatCurrency, sortRows } from "@/lib/dashboardUtils";

export interface MilestoneData {
  rank: number;
  id: string;
  property: string;
  cityId?: string | null;
  city?: string | null;
  areaId?: string | null;
  mtdRev: number;
  gapToSlab: number;
  uplift: number;
  projEod: number;
  reachability: number;
  score: number;
  flag: string;
  bookingsRequired: number | string;
  abv: number;
}

export interface Props {
  data: MilestoneData[];
  columnOrder: string[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  onMoveColumn: (key: string, dir: "left" | "right") => void;
}

type ColumnType = "currency" | "percent" | "number" | "text" | "flag" | "rank";

interface ColumnDef {
  label: string;
  align: "left" | "center" | "right";
  type: ColumnType;
}

export const COLUMNS: Record<string, ColumnDef> = {
  rank: { label: "#", align: "left", type: "rank" },
  property: { label: "PROPERTY", align: "left", type: "text" },
  mtdRev: { label: "MTD REV", align: "right", type: "currency" },
  gapToSlab: { label: "GAP TO SLAB", align: "right", type: "currency" },
  uplift: { label: "UPLIFT", align: "right", type: "currency" },
  projEod: { label: "PROJ. EOD", align: "right", type: "currency" },
  reachability: { label: "REACH.", align: "right", type: "percent" },
  score: { label: "SCORE", align: "right", type: "currency" },
  bookingsRequired: { label: "BKGS REQ.", align: "center", type: "number" },
  flag: { label: "FLAG", align: "center", type: "flag" },
};

export const DEFAULT_COLUMN_ORDER = Object.keys(COLUMNS);

const getFlagStyles = (flag: string) => {
  switch (flag) {
    case 'PUSH':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'STRETCH':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'MONITOR':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const renderCell = (row: MilestoneData, colKey: string) => {
  switch (colKey) {
    case 'rank':
      return <span className="font-medium text-gray-900 dark:text-white">{row.rank}</span>;
    case 'property':
      return <span className="text-gray-800 dark:text-gray-100">{row.property}</span>;
    case 'mtdRev':
      return formatCurrency(row.mtdRev);
    case 'gapToSlab':
      return formatCurrency(row.gapToSlab);
    case 'uplift':
      return <span className="text-green-600 font-medium">+{formatCurrency(row.uplift)}</span>;
    case 'projEod':
      return formatCurrency(row.projEod);
    case 'reachability':
      return `${row.reachability}%`;
    case 'score':
      return <span className="font-semibold">{formatCurrency(row.score)}</span>;
    case 'bookingsRequired':
      return (
        <>
          {row.bookingsRequired !== 'N/A' ? (
             <span className="font-semibold text-gray-700">{row.bookingsRequired}</span>
          ) : (
            <span className="text-gray-400 text-xs uppercase tracking-wider">Hit</span>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">ABV: {formatCurrency(row.abv)}</div>
        </>
      );
    case 'flag':
      return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getFlagStyles(row.flag)}`} title={row.flag}>
          {row.flag}
        </span>
      );
    default:
      return null;
  }
};

export const MilestonePriorityTable: React.FC<Props> = ({
  data,
  columnOrder,
  sortKey,
  sortDir,
  onSort,
  onMoveColumn,
}) => {
  const sortedData = useMemo(() => sortRows(data, sortKey, sortDir), [data, sortKey, sortDir]);

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-lg border shadow-sm">No milestone data found for the selected month.</div>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-semibold border-b select-none">
          <tr>
            {columnOrder.map((colKey, idx) => {
              const col = COLUMNS[colKey];
              if (!col) return null;
              const isFirst = idx === 0;
              const isLast = idx === columnOrder.length - 1;
              return (
                <th
                  key={colKey}
                  className={`px-4 py-3 text-${col.align} cursor-pointer hover:bg-gray-100 group whitespace-nowrap`}
                  onClick={() => onSort(colKey)}
                >
                  <div className={`flex items-center gap-1 inline-flex ${col.align === 'right' ? 'flex-row-reverse' : ''} ${col.align === 'center' ? 'justify-center' : ''}`}>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        disabled={isFirst}
                        onClick={(e) => { e.stopPropagation(); onMoveColumn(colKey, "left"); }}
                      >
                        ◀
                      </button>
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                        disabled={isLast}
                        onClick={(e) => { e.stopPropagation(); onMoveColumn(colKey, "right"); }}
                      >
                        ▶
                      </button>
                    </div>
                    <span>{col.label}</span>
                    {sortKey === colKey && (
                      <span className="text-gray-900 text-xs">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedData.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {columnOrder.map((colKey) => {
                const col = COLUMNS[colKey];
                if (!col) return null;
                return (
                  <td key={colKey} className={`px-4 py-3 text-${col.align}`}>
                    {renderCell(row, colKey)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
