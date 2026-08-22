import { Checkbox } from "flowbite-react";

interface CouponStatusProps {
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;
}

export default function CouponStatus({
  isActive,
  setIsActive,
}: CouponStatusProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
      <span className="text-sm font-medium text-white">Active</span>
      <Checkbox
        id="isActive"
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
      />
    </label>
  );
}
