import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HtmlField from "@/components/HtmlField";

// Jodit is a real browser editor and will not boot under happy-dom. The parts
// worth guarding here are ours: the Editor/Preview toggle, the rendered
// preview, and the hidden input that plain <form action> screens submit.
vi.mock("jodit-react", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="jodit" data-value={value} />
  ),
}));

describe("HtmlField", () => {
  it("starts on the editor view and carries the value into a hidden input", () => {
    render(
      <HtmlField
        label="Answer"
        value="<p>Hello <strong>world</strong></p>"
        onChange={() => {}}
        hiddenName="answer"
      />
    );

    expect(screen.getByRole("button", { name: "Editor" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const hidden = document.querySelector('input[name="answer"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("renders stored HTML as real formatting in the preview, not as raw tags", async () => {
    const user = userEvent.setup();
    render(
      <HtmlField
        label="Answer"
        value='<p>Browse the collection.<br><a href="https://instafarms.in">Book now</a></p>'
        onChange={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    // A real <a>, not the literal text "<a href=...>".
    const link = screen.getByRole("link", { name: "Book now" });
    expect(link).toHaveAttribute("href", "https://instafarms.in");
    expect(screen.queryByText(/<a href/)).toBeNull();
  });

  it("treats markup-only content as empty so the preview does not look filled", async () => {
    const user = userEvent.setup();
    render(<HtmlField label="Answer" value="<p><br></p>" onChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
  });
});
