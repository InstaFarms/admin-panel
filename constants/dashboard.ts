import { DatePreset } from "@/utils/types";

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
    { label: "Last 7 Days", value: 7, unit: "days" },
    { label: "Last 30 Days", value: 30, unit: "days" },
    { label: "Last 90 Days", value: 90, unit: "days" },
];

export const WEEKLY_PRESETS: DatePreset[] = [
    { label: "Last Week", value: 1, unit: "weeks" },
    { label: "Last 8 Weeks", value: 8, unit: "weeks" },
    { label: "Last 12 Weeks", value: 12, unit: "weeks" },
];
