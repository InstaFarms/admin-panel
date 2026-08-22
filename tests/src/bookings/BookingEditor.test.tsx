import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import BookingEditor from "@/components/bookings/edit/BookingEditor";

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    promise: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/bookings/useBookingHook", () => ({
  useBookingHook: vi.fn(() => ({
    bookingData: null,
    showCancellationForm: false,
    cancellationReferencePerson: "",
    refundAmount: 0,
    refundStatus: "",
    cancellationType: "",
    setRefundAmount: vi.fn(),
    setRefundStatus: vi.fn(),
    setCancellationType: vi.fn(),
    setCancellationReferencePerson: vi.fn(),
    setShowCancellationForm: vi.fn(),
    payments: [
      {
        id: "p1",
        paymentDate: "2024-01-01",
        referencePersonId: "",
        bankName: "",
        bankAccountHolderName: "",
        bankAccountNumber: "",
        bankIfsc: "",
        bankNickname: "",
      },
    ],
    updatePayment: vi.fn(),
    addPayment: vi.fn(),
    removePayment: vi.fn(),
  })),
}));

vi.mock("@/actions/bookingActions", () => ({
  updateBooking: vi.fn(() => Promise.resolve({ success: "Booking updated." })),
  cancelBooking: vi.fn(() => Promise.resolve({ success: "Booking cancelled." })),
}));

vi.mock("@/components/LabelWrapper", () => ({
  __esModule: true,
  default: ({ children, label }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock("@/components/MyButton", () => ({
  __esModule: true,
  default: (props: any) => <button {...props} />,
}));

vi.mock("@/components/UserSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="user-selector" />,
}));

vi.mock("@/components/bookings/PaymentRow", () => ({
  __esModule: true,
  default: () => <tr data-testid="payment-row" />,
}));

vi.mock("@/components/bookings/edit/components/CommercialsTab", () => ({
  __esModule: true,
  default: () => <div data-testid="commercials-tab" />,
}));

vi.mock("@/hooks/bookings/useDarkMode", () => ({
  useDarkMode: () => false,
}));

vi.mock("flowbite-react", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabItem: ({ children, title }: any) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
  Button: (props: any) => <button {...props} />,
  Select: (props: any) => <select {...props} />,
  TextInput: (props: any) => <input {...props} />,
}));

describe("BookingEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders booking details heading", async () => {
    await act(async () => {
      render(<BookingEditor bookingId="b1" />);
    });

    expect(screen.getByText(/Booking Details/i)).toBeInTheDocument();
  });

  it("submits payment update", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<BookingEditor bookingId="b1" />);
    });

    const saveButton = screen.getByRole("button", { name: /Save Payments/i });
    await act(async () => {
      await user.click(saveButton);
    });

    const { updateBooking } = await import("@/actions/bookingActions");
    expect(updateBooking).toHaveBeenCalled();
  });
});
