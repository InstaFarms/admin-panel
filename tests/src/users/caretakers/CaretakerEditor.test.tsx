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
  // UserEditor also calls this on mount to warn about a duplicate number.
  // Unstubbed, the effect threw "No checkUserMobileExists export is defined
  // on the mock" from inside a passive effect, which surfaces as an unhandled
  // error rather than a clean assertion failure. Reports "not taken".
  checkUserMobileExists: vi.fn(async () => ({ exists: false })),
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

/**
 * The submit button lives on the PAGE, not in this component — it is an
 * external button wired with form={EDIT_FORM_ID}. Submitting the form is
 * exactly what clicking it does, and it keeps these tests honest about what
 * UserEditor actually renders.
 */
const submitEditorForm = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (!form) throw new Error("the caretaker editor rendered no <form>");
  fireEvent.submit(form);
};

describe("CaretakerEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form with all fields", () => {
    const { container } = render(<CaretakerEditor />);

    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Whatsapp Number/i)).toBeInTheDocument();
    expect(screen.getByTestId("property-multi-selector")).toBeInTheDocument();
    // No submit button assertion: the page owns it (see submitEditorForm).
    expect(container.querySelector("form")).toBeInTheDocument();
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
    const { container } = render(<CaretakerEditor data={user} />);

    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    // The delete button is rendered by the page next to the submit button,
    // not by this component, so there is nothing to assert here.
  });

  it("renders no delete control of its own in create mode", () => {
    const { container } = render(<CaretakerEditor />);
    // Deleting is the page's concern; this component must not grow its own.
    expect(screen.queryByTestId("delete-caretaker-btn")).not.toBeInTheDocument();
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("shows error when submitting without any property", async () => {
    const { container } = render(<CaretakerEditor />);

    const firstName = screen.getByLabelText(/First Name/i);
    const lastName = screen.getByLabelText(/Last Name/i);
    const email = screen.getByLabelText(/Email/i);
    const mobile = screen.getByLabelText(/Mobile Number/i);

    fireEvent.change(firstName, { target: { value: "John" } });
    fireEvent.change(lastName, { target: { value: "Doe" } });
    fireEvent.change(email, { target: { value: "john@example.com" } });
    fireEvent.change(mobile, { target: { value: "9876543210" } });

    submitEditorForm(container);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please select at least one property");
    });
    expect(caretakerActions.createCaretakerWithProperties).not.toHaveBeenCalled();
  });

  it("shows validation error when required fields are empty", async () => {
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    const { container } = render(<CaretakerEditor existingProperties={existingProperties} />);

    submitEditorForm(container);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("removes property when remove button is clicked", async () => {
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    const { container } = render(<CaretakerEditor existingProperties={existingProperties} />);

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
    const { container } = render(<CaretakerEditor existingProperties={existingProperties} />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: "9876543210" } });

    submitEditorForm(container);

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
    const { container } = render(<CaretakerEditor data={user} existingProperties={existingProperties} />);

    submitEditorForm(container);

    await waitFor(() => {
      expect(userActions.editUser).toHaveBeenCalledWith(
        "user-1",
        expect.any(FormData)
      );
    });
    // NOT updateCaretakerProperties: the editor's submit handler branches on
    // `mode`, and only mode="properties" touches the property assignment. The
    // page renders two separate editors (mode="details" and mode="properties",
    // app/admin/users/caretakers/[id]/page.tsx), so editing the profile and
    // editing the assigned properties are two different submits. This used to
    // assert both from one submit, which stopped being true at that split.
    expect(caretakerActions.updateCaretakerProperties).not.toHaveBeenCalled();
  });

  it('calls updateCaretakerProperties on submit in mode="properties"', async () => {
    vi.mocked(caretakerActions.updateCaretakerProperties).mockResolvedValue({ success: "Updated" });

    const user = { id: "user-1", firstName: "Jane", lastName: "Doe" } as any;
    const existingProperties = [
      { propertyId: "p1", propertyName: "Prop 1", propertyCode: "P1", areaName: "A1", cityName: "C1", stateName: "S1" },
    ];
    const { container } = render(
      <CaretakerEditor data={user} existingProperties={existingProperties} mode="properties" />
    );

    submitEditorForm(container);

    await waitFor(() => {
      expect(caretakerActions.updateCaretakerProperties).toHaveBeenCalledWith("user-1", ["p1"]);
    });
    // The profile half must stay untouched on this submit.
    expect(userActions.editUser).not.toHaveBeenCalled();
  });
});
