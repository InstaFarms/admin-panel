export type Period = "daily" | "weekly" | "monthly";

export interface ChartData {
    date: string;
    value: number;
}

export interface AnalyticsResult {
    period: Period;
    total: number;
    chartData: ChartData[];
}
