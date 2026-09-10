import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyAuditTemplateModal from "@/components/properties/modals/ApplyAuditTemplateModal";

const getAuditTemplates = vi.fn();

vi.mock("@/actions/auditTemplateActions", () => ({
  getAuditTemplates: (...args: any[]) => getAuditTemplates(...args),
}));

vi.mock("flowbite-react", async (importOriginal) => {
  const { mockFlowbiteReactFactory } =
    await import("../../mocks/flowbiteReactMock");
  return mockFlowbiteReactFactory(importOriginal as () => Promise<any>);
});

const templates = [
  {
    id: "tpl-inactive",
    name: "Retired Template",
    isDefault: false,
    isActive: false,
    areas: [],
  },
  {
    id: "tpl-standard",
    name: "Standard Villa",
    isDefault: true,
    isActive: true,
    areas: [
      { areaName: "Kitchen", items: [{}, {}] },
      { areaName: "Master Bedroom", items: [{}] },
    ],
  },
];

describe("ApplyAuditTemplateModal", () => {
  beforeEach(() => {
    getAuditTemplates.mockReset();
    getAuditTemplates.mockResolvedValue({ success: true, data: templates });
  });

  it("preselects the default template, hides inactive ones, and applies that id", async () => {
    const onApply = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(<ApplyAuditTemplateModal show onClose={onClose} onApply={onApply} />);

    await waitFor(() => expect(screen.getByLabelText("Template")).toBeDefined());

    const select = screen.getByLabelText("Template") as HTMLSelectElement;
    expect(select.value).toBe("tpl-standard");
    expect(screen.queryByText(/Retired Template/)).toBeNull();

    // 2 areas / 3 items across them — proves the summary counts the real shape.
    expect(screen.getByText(/Adds 2 area\(s\) and 3 checklist item\(s\)\./)).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Apply Template" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith("tpl-standard"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("states the copy-not-link promise the property config relies on", async () => {
    render(
      <ApplyAuditTemplateModal show onClose={vi.fn()} onApply={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByLabelText("Template")).toBeDefined());

    expect(
      screen.getByText(/Later edits to the template will not change this property\./),
    ).toBeDefined();
  });

  it("stays closed when the apply fails", async () => {
    const onApply = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();

    render(<ApplyAuditTemplateModal show onClose={onClose} onApply={onApply} />);

    await waitFor(() => expect(screen.getByLabelText("Template")).toBeDefined());
    await userEvent.click(screen.getByRole("button", { name: "Apply Template" }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers nothing to apply when no active template exists", async () => {
    getAuditTemplates.mockResolvedValue({ success: true, data: [templates[0]] });

    render(<ApplyAuditTemplateModal show onClose={vi.fn()} onApply={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/No active audit templates exist yet\./)).toBeDefined(),
    );
    expect(
      (screen.getByRole("button", { name: "Apply Template" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
