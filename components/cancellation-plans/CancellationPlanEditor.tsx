"use client";

import { createCancellationPlan, editCancellationPlan } from "@/actions/cancellationPlanActions";
import MyButton from "@/components/MyButton";
import DeleteCancellationPlanButton from "@/components/cancellation-plans/DeleteCancellationPlanButton";
import { CANCELLATION_PLANS_LIST_BASE_PATH, type PlanBrandScope } from "@/constants/planBrandScope";
import { useCancellationPlanForm } from "@/hooks/useCancellationPlanForm";
import { CancellationPlanWithPercentages } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Label, Select, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiTrash } from "@/constants/cancellation-plans";

interface CancellationPlanEditorProps {
  data?: CancellationPlanWithPercentages;
  adminScope?: PlanBrandScope;
}

export default function CancellationPlanEditor({
  data,
  adminScope = "instafarms",
}: CancellationPlanEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const listPath = CANCELLATION_PLANS_LIST_BASE_PATH[adminScope];

  const percentages = data?.percentages;

  const {
    name,
    setName,
    isActive,
    setIsActive,
    cancellationTiers,
    setCancellationTiers,
    updateCancellationTier,
    errors,
    validate,
  } = useCancellationPlanForm({
    name: data?.name,
    isActive: data?.isActive ?? true,
    cancellationTiers:
      percentages && percentages.length > 0
        ? percentages.map((percentage) => ({
            percentage: percentage.percentage?.toString() || percentage.refund?.toString() || "",
            days: percentage.days,
            lessThan: percentage.lessThan ?? true,
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

    cancellationTiers.forEach((tier) => {
      formData.append("percentage", tier.percentage);
      formData.append("days", tier.days.toString());
      formData.append("lessThan", tier.lessThan.toString());
    });

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        const editCancellationPlanWithId = editCancellationPlan.bind(null, data.id);
        promise = parseServerActionResult(editCancellationPlanWithId(formData));
      } else {
        promise = parseServerActionResult(createCancellationPlan(formData));
      }

      toast.promise(promise, {
        loading: data ? "Updating Cancellation Plan..." : "Creating Cancellation Plan...",
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

  const addCancellationTier = () => {
    setCancellationTiers([...cancellationTiers, { percentage: "", days: 0, lessThan: true }]);
  };

  const removeCancellationTier = (index: number) => {
    setCancellationTiers(cancellationTiers.filter((_, i) => i !== index));
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>
            Cancellation Tiers <span className="text-red-500">*</span>
          </Label>
          <Button type="button" size="sm" onClick={addCancellationTier} className="flex items-center gap-2">
            <HiPlus size={16} />
            Add Tier
          </Button>
        </div>
        {errors.cancellationTiers && (
          <p className="mb-2 text-sm text-red-500">{errors.cancellationTiers}</p>
        )}

        {cancellationTiers.map((tier, index) => {
          const percentageError = errors[`tier-${index}-percentage` as keyof typeof errors];
          const daysError = errors[`tier-${index}-days` as keyof typeof errors];

          return (
            <div
              key={index}
              className="mb-4 rounded-lg border border-gray-200 p-4 bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tier {index + 1}
                </span>
                {cancellationTiers.length > 1 && (
                  <Button type="button" size="sm" color="failure" onClick={() => removeCancellationTier(index)}>
                    <HiTrash size={16} />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor={`percentage-${index}`}>
                    Refund Percentage <span className="text-red-500">*</span>
                  </Label>
                  <TextInput
                    id={`percentage-${index}`}
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => updateCancellationTier(index, "percentage", e.target.value)}
                    placeholder="0.00"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    color={percentageError ? "failure" : undefined}
                  />
                  {percentageError && (
                    <p className="mt-1 text-xs text-red-500">{percentageError}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor={`days-${index}`}>
                    Days <span className="text-red-500">*</span>
                  </Label>
                  <TextInput
                    id={`days-${index}`}
                    type="number"
                    value={tier.days}
                    onChange={(e) => updateCancellationTier(index, "days", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    required
                    color={daysError ? "failure" : undefined}
                  />
                  {daysError && <p className="mt-1 text-xs text-red-500">{daysError}</p>}
                </div>

                <div>
                  <Label htmlFor={`lessThan-${index}`}>Condition</Label>
                  <Select
                    id={`lessThan-${index}`}
                    value={tier.lessThan.toString()}
                    onChange={(e) => updateCancellationTier(index, "lessThan", e.target.value === "true")}
                  >
                    <option value="true">Less than</option>
                    <option value="false">Greater than or equal</option>
                  </Select>
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {tier.percentage || "0"}% refund if cancelled {tier.lessThan ? "less than" : "greater than or equal to"}{" "}
                {tier.days} days before check-in
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center items-center gap-3">
        <MyButton onClick={handleSubmit} loading={loading}>
          {loading ? (data ? "Updating..." : "Creating...") : "Submit"}
        </MyButton>
        {data?.id && (
          <div onClick={(e) => e.preventDefault()}>
            <DeleteCancellationPlanButton id={data.id} adminScope={adminScope} />
          </div>
        )}
      </div>
    </div>
  );
}
