"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Button,
  Label,
  Select,
  TabItem,
  Tabs,
  TextInput,
} from "flowbite-react";
import { useRouter } from "next/navigation";

import {
  createLastMinuteDiscountPlan,
  editLastMinuteDiscountPlan,
} from "@/actions/lastMinuteDiscountPlanActions";
import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import MyButton from "@/components/MyButton";
import EntityApplicabilitySelector from "@/components/common/EntityApplicabilitySelector";
import DeleteLastMinuteDiscountPlanButton from "@/components/last-minute-discount-plans/DeleteLastMinuteDiscountPlanButton";
import type { EntityData } from "@/components/MultiEntitySelector";
import {
  LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH,
  PLAN_BRAND_APP_TYPE,
  type PlanBrandScope,
} from "@/constants/planBrandScope";
import { HiPlus, HiTrash } from "@/constants/last-minute-discount-plans";
import { useLastMinuteDiscountPlanForm } from "@/hooks/useLastMinuteDiscountPlanForm";
import type {
  LastMinuteDiscountPlanValue,
  LastMinuteDiscountPlanWithValues,
} from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";

interface LastMinuteDiscountPlanEditorProps {
  data?: LastMinuteDiscountPlanWithValues;
  adminScope?: PlanBrandScope;
  title?: string;
}

export default function LastMinuteDiscountPlanEditor({
  data,
  adminScope = "instafarms",
  title,
}: LastMinuteDiscountPlanEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const listPath = LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[adminScope];
  const appType = PLAN_BRAND_APP_TYPE[adminScope];
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [appliesToAllProperties, setAppliesToAllProperties] = useState(true);
  const [preloadedProperties, setPreloadedProperties] = useState<EntityData[]>(
    [],
  );

  useEffect(() => {
    startTransition(() => {
      getAllPropertiesForSelector(undefined, appType).then((result) => {
        if (!result.data) return;

        const properties = result.data as EntityData[];
        setPreloadedProperties(properties);

        if (data?.propertyIds && data.propertyIds.length > 0) {
          setPropertyIds(data.propertyIds);
          setAppliesToAllProperties(false);
        } else {
          setPropertyIds(properties.map((property) => property.id));
          setAppliesToAllProperties(true);
        }
      });
    });
  }, [appType, data?.propertyIds, startTransition]);

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
  } = useLastMinuteDiscountPlanForm({
    name: data?.name,
    isActive: data?.isActive,
    discountTiers:
      data?.values && data.values.length > 0
        ? data.values.map((value: LastMinuteDiscountPlanValue) => ({
            thresholdDays: value.thresholdDays,
            discountType: value.flatDiscount != null ? "flat" : "percentage",
            discountPercentage: value.discountPercentage?.toString() || "",
            flatDiscount: value.flatDiscount?.toString() || "",
            maxDiscountAmount: value.maxDiscountAmount?.toString() || "0",
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
      formData.append("thresholdDays", tier.thresholdDays.toString());
      formData.append("discountPercentage", tier.discountPercentage);
      formData.append("flatDiscount", tier.flatDiscount);
      formData.append("maxDiscountAmount", tier.maxDiscountAmount || "0");
    });
    const resolvedPropertyIds = appliesToAllProperties ? [] : propertyIds;
    formData.set("propertyIds", JSON.stringify(resolvedPropertyIds));

    startTransition(() => {
      const promise = data
        ? parseServerActionResult(editLastMinuteDiscountPlan(data.id, formData))
        : parseServerActionResult(createLastMinuteDiscountPlan(formData));

      toast.promise(promise, {
        loading: data
          ? "Updating Last Minute Discount Plan..."
          : "Creating Last Minute Discount Plan...",
        success: (message) => {
          if (!data) router.push(listPath);
          return message;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const addDiscountTier = () => {
    setDiscountTiers([
      ...discountTiers,
      {
        thresholdDays: 1,
        discountType: "percentage",
        discountPercentage: "",
        flatDiscount: "",
        maxDiscountAmount: "0",
      },
    ]);
  };

  const removeDiscountTier = (index: number) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {title ? (
          <h6 className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h6>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <MyButton onClick={handleSubmit} loading={loading}>
            {loading ? (data ? "Updating..." : "Creating...") : "Submit"}
          </MyButton>
          {data?.id && (
            <div onClick={(event) => event.preventDefault()}>
              <DeleteLastMinuteDiscountPlanButton
                id={data.id}
                adminScope={adminScope}
              />
            </div>
          )}
        </div>
      </div>

      <Tabs variant="underline" className="text-black dark:text-white">
        <TabItem active title="Offer Details">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                  onChange={(event) => setName(event.target.value)}
                  color={errors.name ? "failure" : undefined}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="isActive">Status</Label>
                </div>
                <Select
                  id="isActive"
                  value={isActive.toString()}
                  onChange={(event) =>
                    setIsActive(event.target.value === "true")
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
            </div>

            <div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-base font-semibold">
                  Last Minute Discount Tiers{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={addDiscountTier}
                  className="flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <HiPlus size={16} />
                  <span className="hidden sm:inline">Add Tier</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              {errors.discountTiers && (
                <p className="mb-2 text-sm text-red-500">
                  {errors.discountTiers}
                </p>
              )}

              <div className="space-y-4">
                {discountTiers.map((tier, index) => {
                  const thresholdDaysError =
                    errors[
                      `tier-${index}-thresholdDays` as keyof typeof errors
                    ];
                  const discountPercentageError =
                    errors[
                      `tier-${index}-discountPercentage` as keyof typeof errors
                    ];
                  const flatDiscountError =
                    errors[`tier-${index}-flatDiscount` as keyof typeof errors];
                  const maxDiscountAmountError =
                    errors[
                      `tier-${index}-maxDiscountAmount` as keyof typeof errors
                    ];

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label
                            htmlFor={`thresholdDays-${index}`}
                            className="text-sm"
                          >
                            Threshold Days{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <TextInput
                            id={`thresholdDays-${index}`}
                            type="number"
                            value={tier.thresholdDays}
                            onChange={(event) =>
                              updateDiscountTier(
                                index,
                                "thresholdDays",
                                parseInt(event.target.value, 10) || 0,
                              )
                            }
                            placeholder="e.g. 3"
                            min="1"
                            required
                            sizing="sm"
                            color={thresholdDaysError ? "failure" : undefined}
                          />
                          {thresholdDaysError && (
                            <p className="mt-1 text-xs text-red-500">
                              {thresholdDaysError}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label
                            htmlFor={`discountType-${index}`}
                            className="text-sm"
                          >
                            Discount Type{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            id={`discountType-${index}`}
                            value={tier.discountType}
                            onChange={(event) =>
                              setDiscountTypeExclusive(
                                index,
                                event.target.value as "percentage" | "flat",
                              )
                            }
                            sizing="sm"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="flat">Flat Amount</option>
                          </Select>
                        </div>

                        <div>
                          {tier.discountType === "percentage" ? (
                            <>
                              <Label
                                htmlFor={`discountPercentage-${index}`}
                                className="text-sm"
                              >
                                Discount %{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <TextInput
                                id={`discountPercentage-${index}`}
                                type="number"
                                value={tier.discountPercentage}
                                onChange={(event) =>
                                  setDiscountTypeExclusive(
                                    index,
                                    "percentage",
                                    event.target.value,
                                  )
                                }
                                placeholder="e.g. 10"
                                min="0"
                                max="100"
                                step="0.01"
                                sizing="sm"
                                color={
                                  discountPercentageError
                                    ? "failure"
                                    : undefined
                                }
                              />
                              {discountPercentageError && (
                                <p className="mt-1 text-xs text-red-500">
                                  {discountPercentageError}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <Label
                                htmlFor={`flatDiscount-${index}`}
                                className="text-sm"
                              >
                                Flat Discount (INR){" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <TextInput
                                id={`flatDiscount-${index}`}
                                type="number"
                                value={tier.flatDiscount}
                                onChange={(event) =>
                                  setDiscountTypeExclusive(
                                    index,
                                    "flat",
                                    event.target.value,
                                  )
                                }
                                placeholder="e.g. 500"
                                min="0"
                                sizing="sm"
                                color={
                                  flatDiscountError ? "failure" : undefined
                                }
                              />
                              {flatDiscountError && (
                                <p className="mt-1 text-xs text-red-500">
                                  {flatDiscountError}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div>
                          <Label
                            htmlFor={`maxDiscountAmount-${index}`}
                            className="text-sm"
                          >
                            Max Discount (INR)
                          </Label>
                          <TextInput
                            id={`maxDiscountAmount-${index}`}
                            type="number"
                            value={tier.maxDiscountAmount}
                            onChange={(event) =>
                              updateDiscountTier(
                                index,
                                "maxDiscountAmount",
                                event.target.value,
                              )
                            }
                            placeholder="0"
                            min="0"
                            sizing="sm"
                            disabled={tier.discountType === "flat"}
                            color={
                              maxDiscountAmountError ? "failure" : undefined
                            }
                          />
                          {maxDiscountAmountError && (
                            <p className="mt-1 text-xs text-red-500">
                              {maxDiscountAmountError}
                            </p>
                          )}
                        </div>
                      </div>

                      {tier.discountType === "percentage" &&
                        !tier.discountPercentage && (
                          <p className="mt-2 text-xs text-gray-500">
                            Enter the percentage discount for this tier.
                          </p>
                        )}
                      {tier.discountType === "flat" && !tier.flatDiscount && (
                        <p className="mt-2 text-xs text-gray-500">
                          Enter the flat amount discount for this tier.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabItem>

        <TabItem title="Properties">
          <EntityApplicabilitySelector
            title="Applicable Properties"
            appliesToAllEntities={appliesToAllProperties}
            setAppliesToAllEntities={setAppliesToAllProperties}
            entityIds={propertyIds}
            setEntityIds={setPropertyIds}
            preloadedEntities={preloadedProperties}
            startTransition={startTransition}
            appType={appType}
            allowExclusions={false}
          />
        </TabItem>
      </Tabs>
    </div>
  );
}
