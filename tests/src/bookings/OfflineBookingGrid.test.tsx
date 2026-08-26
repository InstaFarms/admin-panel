import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import OfflineBookingGrid from "@/components/bookings/edit/OfflineBookingGrid";

function RerenderingHarness() {
  const [, setPayload] = useState<any[]>([]);

  return (
    <OfflineBookingGrid
      // A wizard parent commonly creates Date values inline on every render.
      // The grid must preserve the row the user is actively typing in.
      checkinDate={new Date("2026-08-26T00:00:00")}
      checkoutDate={new Date("2026-08-28T00:00:00")}
      amountInputType="INCLUSIVE"
      totalBookingPrice={1180}
      onPayloadChange={setPayload}
    />
  );
}

describe("OfflineBookingGrid", () => {
  it("keeps a typed nightly amount after the parent rerenders", async () => {
    render(<RerenderingHarness />);

    const firstNightAmount = screen.getByLabelText("Room amount for 26 Aug 2026");
    fireEvent.change(firstNightAmount, { target: { value: "1180" } });

    await waitFor(() => expect(firstNightAmount).toHaveValue("1180"));
    expect(screen.getAllByText("₹1,180.00")).toHaveLength(3);
  });

  it("uses the wizard theme tokens rather than forcing a white table", () => {
    render(
      <OfflineBookingGrid
        checkinDate={new Date("2026-08-26T00:00:00")}
        checkoutDate={new Date("2026-08-27T00:00:00")}
        totalBookingPrice={0}
        onPayloadChange={() => undefined}
      />,
    );

    expect(screen.getByText("Night-wise audit breakup").closest("section")?.getAttribute("style")).toContain("background: var(--card)");
  });
});
