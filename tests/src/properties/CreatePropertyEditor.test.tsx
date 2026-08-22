import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@/lib/sentry", () => ({
  captureError: vi.fn(),
}));

vi.mock("@/actions/propertyActions", () => ({
  createPropertyFromPayload: vi.fn(async () => ({ data: { propertyId: "new-prop-1" } })),
}));

vi.mock("@/components/properties/create-property/checkPropertyCode", () => ({
  checkPropertyCodeExists: vi.fn(async () => false),
}));

vi.mock("@/hooks/properties/usePropertyServices", () => ({
  usePropertyServices: vi.fn(() => ({})),
}));

vi.mock("@/components/properties/gallery-section", () => ({
  GallerySection: () => <div data-testid="gallery-section" />,
}));

vi.mock("@/components/properties/editor/tabs/AddressTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="address-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/AmenitiesTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="amenities-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/AuditTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="audit-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/CommercialTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="commercial-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/GooglePlaceTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="google-place-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/ICalTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="ical-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/OthersTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="others-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/PeopleRolesTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="people-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/PlansTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="plans-tab" />,
}));
vi.mock("@/components/properties/editor/tabs/SpacesTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="spaces-tab" />,
}));
vi.mock("@/components/properties/create-property/CreateDetailTabContainer", () => ({
  __esModule: true,
  default: () => <div data-testid="detail-tab" />,
}));

// Use the REAL flowbite-react Tabs/TabItem/Breadcrumb/Button here (not mocked) —
// this test's whole point is to catch a real-component crash that a stubbed
// Tabs mock would hide.

import CreatePropertyEditor from "@/components/properties/create-property/CreatePropertyEditor";

const sources = [
  { id: "INSTAFARMS_EXCLUSIVE", name: "InstaFarms Exclusive", description: "Manage solely on InstaFarms." },
  { id: "MAGO", name: "Mago", description: "Manage through Mago. Automatically synced to InstaFarms." },
  { id: "ELIVAAS", name: "Elivaas", description: "Sourced from Elivaas. Automatically synced to InstaFarms." },
];

describe("CreatePropertyEditor source selection", () => {
  it("advances from the source-select screen to the tabbed editor after selecting a source and clicking Continue", () => {
    render(<CreatePropertyEditor sources={sources} />);

    // Source select screen should be showing first
    expect(screen.getByText("Choose the source platform for this property. All properties will automatically appear on InstaFarms.")).toBeInTheDocument();

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByText("Mago"));
    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);

    // Should now show the tabbed editor for the selected brand
    expect(screen.getByText(/Create Property for Mago/i)).toBeInTheDocument();
    expect(screen.getByTestId("detail-tab")).toBeInTheDocument();
  });
});
