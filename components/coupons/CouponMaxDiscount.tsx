import { Label, TextInput } from "flowbite-react";

interface CouponMaxDiscountProps {
  discountType: "percentage" | "flat";
  defaultMaxDiscount?: string;
  onChange?: (v: string) => void;
  error?: string | null;
}

export default function CouponMaxDiscount({
  discountType,
  defaultMaxDiscount,
  onChange,
  error,
}: CouponMaxDiscountProps) {
  if (discountType !== "percentage") return null;

  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor="maxDiscountAmount">Maximum Discount Amount (INR)</Label>
      </div>
      <TextInput
        id="maxDiscountAmount"
        name="maxDiscountAmount"
        type="number"
        placeholder="Enter maximum discount amount"
        min="0"
        defaultValue={defaultMaxDiscount}
        className="w-full"
        color={error ? "failure" : "gray"}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </div>
  );
}
