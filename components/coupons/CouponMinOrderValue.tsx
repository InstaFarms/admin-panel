"use client";

import { Label, TextInput } from "flowbite-react";

interface CouponMinOrderValueProps {
  minOrderValue: string;
  setMinOrderValue: (value: string) => void;
  error?: string | null;
}

export default function CouponMinOrderValue({
  minOrderValue,
  setMinOrderValue,
  error,
}: CouponMinOrderValueProps) {
  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor="minOrderValue">Minimum Booking Amount (INR)</Label>
      </div>
      <TextInput
        id="minOrderValue"
        name="minOrderValue"
        type="number"
        placeholder="0"
        value={minOrderValue}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (val < 0) return;
          setMinOrderValue(e.target.value);
        }}
        min={0}
        color={error ? "failure" : "gray"}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </div>
  );
}
