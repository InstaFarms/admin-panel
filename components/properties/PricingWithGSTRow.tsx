"use client";

import { TextInput } from "flowbite-react";
import { useEffect, useMemo, useRef } from "react";

interface PricingWithGSTRowProps {
  suffix: string;
  title: string;
  className?: string;
  enableFloatingGuests?: boolean;

  // Hook values (read-only for this component)
  price?: number | null;
  setPrice?: (value: number | null) => void;
  adultExtraGuestCharge?: number | null;
  setAdultExtraGuestCharge?: (value: number | null) => void;
  childExtraGuestCharge?: number | null;
  setChildExtraGuestCharge?: (value: number | null) => void;
  infantExtraGuestCharge?: number | null;
  setInfantExtraGuestCharge?: (value: number | null) => void;
  floatingAdultExtraGuestCharge?: number | null;
  floatingChildExtraGuestCharge?: number | null;
  floatingInfantExtraGuestCharge?: number | null;
  gstSlab?: number | null;

  // Hook-backed with-GST states
  priceWithGST?: number | null;
  setPriceWithGST?: (value: number | null) => void;
  adultExtraGuestChargeWithGST?: number | null;
  setAdultExtraGuestChargeWithGST?: (value: number | null) => void;
  childExtraGuestChargeWithGST?: number | null;
  setChildExtraGuestChargeWithGST?: (value: number | null) => void;
  infantExtraGuestChargeWithGST?: number | null;
  setInfantExtraGuestChargeWithGST?: (value: number | null) => void;
  floatingAdultExtraGuestChargeWithGST?: number | null;
  setFloatingAdultExtraGuestChargeWithGST?: (value: number | null) => void;
  floatingChildExtraGuestChargeWithGST?: number | null;
  setFloatingChildExtraGuestChargeWithGST?: (value: number | null) => void;
  floatingInfantExtraGuestChargeWithGST?: number | null;
  setFloatingInfantExtraGuestChargeWithGST?: (value: number | null) => void;
}

export default function PricingWithGSTRow(props: PricingWithGSTRowProps) {
  const skipPersistWithGstFirstRunRef = useRef(true);

  const {
    suffix,
    title,
    className,
    enableFloatingGuests,
    price,
    adultExtraGuestCharge,
    childExtraGuestCharge,
    infantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
    gstSlab,
    priceWithGST,
    adultExtraGuestChargeWithGST,
    childExtraGuestChargeWithGST,
    infantExtraGuestChargeWithGST,
    floatingAdultExtraGuestChargeWithGST,
    floatingChildExtraGuestChargeWithGST,
    floatingInfantExtraGuestChargeWithGST,
    setPriceWithGST,
    setAdultExtraGuestChargeWithGST,
    setChildExtraGuestChargeWithGST,
    setInfantExtraGuestChargeWithGST,
    setFloatingAdultExtraGuestChargeWithGST,
    setFloatingChildExtraGuestChargeWithGST,
    setFloatingInfantExtraGuestChargeWithGST,
  } = props;

  // Calculate GST values based on hook state
  const calculatedValues = useMemo(() => {
    const basePrice = price || 0;
    const adultPrice = adultExtraGuestCharge || 0;
    const childPrice = childExtraGuestCharge || 0;
    const infantPrice = infantExtraGuestCharge || 0;
    const floatingAdultPrice = floatingAdultExtraGuestCharge || 0;
    const floatingChildPrice = floatingChildExtraGuestCharge || 0;
    const floatingInfantPrice = floatingInfantExtraGuestCharge || 0;
    const gstPercentage = gstSlab || 0;

    // Calculate GST amounts
    const gstOfBasePrice = (basePrice * gstPercentage) / 100;
    const gstOnAdultPrice = (adultPrice * gstPercentage) / 100;
    const gstOnChildPrice = (childPrice * gstPercentage) / 100;
    const gstOnInfantPrice = (infantPrice * gstPercentage) / 100;
    const gstOnFloatingAdultPrice = (floatingAdultPrice * gstPercentage) / 100;
    const gstOnFloatingChildPrice = (floatingChildPrice * gstPercentage) / 100;
    const gstOnFloatingInfantPrice = (floatingInfantPrice * gstPercentage) / 100;

    // Calculate totals (price + GST)
    const totalBasePrice = basePrice + gstOfBasePrice;
    const totalAdultPrice = adultPrice + gstOnAdultPrice;
    const totalChildPrice = childPrice + gstOnChildPrice;
    const totalInfantPrice = infantPrice + gstOnInfantPrice;
    const totalFloatingAdultPrice = floatingAdultPrice + (floatingAdultPrice * gstPercentage) / 100;
    const totalFloatingChildPrice = floatingChildPrice + (floatingChildPrice * gstPercentage) / 100;
    const totalFloatingInfantPrice = floatingInfantPrice + (floatingInfantPrice * gstPercentage) / 100;

    return {
      gstSlab: gstPercentage.toFixed(0),
      totalBasePriceRounded: Math.round(totalBasePrice * 100) / 100,
      totalAdultPriceRounded: Math.round(totalAdultPrice * 100) / 100,
      totalChildPriceRounded: Math.round(totalChildPrice * 100) / 100,
      totalInfantPriceRounded: Math.round(totalInfantPrice * 100) / 100,
      totalFloatingAdultPriceRounded: Math.round(totalFloatingAdultPrice * 100) / 100,
      totalFloatingChildPriceRounded: Math.round(totalFloatingChildPrice * 100) / 100,
      totalFloatingInfantPriceRounded: Math.round(totalFloatingInfantPrice * 100) / 100,
      basePrice: basePrice.toFixed(2),
      adultPrice: adultPrice.toFixed(2),
      childPrice: childPrice.toFixed(2),
      infantPrice: infantPrice.toFixed(2),
      gstOfBasePrice: gstOfBasePrice.toFixed(2),
      gstOnAdultPrice: gstOnAdultPrice.toFixed(2),
      gstOnChildPrice: gstOnChildPrice.toFixed(2),
      gstOnInfantPrice: gstOnInfantPrice.toFixed(2),
      gstOnFloatingAdultPrice: gstOnFloatingAdultPrice.toFixed(2),
      gstOnFloatingChildPrice: gstOnFloatingChildPrice.toFixed(2),
      gstOnFloatingInfantPrice: gstOnFloatingInfantPrice.toFixed(2),
      totalBasePrice: totalBasePrice.toFixed(2),
      totalAdultPrice: totalAdultPrice.toFixed(2),
      totalChildPrice: totalChildPrice.toFixed(2),
      totalInfantPrice: totalInfantPrice.toFixed(2),
      floatingAdultPrice: floatingAdultPrice.toFixed(2),
      floatingChildPrice: floatingChildPrice.toFixed(2),
      floatingInfantPrice: floatingInfantPrice.toFixed(2),
      totalFloatingAdultPrice: totalFloatingAdultPrice.toFixed(2),
      totalFloatingChildPrice: totalFloatingChildPrice.toFixed(2),
      totalFloatingInfantPrice: totalFloatingInfantPrice.toFixed(2),
    };
  }, [
    price,
    adultExtraGuestCharge,
    childExtraGuestCharge,
    infantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
    gstSlab
  ]);

  // Persist computed with-GST totals in draft so backend gets updated values.
  useEffect(() => {
    if (skipPersistWithGstFirstRunRef.current) {
      skipPersistWithGstFirstRunRef.current = false;
      return;
    }

    const hasBasePrice = price != null;
    const hasAdult = adultExtraGuestCharge != null;
    const hasChild = childExtraGuestCharge != null;
    const hasInfant = infantExtraGuestCharge != null;
    const hasFloatingAdult = floatingAdultExtraGuestCharge != null;
    const hasFloatingChild = floatingChildExtraGuestCharge != null;
    const hasFloatingInfant = floatingInfantExtraGuestCharge != null;

    const baseTotal = calculatedValues.totalBasePriceRounded;
    const adultTotal = calculatedValues.totalAdultPriceRounded;
    const childTotal = calculatedValues.totalChildPriceRounded;
    const infantTotal = calculatedValues.totalInfantPriceRounded;

    if (hasBasePrice && setPriceWithGST && priceWithGST !== baseTotal) {
      setPriceWithGST(baseTotal);
    }
    if (hasAdult && setAdultExtraGuestChargeWithGST && adultExtraGuestChargeWithGST !== adultTotal) {
      setAdultExtraGuestChargeWithGST(adultTotal);
    }
    if (hasChild && setChildExtraGuestChargeWithGST && childExtraGuestChargeWithGST !== childTotal) {
      setChildExtraGuestChargeWithGST(childTotal);
    }
    if (hasInfant && setInfantExtraGuestChargeWithGST && infantExtraGuestChargeWithGST !== infantTotal) {
      setInfantExtraGuestChargeWithGST(infantTotal);
    }

    if (enableFloatingGuests) {
      const floatingAdultTotal = calculatedValues.totalFloatingAdultPriceRounded;
      const floatingChildTotal = calculatedValues.totalFloatingChildPriceRounded;
      const floatingInfantTotal = calculatedValues.totalFloatingInfantPriceRounded;

      if (
        hasFloatingAdult &&
        setFloatingAdultExtraGuestChargeWithGST &&
        floatingAdultExtraGuestChargeWithGST !== floatingAdultTotal
      ) {
        setFloatingAdultExtraGuestChargeWithGST(floatingAdultTotal);
      }
      if (
        hasFloatingChild &&
        setFloatingChildExtraGuestChargeWithGST &&
        floatingChildExtraGuestChargeWithGST !== floatingChildTotal
      ) {
        setFloatingChildExtraGuestChargeWithGST(floatingChildTotal);
      }
      if (
        hasFloatingInfant &&
        setFloatingInfantExtraGuestChargeWithGST &&
        floatingInfantExtraGuestChargeWithGST !== floatingInfantTotal
      ) {
        setFloatingInfantExtraGuestChargeWithGST(floatingInfantTotal);
      }
    }
  }, [
    calculatedValues.totalBasePriceRounded,
    calculatedValues.totalAdultPriceRounded,
    calculatedValues.totalChildPriceRounded,
    calculatedValues.totalInfantPriceRounded,
    calculatedValues.totalFloatingAdultPriceRounded,
    calculatedValues.totalFloatingChildPriceRounded,
    calculatedValues.totalFloatingInfantPriceRounded,
    enableFloatingGuests,
    price,
    adultExtraGuestCharge,
    childExtraGuestCharge,
    infantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
    priceWithGST,
    adultExtraGuestChargeWithGST,
    childExtraGuestChargeWithGST,
    infantExtraGuestChargeWithGST,
    floatingAdultExtraGuestChargeWithGST,
    floatingChildExtraGuestChargeWithGST,
    floatingInfantExtraGuestChargeWithGST,
  ]);

  const renderReadonlyInput = ({
    id,
    value,
    placeholder,
    suffix,
  }: {
    id: string;
    value: string;
    placeholder?: string;
    suffix?: "₹" | "%";
  }) => (
    <div className="relative flex-1 min-w-0">
      <TextInput
        type="number"
        id={id}
        value={value}
        placeholder={placeholder}
        readOnly
        className={`w-full [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none [&_input]:[appearance:textfield]${suffix ? " [&_input]:pr-6" : ""}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs font-semibold text-gray-500 dark:text-gray-300">
          {suffix}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className={`flex ${className || ""}`}>
      <div className="flex w-28 shrink-0 items-center px-2 py-1 text-sm font-medium">{title}</div>
      <div className="w-28 shrink-0 px-2 py-1">
        {renderReadonlyInput({
          id: `${suffix}GSTslabWithGST`,
          value: calculatedValues.gstSlab,
          placeholder: "GST %",
          suffix: "%",
        })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderReadonlyInput({ id: `${suffix}PriceWithGST`, value: price != null ? String(price) : calculatedValues.basePrice, placeholder: "Price", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}GSTofBasePriceWithGST`, value: calculatedValues.gstOfBasePrice, placeholder: "GST", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}TotalBasePriceWithGST`, value: calculatedValues.totalBasePrice, placeholder: "Total", suffix: "₹" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderReadonlyInput({ id: `${suffix}AdultExtraGuestChargeWithGST`, value: adultExtraGuestCharge != null ? String(adultExtraGuestCharge) : calculatedValues.adultPrice, placeholder: "Price", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}GSTonAdultPriceWithGST`, value: calculatedValues.gstOnAdultPrice, placeholder: "GST", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}TotalAdultPriceWithGST`, value: calculatedValues.totalAdultPrice, placeholder: "Total", suffix: "₹" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderReadonlyInput({ id: `${suffix}ChildExtraGuestChargeWithGST`, value: childExtraGuestCharge != null ? String(childExtraGuestCharge) : calculatedValues.childPrice, placeholder: "Price", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}GSTonChildPriceWithGST`, value: calculatedValues.gstOnChildPrice, placeholder: "GST", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}TotalChildPriceWithGST`, value: calculatedValues.totalChildPrice, placeholder: "Total", suffix: "₹" })}
      </div>
      <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
        {renderReadonlyInput({ id: `${suffix}InfantExtraGuestChargeWithGST`, value: infantExtraGuestCharge != null ? String(infantExtraGuestCharge) : calculatedValues.infantPrice, placeholder: "Price", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}GSTonInfantPriceWithGST`, value: calculatedValues.gstOnInfantPrice, placeholder: "GST", suffix: "₹" })}
        {renderReadonlyInput({ id: `${suffix}TotalInfantPriceWithGST`, value: calculatedValues.totalInfantPrice, placeholder: "Total", suffix: "₹" })}
      </div>
      {enableFloatingGuests && (
        <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
          {renderReadonlyInput({ id: `${suffix}FloatingAdultExtraGuestChargeWithGSTBase`, value: floatingAdultExtraGuestCharge != null ? String(floatingAdultExtraGuestCharge) : calculatedValues.floatingAdultPrice, placeholder: "Price", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}GSTonFloatingAdultPriceWithGST`, value: calculatedValues.gstOnFloatingAdultPrice, placeholder: "GST", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}TotalFloatingAdultPriceWithGST`, value: floatingAdultExtraGuestChargeWithGST != null ? String(floatingAdultExtraGuestChargeWithGST) : calculatedValues.totalFloatingAdultPrice, placeholder: "Total", suffix: "₹" })}
        </div>
      )}
      {enableFloatingGuests && (
        <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
          {renderReadonlyInput({ id: `${suffix}FloatingChildExtraGuestChargeWithGSTBase`, value: floatingChildExtraGuestCharge != null ? String(floatingChildExtraGuestCharge) : calculatedValues.floatingChildPrice, placeholder: "Price", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}GSTonFloatingChildPriceWithGST`, value: calculatedValues.gstOnFloatingChildPrice, placeholder: "GST", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}TotalFloatingChildPriceWithGST`, value: floatingChildExtraGuestChargeWithGST != null ? String(floatingChildExtraGuestChargeWithGST) : calculatedValues.totalFloatingChildPrice, placeholder: "Total", suffix: "₹" })}
        </div>
      )}
      {enableFloatingGuests && (
        <div className="flex w-80 shrink-0 gap-2 px-2 py-1">
          {renderReadonlyInput({ id: `${suffix}FloatingInfantExtraGuestChargeWithGSTBase`, value: floatingInfantExtraGuestCharge != null ? String(floatingInfantExtraGuestCharge) : calculatedValues.floatingInfantPrice, placeholder: "Price", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}GSTonFloatingInfantPriceWithGST`, value: calculatedValues.gstOnFloatingInfantPrice, placeholder: "GST", suffix: "₹" })}
          {renderReadonlyInput({ id: `${suffix}TotalFloatingInfantPriceWithGST`, value: floatingInfantExtraGuestChargeWithGST != null ? String(floatingInfantExtraGuestChargeWithGST) : calculatedValues.totalFloatingInfantPrice, placeholder: "Total", suffix: "₹" })}
        </div>
      )}
    </div>
  );
}


