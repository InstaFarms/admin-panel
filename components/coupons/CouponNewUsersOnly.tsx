"use client";

import { ToggleSwitch, Tooltip } from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";

interface CouponNewUsersOnlyProps {
  newUsersOnly: boolean;
  setNewUsersOnly: (value: boolean) => void;
}

export default function CouponNewUsersOnly({
  newUsersOnly,
  setNewUsersOnly,
}: CouponNewUsersOnlyProps) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">New Users Only</span>
          <Tooltip content="If checked, this coupon will fail for anyone who has a confirmed or completed booking in their history.">
            <HiInformationCircle className="text-slate-400" />
          </Tooltip>
        </div>
        <ToggleSwitch checked={newUsersOnly} onChange={setNewUsersOnly} />
      </div>
    </div>
  );
}
