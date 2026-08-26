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
  it("auto-splits the booking total evenly across the nights", async () => {
    render(<RerenderingHarness />);

    // ₹1,180 over two nights (INCLUSIVE) seeds ₹590.00 into each Room field.
    await waitFor(() => expect(screen.getByLabelText("Room amount for 26 Aug 2026")).toHaveValue("590.00"));
    expect(screen.getByLabelText("Room amount for 27 Aug 2026")).toHaveValue("590.00");
  });

  it("keeps a typed nightly amount after the parent rerenders", async () => {
    render(<RerenderingHarness />);

    const firstNightAmount = screen.getByLabelText("Room amount for 26 Aug 2026");
    // Editing a night overrides the auto-split; the typed value must then survive
    // the parent's inline-`new Date(...)` rerenders (the original regression here).
    fireEvent.change(firstNightAmount, { target: { value: "1180" } });

    await waitFor(() => expect(firstNightAmount).toHaveValue("1180"));
    expect(firstNightAmount).toHaveValue("1180");
    // Overriding one night switches off auto-split, so the other night keeps its seed.
    expect(screen.getByLabelText("Room amount for 27 Aug 2026")).toHaveValue("590.00");
    expect(screen.getByText("Reset to auto-split")).toBeInTheDocument();
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
