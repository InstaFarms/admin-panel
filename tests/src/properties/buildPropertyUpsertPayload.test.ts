import { describe, expect, it } from "vitest";

import { buildPropertyUpsertPayload } from "@/components/properties/editor/buildPropertyUpsertPayload";
import { createEmptyPropertyEditorDraft } from "@/lib/properties/propertyEditorDraft";

type PayloadInput = {
  draft: ReturnType<typeof createEmptyPropertyEditorDraft>;
  serverSnapshot: ReturnType<typeof createEmptyPropertyEditorDraft>;
  dirtySections: string[];
};

const createPayloadInput = (
  overrides: Partial<PayloadInput> = {},
): PayloadInput => ({
    draft: createEmptyPropertyEditorDraft(),
    serverSnapshot: createEmptyPropertyEditorDraft(),
    dirtySections: [],
    ...overrides,
  });

describe("buildPropertyUpsertPayload", () => {
  it("emits only brand roots present in draft snapshot", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.commercial = { commissionPercentage: 15 };
    delete (draft as Record<string, unknown>).mago;
    delete (draft as Record<string, unknown>).listing;

    const input = createPayloadInput({
      draft,
    });

    const payload = buildPropertyUpsertPayload(input) as Record<string, unknown>;
    expect(payload.instafarms).toBeTruthy();
    expect(payload.mago).toBeUndefined();
    expect(payload.listing).toBeUndefined();
    expect(payload.instafarms.commercial.commissionPercentage).toBe(15);
  });

  it("can scope payload generation to a single active brand", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.commercial = { commissionPercentage: 15 };
    draft.mago.commercial = { commissionPercentage: 22 };

    const input = createPayloadInput({
      draft,
    });

    const payload = buildPropertyUpsertPayload({
      ...input,
      brandSlugs: ["mago"],
    }) as Record<string, unknown>;

    expect(payload.instafarms).toBeUndefined();
    expect((payload.mago as Record<string, any>).commercial.commissionPercentage).toBe(22);
  });

  it("serializes special dates under each brand commercial node only", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.commercial = {
      specialDates: [{ date: "2026-05-10", price: "12000" }],
    };
    draft.mago.commercial = {
      specialDates: [{ date: "2026-06-11", price: 9000 }],
    };

    const input = createPayloadInput({
      draft,
    });

    const payload = buildPropertyUpsertPayload(input) as Record<string, unknown>;
    expect(payload.specialDates).toBeUndefined();
    expect((payload.instafarms as Record<string, unknown>).commercial).toBeTruthy();
    expect(
      ((payload.instafarms as Record<string, unknown>).commercial as Record<string, unknown>)
        .specialDates,
    ).toEqual([
      { date: "2026-05-10", price: "12000" },
    ]);
    expect(
      ((payload.mago as Record<string, unknown>).commercial as Record<string, unknown>).specialDates,
    ).toEqual([
      { date: "2026-06-11", price: 9000 },
    ]);
    expect(
      ((payload.listing as Record<string, unknown>).commercial as Record<string, unknown>)
        .specialDates,
    ).toBeUndefined();
  });

  it("normalizes gallery under each brand gallery tab", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.gallery = {
      gallery: [
        { id: "g-1", photoUrl: "https://img/1.jpg", key: "outdoors", sortOrder: 1 },
        { id: "g-2", photoUrl: "https://img/2.jpg", key: "indoors", sortOrder: 2 },
      ],
      coverPhotos: [{ id: "g-2" }],
    };

    const input = createPayloadInput({
      draft,
    });

    const payload = buildPropertyUpsertPayload(input) as Record<string, unknown>;
    const gallery = (
      ((payload.instafarms as Record<string, unknown>).gallery as Record<string, unknown>)
        .gallery as Array<{ url: string; order: number }>
    );

    expect(gallery).toHaveLength(2);
    expect(gallery[0]?.url).toBe("https://img/1.jpg");
    expect(gallery[1]?.order).toBe(2);
  });

  it("does not read deprecated top-level draft nodes", () => {
    const draft = {
      ...createEmptyPropertyEditorDraft(),
      commercial: { commissionPercentage: 99 },
      plans: { discountPlans: [{ id: "legacy-plan" }] },
      others: { descriptionText: "legacy description" },
    };

    const input = createPayloadInput({
      draft,
    });

    const payload = buildPropertyUpsertPayload(input) as Record<string, unknown>;
    expect(
      ((payload.instafarms as Record<string, unknown>).commercial as Record<string, unknown>)
        .commissionPercentage,
    ).toBe(0);
    expect(
      ((payload.instafarms as Record<string, unknown>).plans as Record<string, unknown>)
        .discountPlans,
    ).toBeUndefined();
    expect(
      ((payload.instafarms as Record<string, unknown>).others as Record<string, unknown>)
        .descriptionText,
    ).toBeUndefined();
  });

  it("sets gallery relation intent to replace when gallery tab is dirty", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.gallery.gallery = [
      { id: "g-1", photoUrl: "https://img/1.jpg", key: "outdoors", sortOrder: 1 },
    ];

    const input = createPayloadInput({
      dirtySections: ["instafarms.gallery"],
      draft,
    });

    const payload = buildPropertyUpsertPayload(input);
    expect(payload.relationIntent?.gallery).toBe("replace");
  });

  it("sets gallery relation intent to unchanged when gallery is untouched", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.gallery.gallery = [
      { id: "g-1", photoUrl: "https://img/1.jpg", key: "outdoors", sortOrder: 1 },
    ];

    const input = createPayloadInput({
      dirtySections: ["instafarms.detail"],
      draft,
    });

    const payload = buildPropertyUpsertPayload(input);
    expect(payload.relationIntent?.gallery).toBe("unchanged");
  });

  it("normalizes cleared address area ids to null", () => {
    const draft = createEmptyPropertyEditorDraft();
    draft.instafarms.address = {
      stateId: "state-1",
      cityId: "city-1",
      areaId: "",
      secondaryAreaId1: "",
    };

    const payload = buildPropertyUpsertPayload(createPayloadInput({ draft })) as Record<string, unknown>;
    const address = (payload.instafarms as Record<string, unknown>).address as Record<string, unknown>;

    expect(address.stateId).toBe("state-1");
    expect(address.cityId).toBe("city-1");
    expect(address.areaId).toBeNull();
    expect(address.secondaryAreaId1).toBeNull();
  });
});
