import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AddChecklistItemModal from "@/components/properties/modals/AddChecklistItemModal";

const selectProps = new Map<string, any>();
const getAuditMasterData = vi.fn();

vi.mock("@/actions/auditMasterActions", () => ({
  getAuditMasterData: (...args: any[]) => getAuditMasterData(...args),
}));

vi.mock("@/components/SearchableSelect", () => ({
  __esModule: true,
  default: (props: any) => {
    selectProps.set(props.id, props);
    return <div data-testid={props.id}>{props.value}</div>;
  },
}));

vi.mock("@/components/ui/AnimatedModalContent", () => ({
  AnimatedModalContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("flowbite-react", async (importOriginal) => {
  const { mockFlowbiteReactFactory } =
    await import("../../mocks/flowbiteReactMock");
  return mockFlowbiteReactFactory(importOriginal as () => Promise<any>);
});

describe("AddChecklistItemModal", () => {
  beforeEach(() => {
    selectProps.clear();
    getAuditMasterData.mockReset();
    getAuditMasterData.mockResolvedValue({ data: [] });
  });

  it("locks category and master item identity while editing", async () => {
    render(
      <AddChecklistItemModal
        show
        type="INVENTORY"
        initialData={{
          id: "configured-item-1",
          masterId: "master-item-1",
          expectedQuantity: 4,
          requiredThreshold: 3,
          criticalThreshold: 1,
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await waitFor(() => expect(selectProps.get("masterItem")).toBeDefined());

    expect(selectProps.get("checklistCategory").disabled).toBe(true);
    expect(selectProps.get("masterItem").disabled).toBe(true);
  });

  it("keeps category and master item selectable when adding", async () => {
    render(
      <AddChecklistItemModal
        show
        type="INVENTORY"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await waitFor(() => expect(selectProps.get("masterItem")).toBeDefined());

    expect(selectProps.get("checklistCategory").disabled).toBe(false);
    expect(selectProps.get("masterItem").disabled).toBe(false);
  });
});
