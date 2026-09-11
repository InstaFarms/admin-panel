import { describe, expect, it } from "vitest";
import {
  buildPropertiesFetchParams,
  parseSortParams,
} from "@/lib/propertiesListUtils";

describe("parseSortParams", () => {
  it("defaults to newest first when the URL says nothing", () => {
    expect(parseSortParams({})).toEqual({ orderBy: "createdAt", sortorder: "desc" });
  });

  it("reads a valid sort off the URL", () => {
    expect(parseSortParams({ sort: "propertyName", dir: "asc" })).toEqual({
      orderBy: "propertyName",
      sortorder: "asc",
    });
  });

  it("ignores a field the API cannot sort on", () => {
    expect(parseSortParams({ sort: "dropTable", dir: "asc" })).toEqual({
      orderBy: "createdAt",
      sortorder: "desc",
    });
  });

  it("treats any non-asc direction as desc", () => {
    expect(parseSortParams({ sort: "createdAt", dir: "sideways" }).sortorder).toBe("desc");
  });
});

describe("buildPropertiesFetchParams", () => {
  it("asks the API for newest properties first by default", () => {
    const params = buildPropertiesFetchParams({
      limit: 10,
      offset: 0,
      filterParams: null,
      areaId: undefined,
    });
    expect(params.orderBy).toBe("createdAt");
    expect(params.sortorder).toBe("desc");
  });

  it("keeps the newest-first order while searching", () => {
    const params = buildPropertiesFetchParams({
      limit: 10,
      offset: 0,
      filterParams: { searchKey: "Property Name", searchValue: "villa" },
      areaId: undefined,
    });
    expect(params.searchBy).toBe("propertyName");
    expect(params.orderBy).toBe("createdAt");
    expect(params.sortorder).toBe("desc");
  });

  it("forwards a chosen sort to the API", () => {
    const params = buildPropertiesFetchParams({
      limit: 10,
      offset: 0,
      filterParams: null,
      areaId: undefined,
      sort: { orderBy: "propertyName", sortorder: "asc" },
    });
    expect(params.orderBy).toBe("propertyName");
    expect(params.sortorder).toBe("asc");
  });
});
