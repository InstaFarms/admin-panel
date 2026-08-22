"use client";

import { Button, Select, TextInput } from "flowbite-react";

import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HiCalendar, HiFilter } from "react-icons/hi";

import type { DashboardCityOption, DashboardFilters, DashboardStateOption, DatePreset } from "@/utils/types";

import { getAreasOptions } from "@/actions/dashboardActions";

import { format, subDays, subWeeks } from "date-fns";

import { DEFAULT_DATE_PRESETS } from "@/constants/dashboard";

interface DashboardControlBarProps {
    filters: DashboardFilters;
    onFilterChange: (filters: DashboardFilters) => void;
    datePresets?: DatePreset[];
    states: DashboardStateOption[];
    cities: DashboardCityOption[];
}

function parseDateInput(value?: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function getInitialDateRange(filters: DashboardFilters): [Date | null, Date | null] {
    return [
        parseDateInput(filters.startDate),
        parseDateInput(filters.endDate),
    ];
}

export default function DashboardControlBar({ filters, onFilterChange, datePresets = DEFAULT_DATE_PRESETS, states, cities: allCities }: DashboardControlBarProps) {
    const [cities, setCities] = useState<DashboardCityOption[]>(allCities);
    const [areas, setAreas] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Local filter state (not applied until button click)
    const [localStateId, setLocalStateId] = useState(filters.stateId || "all");
    const [localCityId, setLocalCityId] = useState(filters.cityId || "all");
    const [localAreaId, setLocalAreaId] = useState(filters.areaId || "all");
    const [localPropertyCode, setLocalPropertyCode] = useState(filters.propertyCode || filters.entityCode || "");

    // Local state for date picker
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => getInitialDateRange(filters));
    const [startDate, endDate] = dateRange;

    // Filter cities when state changes
    useEffect(() => {
        if (localStateId === "all") {
            setCities(allCities);
        } else {
            setCities(allCities.filter((c: any) => c.stateId === localStateId));
        }
        setLocalCityId("all");
        setLocalAreaId("all");
        setAreas([]);
    }, [localStateId, allCities]);

    // Fetch areas when city changes
    useEffect(() => {
        if (localCityId && localCityId !== "all") {
            const fetchAreas = async () => {
                const areasData = await getAreasOptions(localCityId);
                setAreas(areasData);
            };
            fetchAreas();
        } else {
            setAreas([]);
        }
        setLocalAreaId("all");
    }, [localCityId]);

    const handleDateChange = (update: [Date | null, Date | null]) => {
        setDateRange(update);
        const [start, end] = update;
        if (start && end) {
            setShowDatePicker(false);
        }
    };

    const handlePresetDate = (value: number, unit: "days" | "weeks") => {
        const end = new Date();
        const start = unit === "weeks" ? subWeeks(end, value) : subDays(end, value);
        setDateRange([start, end]);
        setShowDatePicker(false);
    };

    const handleApplyFilters = () => {
        onFilterChange({
            startDate: startDate ? format(startDate, "yyyy-MM-dd") : filters.startDate,
            endDate: endDate ? format(endDate, "yyyy-MM-dd") : filters.endDate,
            stateId: localStateId,
            cityId: localCityId,
            areaId: localAreaId,
            propertyCode: localPropertyCode.trim(),
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">

            {/* Row 1: Date Range + Apply */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                {/* Date Range Picker */}
                <div className="relative w-full md:w-auto z-50">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-colors w-full md:w-auto justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <HiCalendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span>
                                {startDate && endDate
                                    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                                    : "Select Date Range"}
                            </span>
                        </div>
                    </button>

                    {showDatePicker && (
                        <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {datePresets.map((preset) => (
                                    <Button key={preset.label} size="xs" color="light" onClick={() => handlePresetDate(preset.value, preset.unit)}>{preset.label}</Button>
                                ))}
                            </div>
                            <DatePicker
                                selectsRange={true}
                                startDate={startDate}
                                endDate={endDate}
                                onChange={handleDateChange}
                                inline
                                calendarClassName="!border-0 !shadow-none"
                            />
                        </div>
                    )}
                </div>

                <Button
                    color="blue"
                    onClick={handleApplyFilters}
                    className="whitespace-nowrap"
                >
                    <HiFilter className="w-4 h-4 mr-2" />
                    Apply Filter
                </Button>
            </div>

            {/* Row 2: Filters */}
            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                <Select
                    value={localStateId}
                    onChange={(e) => setLocalStateId(e.target.value)}
                    className="md:w-44"
                >
                    <option value="all">All States</option>
                    {states.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.state}</option>
                    ))}
                </Select>

                <Select
                    value={localCityId}
                    onChange={(e) => setLocalCityId(e.target.value)}
                    className="md:w-44"
                    disabled={localStateId === "all"}
                >
                    <option value="all">All Cities</option>
                    {cities.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.city}</option>
                    ))}
                </Select>

                <Select
                    value={localAreaId}
                    onChange={(e) => setLocalAreaId(e.target.value)}
                    className="md:w-44"
                    disabled={localCityId === "all"}
                >
                    <option value="all">All Areas</option>
                    {areas.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.area}</option>
                    ))}
                </Select>

                <TextInput
                    placeholder="Property Code (e.g. IF001)"
                    value={localPropertyCode}
                    onChange={(e) => setLocalPropertyCode(e.target.value)}
                    className="md:w-44"
                />
            </div>

        </div>
    );
}
