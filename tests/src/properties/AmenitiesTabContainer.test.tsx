import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AmenitiesTabContainer from "@/components/properties/editor/tabs/AmenitiesTabContainer";

const capturedProps: { current: any } = { current: null };

vi.mock("@/components/properties/AmenitiesActivitiesSection", () => ({
  __esModule: true,
  default: (props: any) => {
    capturedProps.current = props;
    return <div data-testid="amenities-activities-section" />;
  },
}));

const lookupState = {
  ensureAmenitiesLoaded: vi.fn(async () => {}),
  ensureActivitiesLoaded: vi.fn(async () => {}),
  allAmenities: [] as any[],
  allActivities: [] as any[],
  amenitiesLoaded: false,
  amenitiesLoading: false,
  activitiesLoaded: false,
  activitiesLoading: false,
};

vi.mock("@/hooks/properties/useAmenitiesActivitiesLookups", () => ({
  useAmenitiesActivitiesLookups: () => lookupState,
}));

describe("AmenitiesTabContainer", () => {
  it("loads amenities and activities on mount", () => {
    lookupState.ensureAmenitiesLoaded = vi.fn(async () => {});
    lookupState.ensureActivitiesLoaded = vi.fn(async () => {});

    render(
      <AmenitiesTabContainer
        sectionData={{ amenities: [], activities: [] }}
        onSectionChange={vi.fn()}
      />,
    );

    expect(lookupState.ensureAmenitiesLoaded).toHaveBeenCalledTimes(1);
    expect(lookupState.ensureActivitiesLoaded).toHaveBeenCalledTimes(1);
  });

  it("routes amenity add through section patch callback", () => {
    const onSectionChange = vi.fn();
    lookupState.ensureAmenitiesLoaded = vi.fn(async () => {});
    lookupState.ensureActivitiesLoaded = vi.fn(async () => {});
    lookupState.amenitiesLoaded = true;
    lookupState.activitiesLoaded = true;

    render(
      <AmenitiesTabContainer
        sectionData={{ amenities: [], activities: [] }}
        onSectionChange={onSectionChange}
      />,
    );

    capturedProps.current.addAmenityWithSelection({ id: "a1", name: "Pool" });

    expect(onSectionChange).toHaveBeenCalled();
    const [path, updater] = onSectionChange.mock.calls[0];
    expect(path).toBe("amenitiesActivities.amenities");
    expect(typeof updater).toBe("function");
  });
});

