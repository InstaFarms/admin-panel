import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getDefaultFilters,
  getDefaultWeeklyFilters,
  formatCurrency,
  formatINR,
  formatINRFull,
  getDateRangeFromWeek,
  sortRows,
} from "@/lib/dashboardUtils";

describe("dashboardUtils", () => {
  describe("getDefaultFilters", () => {
    it("returns object with expected keys", () => {
      const filters = getDefaultFilters();
      expect(filters).toMatchObject({
        stateId: "all",
        cityId: "all",
        areaId: "all",
        entityCode: "",
        channel: "all",
      });
      expect(filters).toHaveProperty("startDate");
      expect(filters).toHaveProperty("endDate");
    });

    it("returns startDate before endDate (last 30 days)", () => {
      const filters = getDefaultFilters();
      expect(new Date(filters.startDate).getTime()).toBeLessThanOrEqual(
        new Date(filters.endDate).getTime()
      );
    });

    it("returns valid ISO date strings", () => {
      const filters = getDefaultFilters();
      expect(() => new Date(filters.startDate)).not.toThrow();
      expect(() => new Date(filters.endDate)).not.toThrow();
      expect(/^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)).toBe(true);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)).toBe(true);
    });

    it("uses the business timezone for default date boundaries", () => {
      const filters = getDefaultFilters(new Date("2026-05-22T20:00:00.000Z"));
      expect(filters.endDate).toBe("2026-05-23");
      expect(filters.startDate).toBe("2026-04-23");
    });
  });

  describe("getDefaultWeeklyFilters", () => {
    it("returns object with expected keys", () => {
      const filters = getDefaultWeeklyFilters();
      expect(filters).toMatchObject({
        stateId: "all",
        cityId: "all",
        areaId: "all",
        entityCode: "",
        channel: "all",
      });
      expect(filters).toHaveProperty("startDate");
      expect(filters).toHaveProperty("endDate");
    });

    it("returns startDate before endDate", () => {
      const filters = getDefaultWeeklyFilters();
      expect(new Date(filters.startDate).getTime()).toBeLessThanOrEqual(
        new Date(filters.endDate).getTime()
      );
    });

    it("uses the business timezone for weekly default date boundaries", () => {
      const filters = getDefaultWeeklyFilters(new Date("2026-05-22T20:00:00.000Z"));
      expect(filters.endDate).toBe("2026-05-23");
      expect(filters.startDate).toBe("2026-03-28");
    });
  });

  describe("formatCurrency", () => {
    it("formats values >= 1Cr as Crores", () => {
      expect(formatCurrency(10000000)).toBe("₹1.00Cr");
      expect(formatCurrency(25000000)).toBe("₹2.50Cr");
    });

    it("formats values >= 1L as Lakhs", () => {
      expect(formatCurrency(100000)).toBe("₹1.00L");
      expect(formatCurrency(550000)).toBe("₹5.50L");
    });

    it("formats smaller values as INR with locale", () => {
      expect(formatCurrency(1234)).toMatch(/₹.*1,?234/);
      expect(formatCurrency(0)).toMatch(/₹/);
    });
  });

  describe("formatINR", () => {
    it("formats Crores (1e7+)", () => {
      expect(formatINR(10000000)).toBe("₹1Cr");
      expect(formatINR(15000000)).toBe("₹1.5Cr");
    });

    it("formats Lakhs (1e5+)", () => {
      expect(formatINR(100000)).toBe("₹1L");
      expect(formatINR(550000)).toBe("₹5.5L");
    });

    it("formats thousands (1e3+)", () => {
      expect(formatINR(1000)).toBe("₹1k");
      expect(formatINR(5500)).toBe("₹5.5k");
    });

    it("formats values below 1000", () => {
      expect(formatINR(100)).toBe("₹100");
      expect(formatINR(0)).toBe("₹0");
    });
  });

  describe("formatINRFull", () => {
    it("formats with Indian locale grouping", () => {
      expect(formatINRFull(123456)).toBe("₹1,23,456");
      expect(formatINRFull(10000000)).toBe("₹1,00,00,000");
    });
  });

  describe("getDateRangeFromWeek", () => {
    it("returns start and end dates for valid ISO week string", () => {
      const result = getDateRangeFromWeek("2024-01");
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("start");
      expect(result).toHaveProperty("end");
      expect(result!.start).toBeInstanceOf(Date);
      expect(result!.end).toBeInstanceOf(Date);
      expect(result!.end.getTime() - result!.start.getTime()).toBe(6 * 24 * 60 * 60 * 1000);
    });

    it("returns null or invalid dates for invalid week string", () => {
      // Implementation returns { start, end } with Invalid Date for malformed input (no throw)
      const invalidResult = getDateRangeFromWeek("invalid");
      const emptyResult = getDateRangeFromWeek("");
      expect(
        invalidResult === null || Number.isNaN(invalidResult!.start.getTime())
      ).toBe(true);
      expect(
        emptyResult === null || Number.isNaN(emptyResult!.start.getTime())
      ).toBe(true);
    });
  });

  describe("sortRows", () => {
    it("sorts numbers correctly in asc and desc", () => {
      const data = [{ v: 5 }, { v: 1 }, { v: 10 }];
      const asc = sortRows(data, "v", "asc");
      expect(asc.map((d) => d.v)).toEqual([1, 5, 10]);
      
      const desc = sortRows(data, "v", "desc");
      expect(desc.map((d) => d.v)).toEqual([10, 5, 1]);
    });

    it("sorts strings alphabetically ignoring case", () => {
      const data = [{ v: "Zebra" }, { v: "apple" }, { v: "Banana" }];
      const asc = sortRows(data, "v", "asc");
      expect(asc.map((d) => d.v)).toEqual(["apple", "Banana", "Zebra"]);
      
      const desc = sortRows(data, "v", "desc");
      expect(desc.map((d) => d.v)).toEqual(["Zebra", "Banana", "apple"]);
    });

    it("sinks missing values ('N/A', null, undefined, '') to the bottom", () => {
      const data = [
        { v: null },
        { v: 5 },
        { v: "N/A" },
        { v: 10 },
        { v: undefined },
        { v: "" }
      ];
      const asc = sortRows(data, "v", "asc");
      expect(asc.map((d) => d.v).slice(0, 2)).toEqual([5, 10]);
      
      const desc = sortRows(data, "v", "desc");
      expect(desc.map((d) => d.v).slice(0, 2)).toEqual([10, 5]);
    });
  });
});
