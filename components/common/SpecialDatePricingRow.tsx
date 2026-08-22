"use client";

import { SpecialDateData } from "@/utils/types";
import { Button, Select, TextInput } from "flowbite-react";
import { DateTime } from "luxon";
import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { HiMinus, HiPlus } from "react-icons/hi";

interface SpecialDatePricingRowProps {
  data: SpecialDateData;
  setData: (d: SpecialDateData) => boolean | void;
  className?: string;
  showPlusButton: boolean;
  addSpecialDate: () => void;
  removeSpecialDate: () => void;
  maxGuestCount?: number | null;
  /**
   * Currently effective accommodation GST boundary/rates (see
   * apps/if-api/src/routes/tax-configuration.ts). Defaults to today's
   * 5%/18%/₹7,500 if the parent hasn't fetched a policy yet.
   */
  gstPolicy?: { boundary: number; lower: number; higher: number };
}

export default function SpecialDatePricingRow({
  data,
  setData,
  className,
  showPlusButton,
  addSpecialDate,
  removeSpecialDate,
  maxGuestCount,
  gstPolicy = { boundary: 7500, lower: 5, higher: 18 },
}: SpecialDatePricingRowProps) {
  const unitBadgeClass =
    "pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-gray-500 dark:text-gray-300";

  const renderNumberInput = ({
    id,
    name,
    value,
    onChange,
    placeholder,
    readOnly,
    max,
    min,
    suffix,
    className,
  }: {
    id: string;
    name?: string;
    value: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    readOnly?: boolean;
    max?: number;
    min?: number | string;
    suffix?: "₹" | "%";
    className?: string;
  }) => (
    <div className={`relative ${className || ""}`}>
      <TextInput
        type="number"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        max={max}
        min={min}
        className={`[&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none [&_input]:[appearance:textfield]${suffix ? " [&_input]:pr-6" : ""}`}
      />
      {suffix ? <span className={unitBadgeClass}>{suffix}</span> : null}
    </div>
  );

  // Use ref to track the last valid date to prevent Datepicker from resetting
  const dateRef = useRef<string | null>(data.date || null);

  // Update ref when data.date changes (but only if it's a valid date)
  useEffect(() => {
    if (data.date) {
      dateRef.current = data.date;
    }
  }, [data.date]);

  // Ensure date is always valid, use ref as fallback to prevent reset
  const dateToUse = data.date || dateRef.current || DateTime.now().toFormat("yyyy-LL-dd");

  // Auto-calculate maxExtraGuestPrice
  useEffect(() => {
    const ownerDiscount = data.discount ?? 0;
    const extraGuestPriceAdult = data.adultExtraGuestCharge ?? 0;
    const maxGuests = maxGuestCount ?? 0;
    const baseGuests = data.baseGuestCount ?? 0;

    if (extraGuestPriceAdult === 0 || maxGuests === 0 || baseGuests === 0) {
      // If any required field is missing, set to null
      if (data.maxExtraGuestPrice !== null) {
        setData({ ...data, maxExtraGuestPrice: null });
      }
      return;
    }

    const discountMultiplier = 1 - (ownerDiscount / 100);
    const discountedExtraAdultCharge = extraGuestPriceAdult * discountMultiplier;
    const maxExtraGuests = maxGuests - baseGuests;
    const calculated = Math.round(maxExtraGuests * discountedExtraAdultCharge);

    if (data.maxExtraGuestPrice !== calculated) {
      setData({ ...data, maxExtraGuestPrice: calculated });
    }
  }, [data, maxGuestCount, setData]);

  // Auto-calculate maxTotal
  useEffect(() => {
    const basePrice = data.price ?? 0;
    const ownerDiscount = data.discount ?? 0;
    const maxExtraGuestPrice = data.maxExtraGuestPrice ?? 0;

    if (basePrice === 0) {
      if (data.maxTotal !== null) {
        setData({ ...data, maxTotal: null });
      }
      return;
    }

    const discountMultiplier = 1 - (ownerDiscount / 100);
    const discountedBasePrice = basePrice * discountMultiplier;
    const calculated = Math.round(discountedBasePrice + maxExtraGuestPrice);

    if (data.maxTotal !== calculated) {
      setData({ ...data, maxTotal: calculated });
    }
  }, [data, setData]);

  // Suggest a GST slab from the price alone when nothing has been chosen
  // yet. Was `maxTotal > 7500 ? 18 : 12` -- the 12 was a bug (should be the
  // same lower rate the day-wise pricing table uses, not a separate band),
  // and using maxTotal (a speculative max-extra-guest total) instead of the
  // price itself made the auto-suggest depend on guest-count fields that are
  // often unset. Never overwrites a value the admin already picked.
  useEffect(() => {
    if (data.gstSlab != null || data.price == null) return;
    const suggested =
      data.price > gstPolicy.boundary ? gstPolicy.higher : gstPolicy.lower;
    setData({ ...data, gstSlab: suggested });
  }, [data, setData, gstPolicy]);

  return (
    <div className={`flex ${className || ""}`}>
      <div className="w-44 shrink-0 px-2 py-1">
        <input
          type="date"
          id={`special-date-${data.id}`}
          name={`special-date-${data.id}`}
          value={dateToUse}
          onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
          onChange={(e) => {
            if (e.target.value) {
              setData({ ...data, date: e.target.value });
            }
          }}
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-cyan-500 dark:focus:ring-cyan-500"
        />
      </div>
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `special-price-${data.id}`,
          name: `special-price-${data.id}`,
          value: data.price != null ? String(data.price) : "",
          onChange: (e) =>
            setData({ ...data, price: e.target.value ? parseFloat(e.target.value) : null }),
          placeholder: "Price",
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderNumberInput({
          id: `special-adultExtraGuestCharge-${data.id}`,
          name: `special-adultExtraGuestCharge-${data.id}`,
          value: data.adultExtraGuestCharge != null ? String(data.adultExtraGuestCharge) : "",
          onChange: (e) =>
            setData({ ...data, adultExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }),
          placeholder: "Adult",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
        {renderNumberInput({
          id: `special-childExtraGuestCharge-${data.id}`,
          name: `special-childExtraGuestCharge-${data.id}`,
          value: data.childExtraGuestCharge != null ? String(data.childExtraGuestCharge) : "",
          onChange: (e) =>
            setData({ ...data, childExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }),
          placeholder: "Child",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
        {renderNumberInput({
          id: `special-infantExtraGuestCharge-${data.id}`,
          name: `special-infantExtraGuestCharge-${data.id}`,
          value: data.infantExtraGuestCharge != null ? String(data.infantExtraGuestCharge) : "",
          onChange: (e) =>
            setData({ ...data, infantExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }),
          placeholder: "Infant",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
      </div>
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `special-baseGuestCount-${data.id}`,
          name: `special-baseGuestCount-${data.id}`,
          value: data.baseGuestCount != null ? String(data.baseGuestCount) : "",
          onChange: (e) => setData({ ...data, baseGuestCount: e.target.value ? parseFloat(e.target.value) : null }),
          max: maxGuestCount || undefined,
          placeholder: "Count",
          min: "0",
          className: "w-full",
        })}
      </div>
      <div className="w-32 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `special-discount-${data.id}`,
          name: `special-discount-${data.id}`,
          value: data.discount != null ? String(data.discount) : "",
          onChange: (e) =>
            setData({ ...data, discount: e.target.value ? parseFloat(e.target.value) : null }),
          placeholder: "Discount",
          suffix: "%",
          className: "w-full",
        })}
      </div>
      <div className="w-40 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `special-maxExtraGuestPrice-${data.id}`,
          name: `special-maxExtraGuestPrice-${data.id}`,
          value: data.maxExtraGuestPrice != null ? String(data.maxExtraGuestPrice) : "",
          readOnly: true,
          placeholder: "Auto",
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `special-maxTotal-${data.id}`,
          name: `special-maxTotal-${data.id}`,
          value: data.maxTotal != null ? String(data.maxTotal) : "",
          readOnly: true,
          placeholder: "Auto",
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="w-28 shrink-0 px-2 py-1">
        <Select
          id={`special-gstSlab-${data.id}`}
          name={`special-gstSlab-${data.id}`}
          value={data.gstSlab != null ? String(data.gstSlab) : ""}
          onChange={(e) =>
            setData({
              ...data,
              gstSlab: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="w-full"
        >
          <option value="">Select</option>
          <option value={String(gstPolicy.lower)}>{gstPolicy.lower}%</option>
          <option value={String(gstPolicy.higher)}>{gstPolicy.higher}%</option>
        </Select>
      </div>
      <div className="flex w-24 shrink-0 items-center justify-center gap-2 p-1">
        <Button className="bg-primary-500 aspect-square p-2" onClick={removeSpecialDate}>
          <HiMinus />
        </Button>
        {showPlusButton && (
          <Button className="bg-primary-500 aspect-square p-2" onClick={addSpecialDate}>
            <HiPlus />
          </Button>
        )}
      </div>
    </div>
  );
}


