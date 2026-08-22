import { describe, expect, it } from "vitest";

import { normalizePropertyFullData } from "@/lib/properties/fullPropertyData";

describe("normalizePropertyFullData", () => {
  it("normalizes brand-first /full payload shape", () => {
    const normalized = normalizePropertyFullData({
      data: {
        instafarms: {
          detail: { propertyName: "Brand First" },
          address: { cityId: "city-1" },
          googlePlace: { googlePlaceId: "gp-1" },
          commercial: { commissionPercentage: 10, specialDates: [{ id: "sd-1" }] },
          amenitiesActivities: { amenities: [{ id: "a-1" }], activities: [{ id: "ac-1" }] },
          spaces: [{ id: "space-1" }],
          peopleRoles: { owners: [{ id: "u-1" }], managers: [], caretakers: [] },
          plans: { discountPlans: [{ id: "dp-1" }] },
          others: { descriptionText: "desc" },
          gallery: { gallery: [{ id: "g-1" }], coverPhotos: [{ id: "g-1" }] },
        },
        mago: {
          commercial: { commissionPercentage: 22, specialDates: [{ id: "sd-2" }] },
          plans: { discountPlans: [{ id: "dp-2" }] },
          others: { description: "brand 2 description" },
        },
        listing: {},
      },
    });

    expect(normalized.tabs.brandData.instafarms.commercial.commissionPercentage).toBe(10);
    expect(normalized.tabs.brandData.mago.commercial.commissionPercentage).toBe(22);
    expect(normalized.tabs.brandData.mago.commercial.specialDates).toEqual([{ id: "sd-2" }]);
    expect(normalized.tabs.brandData.mago.plans.discountPlans).toEqual([{ id: "dp-2" }]);
    expect(normalized.property.propertyName).toBe("Brand First");
    expect(normalized.property.cityId).toBe("city-1");
  });

  it("normalizes brand-scoped commercial/plans/others into brandData by slug", () => {
    const normalized = normalizePropertyFullData({
      data: {
        detail: {
          propertyName: "Brand scoped property",
        },
        brands: [
          { id: "brand-1", slug: "instafarms", name: "Instafarms" },
          { id: "brand-2", slug: "mago", name: "Mago" },
        ],
        brandData: {
          "brand-1": {
            commercial: { commissionPercentage: 10, specialDates: [{ id: "sd-1" }] },
            plans: { discountPlans: [{ id: "dp-1" }] },
            others: { description: "brand 1 description" },
          },
          "brand-2": {
            commercial: { commissionPercentage: 22, specialDates: [{ id: "sd-2" }] },
            plans: { discountPlans: [{ id: "dp-2" }] },
            others: { description: "brand 2 description" },
          },
        },
      },
    });

    expect(normalized.tabs.brandData.instafarms.commercial.commissionPercentage).toBe(10);
    expect(normalized.tabs.brandData.mago.commercial.commissionPercentage).toBe(22);
    expect(normalized.tabs.brandData.mago.commercial.specialDates).toEqual([{ id: "sd-2" }]);
    expect(normalized.tabs.brandData.mago.plans.discountPlans).toEqual([{ id: "dp-2" }]);
    expect(normalized.tabs.brandData.mago.others.description).toBe("brand 2 description");
    expect(normalized.property.commissionPercentage).toBe(10);
  });

  it("reads canonical brandData tabs for instafarms", () => {
    const normalized = normalizePropertyFullData({
      data: {
        detail: { propertyName: "Legacy flat shape" },
        brandData: {
          instafarms: {
            commercial: { commissionPercentage: 15, specialDates: [{ id: "sd-single" }] },
            plans: { discountPlans: [{ id: "dp-single" }] },
            others: { description: "single brand description" },
          },
        },
      },
    });

    expect(normalized.tabs.brandData.instafarms.commercial.commissionPercentage).toBe(15);
    expect(normalized.tabs.brandData.instafarms.commercial.specialDates).toEqual([{ id: "sd-single" }]);
    expect(normalized.tabs.brandData.instafarms.plans.discountPlans).toEqual([{ id: "dp-single" }]);
    expect(normalized.tabs.brandData.instafarms.others.description).toBe("single brand description");
  });

  it("ensures baseline and other brand nodes exist", () => {
    const normalized = normalizePropertyFullData({
      data: {
        detail: { propertyName: "No brand id" },
        brandData: {
          instafarms: {
            commercial: { securityDeposit: 1000, specialDates: [{ id: "a" }] },
          },
        },
      },
    });

    expect(normalized.tabs.brandData.instafarms.commercial.securityDeposit).toBe(1000);
    expect(normalized.tabs.brandData.mago).toBeUndefined();
    expect(normalized.tabs.brandData.listing).toBeUndefined();
  });

  it("hydrates section-first brandData shape", () => {
    const normalized = normalizePropertyFullData({
      data: {
        detail: { propertyName: "Section first shape" },
        brandData: {
          commercial: {
            instafarms: { commissionPercentage: 40, specialDates: [{ id: "legacy-section-first" }] },
          },
          plans: {
            instafarms: { discountPlans: [{ id: "legacy-section-first-plan" }] },
          },
          others: {
            instafarms: { description: "legacy-section-first-description" },
          },
        },
      },
    });

    expect(normalized.tabs.brandData.instafarms.commercial.commissionPercentage).toBe(40);
    expect(normalized.tabs.brandData.instafarms.commercial.specialDates).toEqual([
      { id: "legacy-section-first" },
    ]);
    expect(normalized.tabs.brandData.instafarms.plans.discountPlans).toEqual([
      { id: "legacy-section-first-plan" },
    ]);
    expect(normalized.tabs.brandData.instafarms.others.description).toBe(
      "legacy-section-first-description",
    );
  });
});
