import Link from "next/link";
import SplitPropertyWizard from "./SplitPropertyWizard";

export const dynamic = "force-dynamic";

export default function CreateSplitPropertyPage() {
  return (
    <div className="min-h-screen bg-[#070b12] px-6 pb-32 pt-7 md:px-8">
      {/* Back link */}
      <Link
        href="/admin/properties/split-properties"
        className="inline-flex items-center gap-2 text-[13px] text-[#7d8a99] transition hover:text-[#cfd8e2]"
      >
        <span className="text-[15px]">‹</span>
        Back to Split Properties
      </Link>

      {/* Title */}
      <h1 className="mt-3 text-[22px] font-bold text-white">Create a Property Split</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] text-[#8b97a6]">
        The original property stays active as the parent. The new child property inherits or
        overrides each data section based on your strategy choices.
      </p>

      {/* Wizard */}
      <div className="mt-6">
        <SplitPropertyWizard />
      </div>
    </div>
  );
}
