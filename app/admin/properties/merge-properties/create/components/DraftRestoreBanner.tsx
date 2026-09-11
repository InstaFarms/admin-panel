"use client";

interface DraftRestoreBannerProps {
  visible: boolean;
  savedAt?: number;
  /** Source list still loading — restoring now cannot be validated yet. */
  busy?: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

const relativeAge = (savedAt?: number): string => {
  if (!savedAt) return "";
  const mins = Math.round((Date.now() - savedAt) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day(s) ago`;
};

export default function DraftRestoreBanner({ visible, savedAt, busy, onRestore, onDiscard }: DraftRestoreBannerProps) {
  if (!visible) return null;

  const age = relativeAge(savedAt);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3">
      <div className="text-[13px] text-[#cdd6e0]">
        Unsaved progress from a previous merge was found{age ? ` (saved ${age})` : ""}.
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restore Draft
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg border border-[#243044] bg-[#101826] px-4 py-2 text-[13px] font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825]"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
