"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { TabItem, Tabs } from "flowbite-react";
import { useRouter } from "next/navigation";

import { createCoupon, editCoupon } from "@/actions/couponActions";
import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import CouponApplicableDays from "@/components/coupons/CouponApplicableDays";
import CouponDiscountType from "@/components/coupons/CouponDiscountType";
import CouponDiscountValue from "@/components/coupons/CouponDiscountValue";
import CouponMaxDiscount from "@/components/coupons/CouponMaxDiscount";
import CouponMinOrderValue from "@/components/coupons/CouponMinOrderValue";
import CouponNameCode from "@/components/coupons/CouponNameCode";
import CouponNewUsersOnly from "@/components/coupons/CouponNewUsersOnly";
import CouponStatus from "@/components/coupons/CouponStatus";
import CouponSubmit from "@/components/coupons/CouponSubmit";
import CouponValidity from "@/components/coupons/CouponValidity";
import EntityApplicabilitySelector from "@/components/common/EntityApplicabilitySelector";
import { DAYS_OF_WEEK, type DiscountType } from "@/constants/coupons";
import { useCouponForm } from "@/hooks/useCouponForm";
import type { Coupon } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";

interface CouponEditorProps {
  data?: Coupon;
  brandId?: string;
  brandName?: string;
  title?: string;
}

export default function CouponEditor({
  data,
  brandId: initialBrandId,
  brandName: initialBrandName,
  title,
}: CouponEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();

  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [applicableDays, setApplicableDays] = useState<string[]>([
    ...DAYS_OF_WEEK,
  ]);
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [appliesToAllEntities, setAppliesToAllEntities] = useState(true);
  const [preloadedEntities, setPreloadedEntities] = useState<any[]>([]);
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [newUsersOnly, setNewUsersOnly] = useState(false);
  const [brandId, setBrandId] = useState(data?.brandId || initialBrandId || "");
  const [brandName] = useState(initialBrandName || "");

  const [discountPercentage, setDiscountPercentage] = useState(
    data?.discountPercentage?.toString() ?? "",
  );
  const [flatDiscount, setFlatDiscount] = useState(
    data?.flatDiscount?.toString() ?? "",
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    data?.maxDiscountAmount?.toString() ?? "",
  );

  const isEdit = Boolean(data);
  const { errors, validateAll, clearFieldError } = useCouponForm(isEdit);

  useEffect(() => {
    startTransition(() => {
      getAllPropertiesForSelector(brandName || undefined).then((res) => {
        if (!res.data) return;

        setPreloadedEntities(res.data);

        if (data) {
          if (data.validFrom) {
            setValidFrom(new Date(data.validFrom).toISOString().slice(0, 10));
          }
          if (data.validUntil) {
            setValidUntil(new Date(data.validUntil).toISOString().slice(0, 10));
          }

          setDiscountType(data.discountPercentage ? "percentage" : "flat");
          setIsActive(data.isActive ?? true);
          setApplicableDays(
            data.applicableDays?.length
              ? data.applicableDays
              : [...DAYS_OF_WEEK],
          );
          setMinOrderValue(data.minOrderValue?.toString() ?? "0");
          setNewUsersOnly(data.newUsersOnly ?? false);
          if (data.brandId) setBrandId(data.brandId);

          if (data.entityIds && data.entityIds.length > 0) {
            setEntityIds(data.entityIds);
            setAppliesToAllEntities(false);
          } else {
            setEntityIds(res.data.map((e) => e.id));
            setAppliesToAllEntities(true);
          }
        } else {
          setEntityIds(res.data.map((e) => e.id));
          setAppliesToAllEntities(true);
        }
      });
    });
  }, [brandName, data, startTransition]);

  const handleSubmit = (formData: FormData) => {
    const isValid = validateAll({
      name: formData.get("name")?.toString() ?? "",
      code: formData.get("code")?.toString() ?? "",
      discountType,
      discountPercentage,
      flatDiscount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      applicableDays,
      minOrderValue,
      newUsersOnly,
      appliesToAllEntities,
      entityIds,
      brandId,
    });

    if (!isValid) {
      const errorMsg =
        Object.values(errors).find(Boolean) ||
        "Please fix the errors before submitting.";
      toast.error(errorMsg as string);
      return;
    }

    formData.append("applicableDays", JSON.stringify(applicableDays));
    formData.append("isActive", isActive.toString());
    formData.append("discountType", discountType);
    formData.append("minOrderValue", minOrderValue);
    formData.append("newUsersOnly", newUsersOnly.toString());
    formData.append("brandId", brandId);

    const resolvedEntityIds =
      appliesToAllEntities && entityIds.length === preloadedEntities.length
        ? []
        : entityIds;
    formData.append("entityIds", JSON.stringify(resolvedEntityIds));

    startTransition(() => {
      const promise: Promise<string> = data
        ? parseServerActionResult(editCoupon.bind(null, data.id)(formData))
        : parseServerActionResult(createCoupon(formData));

      toast.promise(promise, {
        loading: data ? "Updating coupon..." : "Creating coupon...",
        success: (msg) => {
          const redirectPath =
            brandName === "Instafarms"
              ? "/admin/instafarms-coupons"
              : brandName === "Mago"
                ? "/admin/mago-coupons"
                : "/admin/coupons";
          router.push(redirectPath);
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  // Native HTML5 constraint validation (required/min/max on the raw <input>s)
  // runs before React's `action` handler and blocks the submit event entirely
  // on failure — no handler call, no toast, nothing. That's what made the
  // validFrom min-date issue look like "submit does nothing"; this is a
  // backstop so any future case like it surfaces a message instead of silence.
  const handleInvalid = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const field = e.target as unknown as HTMLInputElement;
    const label =
      document.querySelector(`label[for="${field.id}"]`)?.textContent?.replace("*", "").trim() ||
      field.name ||
      "A field";
    toast.error(`${label}: ${field.validationMessage || "invalid value"}`);
  };

  return (
    <form
      action={handleSubmit}
      onInvalidCapture={handleInvalid}
      className="mx-auto flex w-full max-w-5xl flex-col gap-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          {title ? (
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CouponSubmit loading={loading} couponId={data?.id} />
        </div>
      </div>

      <Tabs variant="underline" className="text-black dark:text-white">
        <TabItem active title="Offer Details">
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 md:p-5">
              <CouponNameCode
                defaultName={data?.name}
                defaultCode={data?.code}
                couponId={data?.id}
                brandId={brandId}
                nameError={errors.name}
                codeError={errors.code}
                onNameChange={() => clearFieldError("name")}
                onCodeChange={() => clearFieldError("code")}
              />

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <CouponValidity
                  validFrom={validFrom}
                  setValidFrom={(v) => {
                    setValidFrom(v);
                    clearFieldError("validFrom");
                  }}
                  validUntil={validUntil}
                  setValidUntil={(v) => {
                    setValidUntil(v);
                    clearFieldError("validUntil");
                  }}
                  validFromError={errors.validFrom}
                  validUntilError={errors.validUntil}
                  isEdit={isEdit}
                />
                <CouponMinOrderValue
                  minOrderValue={minOrderValue}
                  setMinOrderValue={(v) => {
                    setMinOrderValue(v);
                    clearFieldError("minOrderValue");
                  }}
                  error={errors.minOrderValue}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <CouponDiscountType
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                />
                <CouponDiscountValue
                  discountType={discountType}
                  defaultPercentage={data?.discountPercentage ?? undefined}
                  defaultFlat={data?.flatDiscount?.toString()}
                  onPercentageChange={(v: string) => {
                    setDiscountPercentage(v);
                    clearFieldError("discountPercentage");
                  }}
                  onFlatChange={(v: string) => {
                    setFlatDiscount(v);
                    clearFieldError("flatDiscount");
                  }}
                  percentageError={errors.discountPercentage}
                  flatError={errors.flatDiscount}
                />
                <CouponMaxDiscount
                  discountType={discountType}
                  defaultMaxDiscount={data?.maxDiscountAmount?.toString()}
                  onChange={(v: string) => {
                    setMaxDiscountAmount(v);
                    clearFieldError("maxDiscountAmount");
                  }}
                  error={errors.maxDiscountAmount}
                />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CouponNewUsersOnly
                newUsersOnly={newUsersOnly}
                setNewUsersOnly={setNewUsersOnly}
              />
              <CouponStatus isActive={isActive} setIsActive={setIsActive} />
            </div>

            <CouponApplicableDays
              applicableDays={applicableDays}
              daysOfWeek={[...DAYS_OF_WEEK]}
              setApplicableDays={(v) => {
                setApplicableDays(v);
                clearFieldError("applicableDays");
              }}
              error={errors.applicableDays}
            />
          </div>
        </TabItem>

        <TabItem title="Properties">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 md:p-5">
            <EntityApplicabilitySelector
              appliesToAllEntities={appliesToAllEntities}
              setAppliesToAllEntities={setAppliesToAllEntities}
              entityIds={entityIds}
              setEntityIds={(v) => {
                setEntityIds(v);
                clearFieldError("entityIds");
              }}
              preloadedEntities={preloadedEntities}
              startTransition={startTransition}
              error={errors.entityIds}
              brandId={brandId}
            />
          </div>
        </TabItem>
      </Tabs>
    </form>
  );
}
