export interface CAReportFilters {
  [key: string]: any;
}

export interface CAReportBookingRow {
  [key: string]: any;
}

export interface CAReportGroupRow {
  [key: string]: any;
}

export interface CAReportResult {
  rows: CAReportBookingRow[];
  groupRows: CAReportGroupRow[];
  summary: any;
  totals?: Record<string, any>;
  filters: any;
  [key: string]: any;
}
