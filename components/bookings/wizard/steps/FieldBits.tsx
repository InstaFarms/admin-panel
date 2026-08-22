"use client";

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[12px] font-bold" style={{ color: "var(--mut)" }}>
      {children} {required && <span style={{ color: "var(--bad)" }}>*</span>}
    </div>
  );
}

export const inputCls = "w-full rounded-xl px-3 py-2.5 text-[13.5px]";
export const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--soft)",
  color: "var(--txt)",
};

export function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ibw-chip"
      data-active={active ? "true" : "false"}
    >
      {children}
    </button>
  );
}
