"use client";

import { SpecialDateData } from "@/utils/types";
import { Datepicker, TextInput } from "flowbite-react";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef } from "react";
import type { ChangeEvent } from "react";

interface SpecialDatePricingWithGSTRowProps {
  data: SpecialDateData;
  setData: (d: SpecialDateData) => boolean | void;
  className?: string;
}

export default function SpecialDatePricingWithGSTRow({
  data,
  setData,
  className,
}: SpecialDatePricingWithGSTRowProps) {
  const skipPersistWithGstFirstRunRef = useRef(true);

  const renderInput = ({
    id,
    value,
    placeholder,
    readOnly = true,
    onChange,
    suffix,
    className,
    name,
  }: {
    id?: string;
    value: string;
    placeholder?: string;
    readOnly?: boolean;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    suffix?: "₹" | "%";
    className?: string;
    name?: string;
  }) => (
    <div className={`relative ${className || ""}`}>
      <TextInput
        className={`[&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none [&_input]:[appearance:textfield]${suffix ? " [&_input]:pr-6" : ""}`}
        type="number"
        id={id}
        name={name}
        placeholder={placeholder}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-gray-500 dark:text-gray-300">
          {suffix}
        </span>
      ) : null}
    </div>
  );

  // Calculate GST amounts using useMemo for efficiency
  const gstCalculations = useMemo(() => {
    const gstSlab = data.gstSlab || 0;
    const basePrice = data.price || 0;
    const adultPrice = data.adultExtraGuestCharge || 0;
    const childPrice = data.childExtraGuestCharge || 0;
    const infantPrice = data.infantExtraGuestCharge || 0;

    const gstOfBasePrice = gstSlab && basePrice > 0 ? Math.round((basePrice * gstSlab) / 100) : 0;
    const gstOnAdultPrice = gstSlab && adultPrice > 0 ? Math.round((adultPrice * gstSlab) / 100) : 0;
    const gstOnChildPrice = gstSlab && childPrice > 0 ? Math.round((childPrice * gstSlab) / 100) : 0;
    const gstOnInfantPrice = gstSlab && infantPrice > 0 ? Math.round((infantPrice * gstSlab) / 100) : 0;

    const totalBasePrice = basePrice > 0 ? Math.round(basePrice + gstOfBasePrice) : 0;
    const totalAdultPrice = adultPrice > 0 ? Math.round(adultPrice + gstOnAdultPrice) : 0;
    const totalChildPrice = childPrice > 0 ? Math.round(childPrice + gstOnChildPrice) : 0;
    const totalInfantPrice = infantPrice > 0 ? Math.round(infantPrice + gstOnInfantPrice) : 0;

    return {
      totalBasePriceRounded: totalBasePrice > 0 ? Math.round(totalBasePrice) : null,
      totalAdultPriceRounded: totalAdultPrice > 0 ? Math.round(totalAdultPrice) : null,
      totalChildPriceRounded: totalChildPrice > 0 ? Math.round(totalChildPrice) : null,
      totalInfantPriceRounded: totalInfantPrice > 0 ? Math.round(totalInfantPrice) : null,
      gstSlab: gstSlab > 0 ? gstSlab.toString() : "",
      basePrice: basePrice > 0 ? basePrice.toString() : "",
      adultPrice: adultPrice > 0 ? adultPrice.toString() : "",
      childPrice: childPrice > 0 ? childPrice.toString() : "",
      infantPrice: infantPrice > 0 ? infantPrice.toString() : "",
      gstOfBasePrice: gstOfBasePrice > 0 ? gstOfBasePrice.toString() : "",
      gstOnAdultPrice: gstOnAdultPrice > 0 ? gstOnAdultPrice.toString() : "",
      gstOnChildPrice: gstOnChildPrice > 0 ? gstOnChildPrice.toString() : "",
      gstOnInfantPrice: gstOnInfantPrice > 0 ? gstOnInfantPrice.toString() : "",
      totalBasePrice: totalBasePrice > 0 ? totalBasePrice.toString() : "",
      totalAdultPrice: totalAdultPrice > 0 ? totalAdultPrice.toString() : "",
      totalChildPrice: totalChildPrice > 0 ? totalChildPrice.toString() : "",
      totalInfantPrice: totalInfantPrice > 0 ? totalInfantPrice.toString() : "",
    };
  }, [data.gstSlab, data.price, data.adultExtraGuestCharge, data.childExtraGuestCharge, data.infantExtraGuestCharge]);

  useEffect(() => {
    if (skipPersistWithGstFirstRunRef.current) {
      skipPersistWithGstFirstRunRef.current = false;
      return;
    }

    const nextPriceWithGST =
      data.price != null ? gstCalculations.totalBasePriceRounded : null;
    const nextAdultExtraGuestChargeWithGST =
      data.adultExtraGuestCharge != null
        ? gstCalculations.totalAdultPriceRounded
        : null;
    const nextChildExtraGuestChargeWithGST =
      data.childExtraGuestCharge != null
        ? gstCalculations.totalChildPriceRounded
        : null;
    const nextInfantExtraGuestChargeWithGST =
      data.infantExtraGuestCharge != null
        ? gstCalculations.totalInfantPriceRounded
        : null;

    if (
      data.priceWithGST === nextPriceWithGST &&
      data.adultExtraGuestChargeWithGST === nextAdultExtraGuestChargeWithGST &&
      data.childExtraGuestChargeWithGST === nextChildExtraGuestChargeWithGST &&
      data.infantExtraGuestChargeWithGST === nextInfantExtraGuestChargeWithGST
    ) {
      return;
    }

    setData({
      ...data,
      priceWithGST: nextPriceWithGST,
      adultExtraGuestChargeWithGST: nextAdultExtraGuestChargeWithGST,
      childExtraGuestChargeWithGST: nextChildExtraGuestChargeWithGST,
      infantExtraGuestChargeWithGST: nextInfantExtraGuestChargeWithGST,
    });
  }, [
    setData,
    data.id,
    data.date,
    data.price,
    data.priceWithGST,
    data.adultExtraGuestCharge,
    data.adultExtraGuestChargeWithGST,
    data.childExtraGuestCharge,
    data.childExtraGuestChargeWithGST,
    data.infantExtraGuestCharge,
    data.infantExtraGuestChargeWithGST,
    gstCalculations.totalBasePriceRounded,
    gstCalculations.totalAdultPriceRounded,
    gstCalculations.totalChildPriceRounded,
    gstCalculations.totalInfantPriceRounded,
  ]);

  // Ensure date is always valid, fallback to today if missing
  const dt = data.date
    ? DateTime.fromSQL(data.date).toJSDate()
    : DateTime.now().toJSDate();

  return (
    <div className={`flex ${className || ""}`}>
      <div className="w-44 shrink-0 px-2 py-1">
        <Datepicker id={`special-dateGST-${data.id}`} value={dt} readOnly className="w-full" />
      </div>
      <div className="w-28 shrink-0 px-2 py-1">
        {renderInput({ id: `special-gstSlabGST-${data.id}`, placeholder: "GST Slab", readOnly: true, value: gstCalculations.gstSlab, suffix: "%", className: "w-full" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderInput({ id: `special-priceGST-${data.id}`, name: `special-price-${data.id}`, placeholder: "Price", readOnly: false, value: gstCalculations.basePrice, suffix: "₹", className: "flex-1 min-w-0", onChange: (e) => setData({ ...data, price: e.target.value ? parseFloat(e.target.value) : null }) })}
        {renderInput({ placeholder: "GST", readOnly: true, value: gstCalculations.gstOfBasePrice, suffix: "₹", className: "flex-1 min-w-0" })}
        {renderInput({ id: `special-priceWithGST-${data.id}`, name: `special-priceWithGST-${data.id}`, placeholder: "Total", readOnly: true, value: gstCalculations.totalBasePrice, suffix: "₹", className: "flex-1 min-w-0" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderInput({ id: `special-adultExtraGuestChargeGST-${data.id}`, name: `special-adultExtraGuestCharge-${data.id}`, placeholder: "Price", readOnly: false, value: gstCalculations.adultPrice, suffix: "₹", className: "flex-1 min-w-0", onChange: (e) => setData({ ...data, adultExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }) })}
        {renderInput({ placeholder: "GST", readOnly: true, value: gstCalculations.gstOnAdultPrice, suffix: "₹", className: "flex-1 min-w-0" })}
        {renderInput({ id: `special-adultExtraGuestChargeWithGST-${data.id}`, name: `special-adultExtraGuestChargeWithGST-${data.id}`, placeholder: "Total", readOnly: true, value: gstCalculations.totalAdultPrice, suffix: "₹", className: "flex-1 min-w-0" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderInput({ id: `special-childExtraGuestChargeGST-${data.id}`, name: `special-childExtraGuestCharge-${data.id}`, placeholder: "Price", readOnly: false, value: gstCalculations.childPrice, suffix: "₹", className: "flex-1 min-w-0", onChange: (e) => setData({ ...data, childExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }) })}
        {renderInput({ placeholder: "GST", readOnly: true, value: gstCalculations.gstOnChildPrice, suffix: "₹", className: "flex-1 min-w-0" })}
        {renderInput({ id: `special-childExtraGuestChargeWithGST-${data.id}`, name: `special-childExtraGuestChargeWithGST-${data.id}`, placeholder: "Total", readOnly: true, value: gstCalculations.totalChildPrice, suffix: "₹", className: "flex-1 min-w-0" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderInput({ id: `special-infantExtraGuestChargeGST-${data.id}`, name: `special-infantExtraGuestCharge-${data.id}`, placeholder: "Price", readOnly: false, value: gstCalculations.infantPrice, suffix: "₹", className: "flex-1 min-w-0", onChange: (e) => setData({ ...data, infantExtraGuestCharge: e.target.value ? parseFloat(e.target.value) : null }) })}
        {renderInput({ placeholder: "GST", readOnly: true, value: gstCalculations.gstOnInfantPrice, suffix: "₹", className: "flex-1 min-w-0" })}
        {renderInput({ id: `special-infantExtraGuestChargeWithGST-${data.id}`, name: `special-infantExtraGuestChargeWithGST-${data.id}`, placeholder: "Total", readOnly: true, value: gstCalculations.totalInfantPrice, suffix: "₹", className: "flex-1 min-w-0" })}
      </div>
    </div>
  );
}


