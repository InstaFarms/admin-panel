import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/firebase-admin", () => ({
  __esModule: true,
  default: {},
}));

import PropertyEditor from "@/components/properties/editor/PropertyEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/properties/usePropertyBootstrap", () => ({
  usePropertyBootstrap: vi.fn(() => ({
    isEditMode: false,
    initialSnapshot: {
      instafarms: {
        detail: { propertyName: "Test Property", brandId: "brand-1" },
        address: {},
        googlePlace: {},
        commercial: {},
        amenitiesActivities: {},
        spaces: [],
        peopleRoles: {},
        plans: {},
        others: {},
        gallery: { gallery: [], coverPhotos: [] },
      },
      mago: {
        detail: {},
        address: {},
        googlePlace: {},
        commercial: {},
        amenitiesActivities: {},
        spaces: [],
        peopleRoles: {},
        plans: {},
        others: {},
        gallery: { gallery: [], coverPhotos: [] },
      },
    },
    loading: false,
    selectedBrandSlug: "instafarms",
    selectedBrandId: "brand-1",
    availableBrands: [{ id: "brand-1", name: "Instafarms", slug: "instafarms" }],
    propertyTypes: [],
    allAmenities: [],
    allActivities: [],
    amenitiesLoaded: true,
    amenitiesLoading: false,
    activitiesLoaded: true,
    activitiesLoading: false,
    stateData: [],
    cityData: [],
    areaData: [],
    ensurePropertyTypesLoaded: vi.fn(),
    ensureAddressLookupsLoaded: vi.fn(),
    ensureAmenitiesLoaded: vi.fn(),
    ensureActivitiesLoaded: vi.fn(),
  })),
}));

vi.mock("@/hooks/properties/usePropertyServices", () => ({
  usePropertyServices: vi.fn(() => ({
    saveUnsavedAreas: vi.fn(async () => true),
    searchUsers: vi.fn(async () => []),
    searchDiscountPlans: vi.fn(async () => []),
    searchShortTermPlans: vi.fn(async () => []),
    searchLongTermPlans: vi.fn(async () => []),
    ensureIcalLoaded: vi.fn(),
    icalLinks: [],
    showAddForm: false,
    setShowAddForm: vi.fn(),
    newLink: { name: "", icalUrl: "" },
    setNewLink: vi.fn(),
    exportUrl: "",
    icalLoading: false,
    icalBootstrapLoading: false,
    handleAddIcalLink: vi.fn(async () => true),
    handleSyncIcalLink: vi.fn(async () => true),
    handleDeleteIcalLink: vi.fn(async () => true),
    handleCopyExportUrl: vi.fn(),
    ensureAuditAreasLoaded: vi.fn(),
    auditAreas: [],
    auditAreasLoaded: true,
    auditAreasLoading: false,
    unsavedAuditItems: [],
    handleAddAuditArea: vi.fn(async () => true),
    handleRemoveAuditArea: vi.fn(async () => true),
    getAuditAreaItems: vi.fn(async () => ({ success: true, data: {} })),
    handleAddChecklistItem: vi.fn(async () => true),
    handleUpdateChecklistItem: vi.fn(async () => true),
    handleRemoveChecklistItem: vi.fn(async () => true),
  })),
}));

vi.mock("@/components/properties/gallery-section", () => ({
  GallerySection: () => <div data-testid="gallery-section" />,
}));

vi.mock("@/components/properties/editor/PropertyEditorTabs", () => ({
  PropertyEditorTabs: () => <div data-testid="property-editor-tabs" />,
}));

vi.mock("@/components/properties/DetailSection", () => ({
  __esModule: true,
  default: () => <div data-testid="detail-section" />,
}));

vi.mock("@/components/AreaSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="area-selector" />,
}));

vi.mock("@/components/properties/GooglePlaceSection", () => ({
  __esModule: true,
  default: () => <div data-testid="google-place-section" />,
}));

vi.mock("@/components/properties/SpecialDatesSection", () => ({
  __esModule: true,
  default: () => <div data-testid="special-dates-section" />,
}));

vi.mock("@/components/properties/AmenitiesActivitiesSection", () => ({
  __esModule: true,
  default: () => <div data-testid="amenities-activities-section" />,
}));

vi.mock("@/components/properties/SafetyHygieneSection", () => ({
  __esModule: true,
  default: () => <div data-testid="safety-hygiene-section" />,
}));

vi.mock("@/components/properties/SpacesSection", () => ({
  __esModule: true,
  default: () => <div data-testid="spaces-section" />,
}));

vi.mock("@/components/properties/UserManagementTab", () => ({
  __esModule: true,
  default: () => <div data-testid="user-management-tab" />,
}));

vi.mock("@/components/properties/PlansSection", () => ({
  __esModule: true,
  default: () => <div data-testid="plans-section" />,
}));

vi.mock("@/components/properties/OthersTabsSection", () => ({
  __esModule: true,
  default: () => <div data-testid="others-tabs-section" />,
}));

vi.mock("@/components/properties/ICalManagement", () => ({
  __esModule: true,
  default: () => <div data-testid="ical-management" />,
}));

vi.mock("../DeletePropertyButton", () => ({
  __esModule: true,
  default: () => <button data-testid="delete-property">Delete</button>,
}));

vi.mock("flowbite-react", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabItem: ({ children, title }: any) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
  TextInput: (props: any) => <input {...props} />,
  Select: (props: any) => <select {...props} />,
  Button: (props: any) => <button {...props} />,
  Spinner: (props: any) => <div data-testid="spinner" {...props} />,
  ToggleSwitch: (props: any) => <input type="checkbox" {...props} />,
  Label: (props: any) => <label {...props} />,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHeadCell: ({ children }: any) => <th>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  Modal: ({ children }: any) => <div>{children}</div>,
  ModalHeader: ({ children }: any) => <div>{children}</div>,
  ModalBody: ({ children }: any) => <div>{children}</div>,
  ModalFooter: ({ children }: any) => <div>{children}</div>,
}));

describe("PropertyEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in create mode when no propertyId is provided", () => {
    render(<PropertyEditor />);

    expect(screen.getByTestId("property-editor-tabs")).toBeInTheDocument();
  });

  it("renders editor in edit mode without crashing", () => {
    render(<PropertyEditor propertyId="prop-1" />);

    expect(screen.getByTestId("property-editor-tabs")).toBeInTheDocument();
  });
});

