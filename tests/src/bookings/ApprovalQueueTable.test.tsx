import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import ApprovalQueueTable from "@/components/bookings/ApprovalQueueTable";

import * as bookingActions from "@/actions/bookingConfirmationActions";

// Mock the server actions
vi.mock("@/actions/bookingConfirmationActions", () => ({
    approveBookingConfirmation: vi.fn(),
    rejectBookingConfirmation: vi.fn(),
}));

// Apply mocks
vi.mock("flowbite-react", async (importOriginal) => {
    const { mockFlowbiteReactFactory } = await import("@/tests/mocks/flowbiteReactMock");
    return mockFlowbiteReactFactory(importOriginal);
});

const mockData = [
    {
        id: "booking-1",
        requestedAt: new Date().toISOString(),
        guestName: "John Doe",
        propertyName: "Sunset Villa",
        checkinDate: "2024-01-01",
        checkoutDate: "2024-01-05",
        guestCount: 2,
    },
];

describe("ApprovalQueueTable", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should approve booking confirmation when confirmation dialog is accepted", async () => {
        // Mock window.confirm to return true
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

        render(<ApprovalQueueTable initialData={mockData} />);

        // Find and click the approve button (green checkmark)
        const approveButtons = screen.getAllByRole("button");
        // The first button in the actions cell is the approve button (index 0 based on the code structure)
        // Or we can find it by the structure. The code has HiCheck icon.
        // Let's rely on finding buttons within the row.
        // There are 2 buttons per row.
        const approveBtn = approveButtons[0]; // First button is approve

        fireEvent.click(approveBtn);

        expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to approve this booking?");

        await waitFor(() => {
            expect(bookingActions.approveBookingConfirmation).toHaveBeenCalledWith("booking-1");
        });
    });

    it("should not approve booking confirmation when confirmation dialog is rejected", async () => {
        // Mock window.confirm to return false
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

        render(<ApprovalQueueTable initialData={mockData} />);

        const approveButtons = screen.getAllByRole("button");
        const approveBtn = approveButtons[0];

        fireEvent.click(approveBtn);

        expect(confirmSpy).toHaveBeenCalled();
        expect(bookingActions.approveBookingConfirmation).not.toHaveBeenCalled();
    });

    it("should reject booking confirmation with reason when reject modal is submitted", async () => {
        render(<ApprovalQueueTable initialData={mockData} />);

        // Find and click the reject button (red X)
        // It's the second button
        const buttons = screen.getAllByRole("button");
        const rejectBtn = buttons[1];

        fireEvent.click(rejectBtn);

        // Verify modal is open - use findByText which waits
        expect(await screen.findByText("Reject Booking Request")).toBeInTheDocument();

        // Input reason
        const reasonInput = screen.getByLabelText("Reason for Rejection");
        fireEvent.change(reasonInput, { target: { value: "Dates not available" } });

        // Click reject in modal
        const confirmRejectBtn = screen.getByText("Reject", { selector: "button" });
        fireEvent.click(confirmRejectBtn);

        await waitFor(() => {
            expect(bookingActions.rejectBookingConfirmation).toHaveBeenCalledWith("booking-1", "Dates not available");
        });
    });

    it("should disable reject button when reason is empty or whitespace", async () => {
        render(<ApprovalQueueTable initialData={mockData} />);

        // Open reject modal
        const buttons = screen.getAllByRole("button");
        const rejectBtn = buttons[1];
        fireEvent.click(rejectBtn);

        // Wait for modal
        const confirmRejectBtn = await screen.findByText("Reject", { selector: "button" });

        // Verify it's disabled initially (reason is empty)
        expect(confirmRejectBtn).toBeDisabled();

        // Try whitespace
        const reasonInput = screen.getByLabelText("Reason for Rejection");
        fireEvent.change(reasonInput, { target: { value: "   " } });

        expect(confirmRejectBtn).toBeDisabled();

        // Try clicking just in case (though disabled prevents click events usually, safe to check logic)
        fireEvent.click(confirmRejectBtn);

        expect(bookingActions.rejectBookingConfirmation).not.toHaveBeenCalled();
    });
});
