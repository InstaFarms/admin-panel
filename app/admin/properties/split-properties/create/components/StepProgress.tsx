"use client";

interface StepProgressProps {
  steps: readonly string[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export default function StepProgress({ steps, currentStep, onStepClick }: StepProgressProps) {
  return (
    <div className="flex flex-wrap items-center gap-y-3 overflow-x-auto rounded-xl border border-[#1b2433] bg-[#0d1420] px-6 py-4">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              onClick={() => { if (i <= currentStep) onStepClick(i); }}
              className="flex items-center gap-2.5 focus:outline-none"
              aria-current={active ? "step" : undefined}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all"
                style={
                  done
                    ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff" }
                    : active
                    ? { background: "rgba(47,111,237,.13)", border: "2px solid #2f6fed", color: "#7fb0ff" }
                    : { background: "#101826", border: "1px solid #243044", color: "#5f6c7c" }
                }
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className="whitespace-nowrap text-[13px] font-semibold transition-colors"
                style={{ color: active || done ? "#eef2f7" : "#6f7c8c" }}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className="mx-3 h-0.5 w-8 shrink-0 rounded-full transition-colors"
                style={{ background: i < currentStep ? "#2f6fed" : "#1f2a3a" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
