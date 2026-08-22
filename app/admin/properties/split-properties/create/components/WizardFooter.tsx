"use client";

interface WizardFooterProps {
  currentStep: number;
  lastStepIndex: number;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  submitLabel?: string;
}

export default function WizardFooter({
  currentStep,
  lastStepIndex,
  submitting,
  onBack,
  onNext,
  onSubmit,
  onSaveDraft,
  submitLabel = "Create Split Property",
}: WizardFooterProps) {
  const isLast = currentStep === lastStepIndex;
  return (
    <div className="sticky bottom-2 z-10 flex items-center justify-between rounded-xl border border-[#1b2433] bg-[#0a0f18] px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="rounded-lg border border-[#243044] bg-[#101826] px-5 py-2.5 text-sm font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {currentStep === 0 ? "Cancel" : "Back"}
      </button>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={submitting}
          className="rounded-lg border border-[#243044] bg-[#101826] px-4 py-2.5 text-sm font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:opacity-40"
        >
          Save Draft
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
