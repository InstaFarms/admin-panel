import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CaretakerEditor from "@/app/admin/users/caretakers/[id]/UserEditor";
import * as caretakerActions from "@/actions/caretakerActions";
import * as userActions from "@/actions/userActions";
import toast from "react-hot-toast";

vi.mock("flowbite-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("flowbite-react")>();
  return {
    ...actual,
    Label: ({ children, htmlFor, ...props }: any) => (
      <label htmlFor={htmlFor} {...props}>{children}</label>
    ),
    TextInput: (props: any) => <input type="text" {...props} />,
    Table: (props: any) => <table {...props}>{props.children}</table>,
    TableBody: (props: any) => <tbody {...props}>{props.children}</tbody>,
    TableCell: (props: any) => <td {...props}>{props.children}</td>,
    TableHead: (props: any) => <thead {...props}>{props.children}</thead>,
    TableHeadCell: (props: any) => <th {...props}>{props.children}</th>,
    TableRow: (props: any) => <tr {...props}>{props.children}</tr>,
  };
});

vi.mock("@/actions/caretakerActions", () => ({
  createCaretakerWithProperties: vi.fn(),
  updateCaretakerProperties: vi.fn(),
}));

vi.mock("@/actions/userActions", () => ({
  editUser: vi.fn(),
}));

vi.mock("@/components/PropertyMultiSelector", () => ({
  default: ({ selectedPropertyIds, onAddProperty }: any) => (
    <div data-testid="property-multi-selector">
      <span>Selected: {selectedPropertyIds.length}</span>
      <button
        type="button"
        onClick={() => onAddProperty?.({ id: "prop-1", propertyName: "P1", propertyCode: "P1", area: "A1", city: "C1", state: "S1" })}
      >
        Add property
      </button>
    </div>
  ),
}));

vi.mock("@/components/MyButton", () => ({
  default: ({ children, onClick, loading }: any) => (
    <button type="button" onClick={onClick} disabled={loading} data-testid="submit-btn">
      {children}
    </button>
  ),
}));

vi.mock("@/app/admin/users/caretakers/DeleteCaretakerButton", () => ({
  default: () => <button type="button" data-testid="delete-caretaker-btn">Delete</button>,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    promise: vi.fn((promise, opts) => {
      Promise.resolve(promise).then(opts?.success).catch(opts?.error);
      return promise;
    }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("CaretakerEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form with all fields", () => {
    render(<CaretakerEditor />);

    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Whatsapp Number/i)).toBeInTheDocument();
    expect(screen.getByTestId("property-multi-selector")).toBeInTheDocument();
    expect(screen.getByTestId("submit-btn")).toHaveTextContent("Submit");
  });

  it("renders edit form with existing user data", () => {
    const user = {
      id: "user-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      mobileNumber: "9876543210",
      whatsappNumber: "9876543210",
    } as any;
    render(<CaretakerEditor data={user} />);

    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("delete-caretaker-btn")).toBeInTheDocument();
  });

  it("does not show delete button in create mode", () => {
    render(<CaretakerEditor />);
    expect(screen.queryByTestId("delete-caretaker-btn")).not.toBeInTheDocument();
  });

  it("shows error when submitting without any property", async () => {
    render(<CaretakerEditor />);

    const firstName = screen.getByLabelText(/First Name/i);
    const lastName = screen.getByLabelText(/Last Name/i);
    const email = screen.getByLabelText(/Email/i);
    const mobile = screen.getByLabelText(/Mobile Number/i);

    fireEvent.change(firstName, { target: { value: "John" } });
    fireEvent.change(lastName, { target: { value: "Doe" } });
    fireEvent.change(email, { target: { value: "john@example.com" } });
    fireEvent.change(mobile, { target: { value: "9876543210" } });

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please select at least one property");
    });
    expect(caretakerActions.createCaretakerWithProperties).not.toHaveBeenCalled();
  });

  it("shows validation error when required fields are empty", async () => {
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    render(<CaretakerEditor existingProperties={existingProperties} />);

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("removes property when remove button is clicked", async () => {
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    render(<CaretakerEditor existingProperties={existingProperties} />);

    expect(screen.getByText("Selected: 1")).toBeInTheDocument();
    const removeBtn = screen.getByTitle("Remove property");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByText("Selected: 0")).toBeInTheDocument();
    });
  });

  it("calls createCaretakerWithProperties on submit when in create mode with valid data", async () => {
    vi.mocked(caretakerActions.createCaretakerWithProperties).mockResolvedValue({ success: "Created" });

    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    render(<CaretakerEditor existingProperties={existingProperties} />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: "9876543210" } });

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(caretakerActions.createCaretakerWithProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          mobileNumber: "9876543210",
        }),
        ["p1"]
      );
    });
  });

  it("calls editUser and updateCaretakerProperties on submit when editing", async () => {
    vi.mocked(userActions.editUser).mockResolvedValue({ success: "Updated" } as any);
    vi.mocked(caretakerActions.updateCaretakerProperties).mockResolvedValue({ success: "Updated" });

    const user = {
      id: "user-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      mobileNumber: "9876543210",
      whatsappNumber: "",
    } as any;
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    render(<CaretakerEditor data={user} existingProperties={existingProperties} />);

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(userActions.editUser).toHaveBeenCalledWith(
        "user-1",
        expect.any(FormData)
      );
    });
    await waitFor(() => {
      expect(caretakerActions.updateCaretakerProperties).toHaveBeenCalledWith("user-1", ["p1"]);
    });
  });
});
