import { Label, TextInput } from "flowbite-react";

interface CouponDiscountValueProps {
  discountType: "percentage" | "flat";
  defaultPercentage?: string;
  defaultFlat?: string;
  onPercentageChange?: (v: string) => void;
  onFlatChange?: (v: string) => void;
  percentageError?: string | null;
  flatError?: string | null;
}

export default function CouponDiscountValue({
  discountType,
  defaultPercentage,
  defaultFlat,
  onPercentageChange,
  onFlatChange,
  percentageError,
  flatError,
}: CouponDiscountValueProps) {
  return (
    <div>
      {discountType === "percentage" ? (
        <div>
          <div className="mb-2 block">
            <Label htmlFor="discountPercentage">
              Discount Value (%) <span className="text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="discountPercentage"
            name="discountPercentage"
            type="number"
            placeholder="Enter discount percentage"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={defaultPercentage}
            className="w-full"
            color={percentageError ? "failure" : "gray"}
            onChange={(e) => onPercentageChange?.(e.target.value)}
          />
          {percentageError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {percentageError}
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-2 block">
            <Label htmlFor="flatDiscount">
              Discount Value (INR) <span className="text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="flatDiscount"
            name="flatDiscount"
            type="number"
            placeholder="Enter flat discount amount"
            min="0"
            required
            defaultValue={defaultFlat}
            className="w-full"
            color={flatError ? "failure" : "gray"}
            onChange={(e) => onFlatChange?.(e.target.value)}
          />
          {flatError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {flatError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
