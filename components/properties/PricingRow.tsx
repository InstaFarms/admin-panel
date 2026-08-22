"use client";

import { Select, TextInput } from "flowbite-react";
import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";

interface PricingRowProps {
  suffix: string;
  title: string;
  className?: string;
  enableFloatingGuests?: boolean;
  maxGuestCount?: number | null;
  /**
   * Currently effective accommodation GST boundary/rates (see
   * apps/if-api/src/routes/tax-configuration.ts). Defaults to today's
   * 5%/18%/₹7,500 if the parent hasn't fetched a policy yet.
   */
  gstPolicy?: { boundary: number; lower: number; higher: number };

  // Hook values and setters
  price?: number | null;
  setPrice?: (value: number | null) => void;
  adultExtraGuestCharge?: number | null;
  setAdultExtraGuestCharge?: (value: number | null) => void;
  childExtraGuestCharge?: number | null;
  setChildExtraGuestCharge?: (value: number | null) => void;
  infantExtraGuestCharge?: number | null;
  setInfantExtraGuestCharge?: (value: number | null) => void;
  floatingAdultExtraGuestCharge?: number | null;
  setFloatingAdultExtraGuestCharge?: (value: number | null) => void;
  floatingChildExtraGuestCharge?: number | null;
  setFloatingChildExtraGuestCharge?: (value: number | null) => void;
  floatingInfantExtraGuestCharge?: number | null;
  setFloatingInfantExtraGuestCharge?: (value: number | null) => void;
  baseGuestCount?: number | null;
  setBaseGuestCount?: (value: number | null) => void;
  discount?: number | null;
  setDiscount?: (value: number | null) => void;
  maxExtraGuestPrice?: number | null;
  setMaxExtraGuestPrice?: (value: number | null) => void;
  maxTotal?: number | null;
  setMaxTotal?: (value: number | null) => void;
  gstSlab?: number | null;
  setGstSlab?: (value: number | null) => void;
}

export default function PricingRow(props: PricingRowProps) {
  const skipMaxExtraGuestPriceFirstRunRef = useRef(true);
  const skipMaxTotalFirstRunRef = useRef(true);

  const {
    suffix,
    title,
    className,
    enableFloatingGuests,
    maxGuestCount,
    gstPolicy = { boundary: 7500, lower: 5, higher: 18 },
    price,
    setPrice,
    adultExtraGuestCharge,
    setAdultExtraGuestCharge,
    childExtraGuestCharge,
    setChildExtraGuestCharge,
    infantExtraGuestCharge,
    setInfantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    setFloatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    setFloatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
    setFloatingInfantExtraGuestCharge,
    baseGuestCount,
    setBaseGuestCount,
    discount,
    setDiscount,
    maxExtraGuestPrice,
    setMaxExtraGuestPrice,
    maxTotal,
    setMaxTotal,
    gstSlab,
    setGstSlab,
  } = props;

  const parseNonNegativeNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return Math.max(0, num);
  };

  // Auto-calculate maxExtraGuestPrice when extra guest charges change
  useEffect(() => {
    if (skipMaxExtraGuestPriceFirstRunRef.current) {
      skipMaxExtraGuestPriceFirstRunRef.current = false;
      return;
    }

    const hasAnyExtraGuestCharge =
      adultExtraGuestCharge != null ||
      childExtraGuestCharge != null ||
      infantExtraGuestCharge != null ||
      floatingAdultExtraGuestCharge != null ||
      floatingChildExtraGuestCharge != null ||
      floatingInfantExtraGuestCharge != null;
    if (!hasAnyExtraGuestCharge) return;

    const adult = adultExtraGuestCharge || 0;
    const child = childExtraGuestCharge || 0;
    const infant = infantExtraGuestCharge || 0;
    const floatingAdult = floatingAdultExtraGuestCharge || 0;
    const floatingChild = floatingChildExtraGuestCharge || 0;
    const floatingInfant = floatingInfantExtraGuestCharge || 0;

    const maxValue = Math.max(adult, child, infant, floatingAdult, floatingChild, floatingInfant);

    if (setMaxExtraGuestPrice && maxValue !== maxExtraGuestPrice) {
      setMaxExtraGuestPrice(maxValue);
    }
  }, [
    adultExtraGuestCharge,
    childExtraGuestCharge,
    infantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
    maxExtraGuestPrice,
  ]);

  // Auto-calculate maxTotal when price, baseGuestCount, and maxGuestCount change
  useEffect(() => {
    if (skipMaxTotalFirstRunRef.current) {
      skipMaxTotalFirstRunRef.current = false;
      return;
    }

    const hasInputsForTotal =
      price != null ||
      baseGuestCount != null ||
      maxGuestCount != null ||
      maxExtraGuestPrice != null;
    if (!hasInputsForTotal) return;

    const basePrice = price || 0;
    const baseCount = baseGuestCount || 0;
    const maxCount = maxGuestCount || 0;
    const maxExtraPrice = maxExtraGuestPrice || 0;

    if (maxCount > 0 && baseCount > 0) {
      const extraGuests = Math.max(0, maxCount - baseCount);
      const calculatedMaxTotal = basePrice + (extraGuests * maxExtraPrice);

      if (setMaxTotal && calculatedMaxTotal !== maxTotal) {
        setMaxTotal(calculatedMaxTotal);
      }
    }
  }, [price, baseGuestCount, maxGuestCount, maxExtraGuestPrice, maxTotal]);

  // Derive the GST slab from the price alone (not maxTotal's speculative
  // max-extra-guest total), every time the price changes — including on
  // initial load, so a stale slab left over from an earlier price never
  // lingers. This only updates local form state; nothing is written to the
  // database until the property is saved.
  useEffect(() => {
    if (price == null) return;

    const suggested = price > gstPolicy.boundary ? gstPolicy.higher : gstPolicy.lower;
    if (suggested !== gstSlab) {
      setGstSlab?.(suggested);
    }
  }, [price, gstPolicy]);

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


  return (
    <div className={`flex ${className || ""}`}>
      <div className="flex w-28 shrink-0 items-center px-2 py-1 text-sm font-medium">{title}</div>
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}Price`,
          name: `${suffix}Price`,
          value: price != null ? String(price) : "",
          onChange: (e) => setPrice?.(parseNonNegativeNumber(e.target.value)),
          placeholder: "Price",
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}AdultExtraGuestCharge`,
          name: `${suffix}AdultExtraGuestCharge`,
          value: adultExtraGuestCharge != null ? String(adultExtraGuestCharge) : "",
          onChange: (e) => setAdultExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
          placeholder: "Adult",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
        {renderNumberInput({
          id: `${suffix}ChildExtraGuestCharge`,
          name: `${suffix}ChildExtraGuestCharge`,
          value: childExtraGuestCharge != null ? String(childExtraGuestCharge) : "",
          onChange: (e) => setChildExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
          placeholder: "Child",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
        {renderNumberInput({
          id: `${suffix}InfantExtraGuestCharge`,
          name: `${suffix}InfantExtraGuestCharge`,
          value: infantExtraGuestCharge != null ? String(infantExtraGuestCharge) : "",
          onChange: (e) => setInfantExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
          placeholder: "Infant",
          suffix: "₹",
          className: "flex-1 min-w-0",
        })}
      </div>
      {enableFloatingGuests && (
        <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
          {renderNumberInput({
            id: `${suffix}FloatingAdultExtraGuestCharge`,
            name: `${suffix}FloatingAdultExtraGuestCharge`,
            value: floatingAdultExtraGuestCharge != null ? String(floatingAdultExtraGuestCharge) : "",
            onChange: (e) => setFloatingAdultExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
            placeholder: "Adult",
            suffix: "₹",
            className: "flex-1 min-w-0",
          })}
          {renderNumberInput({
            id: `${suffix}FloatingChildExtraGuestCharge`,
            name: `${suffix}FloatingChildExtraGuestCharge`,
            value: floatingChildExtraGuestCharge != null ? String(floatingChildExtraGuestCharge) : "",
            onChange: (e) => setFloatingChildExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
            placeholder: "Child",
            suffix: "₹",
            className: "flex-1 min-w-0",
          })}
          {renderNumberInput({
            id: `${suffix}FloatingInfantExtraGuestCharge`,
            name: `${suffix}FloatingInfantExtraGuestCharge`,
            value: floatingInfantExtraGuestCharge != null ? String(floatingInfantExtraGuestCharge) : "",
            onChange: (e) => setFloatingInfantExtraGuestCharge?.(parseNonNegativeNumber(e.target.value)),
            placeholder: "Infant",
            suffix: "₹",
            className: "flex-1 min-w-0",
          })}
        </div>
      )}
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}BaseGuestCount`,
          name: `${suffix}BaseGuestCount`,
          value: baseGuestCount != null ? String(baseGuestCount) : "",
          onChange: (e) => setBaseGuestCount?.(parseNonNegativeNumber(e.target.value)),
          max: maxGuestCount || undefined,
          placeholder: "Count",
          className: "w-full",
        })}
      </div>
      <div className="w-32 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}Discount`,
          name: `${suffix}Discount`,
          value: discount != null ? String(discount) : "",
          onChange: (e) => setDiscount?.(parseNonNegativeNumber(e.target.value)),
          placeholder: "Discount",
          suffix: "%",
          className: "w-full",
        })}
      </div>
      <div className="w-40 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}MaxExtraGuestPrice`,
          name: `${suffix}MaxExtraGuestPrice`,
          value: maxExtraGuestPrice != null ? String(maxExtraGuestPrice) : "",
          placeholder: "Auto",
          readOnly: true,
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="w-36 shrink-0 px-2 py-1">
        {renderNumberInput({
          id: `${suffix}MaxTotal`,
          name: `${suffix}MaxTotal`,
          value: maxTotal != null ? String(maxTotal) : "",
          placeholder: "Auto",
          readOnly: true,
          suffix: "₹",
          className: "w-full",
        })}
      </div>
      <div className="w-28 shrink-0 px-2 py-1">
        <Select
          id={`${suffix}GSTslab`}
          name={`${suffix}GSTslab`}
          value={gstSlab != null ? String(gstSlab) : ""}
          onChange={(e) =>
            setGstSlab?.(e.target.value === "" ? null : Number(e.target.value))
          }
          className="w-full"
        >
          <option value="">Select</option>
          <option value={String(gstPolicy.lower)}>{gstPolicy.lower}%</option>
          <option value={String(gstPolicy.higher)}>{gstPolicy.higher}%</option>
        </Select>
      </div>
    </div>
  );
}


