"use client";

import { createDiscountPlan, editDiscountPlan } from "@/actions/discountPlanActions";
import MyButton from "@/components/MyButton";
import DeleteDiscountPlanButton from "@/components/discount-plans/DeleteDiscountPlanButton";
import { DISCOUNT_PLANS_LIST_BASE_PATH, type PlanBrandScope } from "@/constants/planBrandScope";
import { useDiscountPlanForm } from "@/hooks/useDiscountPlanForm";
import { DiscountPlanValue, DiscountPlanWithValues } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Label, Select, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiTrash } from "@/constants/discount-plans";

interface DiscountPlanEditorProps {
  data?: DiscountPlanWithValues;
  adminScope?: PlanBrandScope;
}

export default function DiscountPlanEditor({
  data,
  adminScope = "instafarms",
}: DiscountPlanEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const listPath = DISCOUNT_PLANS_LIST_BASE_PATH[adminScope];

  const {
    name,
    setName,
    isActive,
    setIsActive,
    discountTiers,
    setDiscountTiers,
    updateDiscountTier,
    setDiscountTypeExclusive,
    errors,
    validate,
  } = useDiscountPlanForm({
    name: data?.name,
    isActive: data?.isActive,
    discountTiers:
      data?.values && data.values.length > 0
        ? data.values.map((value: DiscountPlanValue) => ({
            minDays: value.minDays,
            discountPercentage: value.discountPercentage?.toString() || "",
            flatDiscount: value.flatDiscount?.toString() || "",
          }))
        : undefined,
  });

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    const formData = new FormData();
    formData.set("planBrandScope", adminScope);
    formData.set("name", name.trim());
    formData.set("isActive", isActive.toString());

    discountTiers.forEach((tier) => {
      formData.append("minDays", tier.minDays.toString());
      formData.append("discountPercentage", tier.discountPercentage);
      formData.append("flatDiscount", tier.flatDiscount);
    });

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        const editDiscountPlanWithId = editDiscountPlan.bind(null, data.id);
        promise = parseServerActionResult(editDiscountPlanWithId(formData));
      } else {
        promise = parseServerActionResult(createDiscountPlan(formData));
      }

      toast.promise(promise, {
        loading: data ? "Updating Discount Plan..." : "Creating Discount Plan...",
        success: (msg) => {
          if (!data) {
            router.push(listPath);
          }
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const addDiscountTier = () => {
    setDiscountTiers([
      ...discountTiers,
      { minDays: 0, discountPercentage: "", flatDiscount: "" },
    ]);
  };

  const removeDiscountTier = (index: number) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="name">
              Plan Name <span className="text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="name"
            type="text"
            placeholder="Enter plan name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            color={errors.name ? "failure" : undefined}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="isActive">Status</Label>
          </div>
          <Select
            id="isActive"
            value={isActive.toString()}
            onChange={(e) => setIsActive(e.target.value === "true")}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Label className="text-base font-semibold">
            Discount Tiers <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            size="sm"
            onClick={addDiscountTier}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <HiPlus size={16} />
            <span className="hidden sm:inline">Add Tier</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        {errors.discountTiers && (
          <p className="mb-2 text-sm text-red-500">{errors.discountTiers}</p>
        )}

        <div className="space-y-4">
          {discountTiers.map((tier, index) => {
            const minDaysError = errors[`tier-${index}-minDays` as keyof typeof errors];
            const discountPercentageError = errors[`tier-${index}-discountPercentage` as keyof typeof errors];
            const flatDiscountError = errors[`tier-${index}-flatDiscount` as keyof typeof errors];

            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-3 sm:p-4 bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tier {index + 1}
                  </span>
                  {discountTiers.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      color="failure"
                      onClick={() => removeDiscountTier(index)}
                      className="w-full sm:w-auto"
                    >
                      <HiTrash size={16} className="sm:mr-2" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor={`minDays-${index}`} className="text-sm">
                      Minimum Days <span className="text-red-500">*</span>
                    </Label>
                    <TextInput
                      id={`minDays-${index}`}
                      type="number"
                      value={tier.minDays}
                      onChange={(e) => updateDiscountTier(index, "minDays", parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      required
                      sizing="sm"
                      color={minDaysError ? "failure" : undefined}
                    />
                    {minDaysError && (
                      <p className="mt-1 text-xs text-red-500">{minDaysError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`discountPercentage-${index}`} className="text-sm">
                      Discount %
                    </Label>
                    <TextInput
                      id={`discountPercentage-${index}`}
                      type="number"
                      value={tier.discountPercentage}
                      onChange={(e) => setDiscountTypeExclusive(index, "discountPercentage", e.target.value)}
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                      step="0.01"
                      sizing="sm"
                      color={discountPercentageError ? "failure" : undefined}
                    />
                    {discountPercentageError && (
                      <p className="mt-1 text-xs text-red-500">{discountPercentageError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`flatDiscount-${index}`} className="text-sm">
                      Flat Discount (₹)
                    </Label>
                    <TextInput
                      id={`flatDiscount-${index}`}
                      type="number"
                      value={tier.flatDiscount}
                      onChange={(e) => setDiscountTypeExclusive(index, "flatDiscount", e.target.value)}
                      placeholder="e.g. 500"
                      min="0"
                      sizing="sm"
                      color={flatDiscountError ? "failure" : undefined}
                    />
                    {flatDiscountError && (
                      <p className="mt-1 text-xs text-red-500">{flatDiscountError}</p>
                    )}
                  </div>
                </div>
                {!tier.discountPercentage && !tier.flatDiscount && (
                  <p className="mt-2 text-xs text-gray-500">
                    Enter exactly one: either Discount % or Flat discount
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center items-center gap-3">
        <MyButton onClick={handleSubmit} loading={loading}>
          {loading ? (data ? "Updating..." : "Creating...") : "Submit"}
        </MyButton>
        {data?.id && (
          <div onClick={(e) => e.preventDefault()}>
            <DeleteDiscountPlanButton id={data.id} adminScope={adminScope} />
          </div>
        )}
      </div>
    </div>
  );
}
