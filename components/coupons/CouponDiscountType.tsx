import { Label, Select } from "flowbite-react";

interface CouponDiscountTypeProps {
  discountType: "percentage" | "flat";
  setDiscountType: (value: "percentage" | "flat") => void;
}

export default function CouponDiscountType({
  discountType,
  setDiscountType,
}: CouponDiscountTypeProps) {
  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor="discountType">Discount Type</Label>
      </div>
      <Select
        id="discountType"
        value={discountType}
        onChange={(e) =>
          setDiscountType(e.target.value as "percentage" | "flat")
        }
        className="w-full"
      >
        <option value="percentage">Percentage</option>
        <option value="flat">Flat Amount</option>
      </Select>
    </div>
  );
}
