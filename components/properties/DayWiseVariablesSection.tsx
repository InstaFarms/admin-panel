"use client";

import { TabItem, Tabs, ToggleSwitch } from "flowbite-react";

import PricingRow from "./PricingRow";
import PricingWithGSTRow from "./PricingWithGSTRow";
import SectionHeading from "@/components/properties/SectionHeading";

type CommercialRecord = Record<string, unknown>;

interface DayWiseVariablesSectionProps {
  commercial: CommercialRecord;
  setCommercialField: (field: string, value: unknown) => void;
  maxGuestCount?: number | null;
  gstPolicy?: { boundary: number; lower: number; higher: number };
}

const DAYS = [
  { key: "monday", title: "Monday" },
  { key: "tuesday", title: "Tuesday" },
  { key: "wednesday", title: "Wednesday" },
  { key: "thursday", title: "Thursday" },
  { key: "friday", title: "Friday" },
  { key: "saturday", title: "Saturday" },
  { key: "sunday", title: "Sunday" },
] as const;

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : null;

const toFieldName = (dayKey: string, suffix: string) =>
  `${dayKey}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;

export default function DayWiseVariablesSection({
  commercial,
  setCommercialField,
  maxGuestCount,
  gstPolicy,
}: DayWiseVariablesSectionProps) {
  const enableFloatingGuests = Boolean(commercial.enableFloatingGuests);

  const get = (field: string) => numberOrNull(commercial[field]);
  const set = (field: string) => (value: number | null) => {
    setCommercialField(field, value);
  };

  return (
    <Tabs>
      <TabItem title="Basic Calculations">
        <div className="mx-auto flex flex-col gap-5">
          <SectionHeading
            title="Day-wise Basic Calculations"
            description="Manage base pricing, guest charges, discounts, and GST slab by weekday."
          />
          <div className="flex flex-row items-center justify-between text-sm">
            <div className="flex grow flex-col">
              <p>
                <span className="font-bold italic">Adult: </span>13 years and
                older
              </p>
              <p>
                <span className="font-bold italic">Child: </span>2 to 12 years
                old
              </p>
              <p>
                <span className="font-bold italic">Infant: </span>0 to 1 year
                old
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={enableFloatingGuests}
                onChange={(value) => setCommercialField("enableFloatingGuests", value)}
                label="Enable Floating Guests"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex text-xs font-semibold uppercase tracking-wide text-gray-400">
              <div className="w-28 shrink-0 px-2 py-2">Day</div>
              <div className="w-36 shrink-0 px-2 py-2 text-center">Base Price</div>
              <div className="w-80 shrink-0 px-2 py-2 text-center">Extra Guest Price (Adult / Child / Infant)</div>
              {enableFloatingGuests && <div className="w-80 shrink-0 px-2 py-2 text-center">Floating Guest (Adult / Child / Infant)</div>}
              <div className="w-36 shrink-0 px-2 py-2 text-center">Base Guest Count</div>
              <div className="w-32 shrink-0 px-2 py-2 text-center">Discount</div>
              <div className="w-40 shrink-0 px-2 py-2 text-center">Max Extra Guest Price</div>
              <div className="w-36 shrink-0 px-2 py-2 text-center">Max Total</div>
              <div className="w-28 shrink-0 px-2 py-2 text-center">GST Slab</div>
            </div>
            {DAYS.map((day) => (
              <PricingRow
                key={day.key}
                suffix={day.key}
                title={day.title}
                enableFloatingGuests={enableFloatingGuests}
                maxGuestCount={maxGuestCount}
                price={get(toFieldName(day.key, "Price"))}
                setPrice={set(toFieldName(day.key, "Price"))}
                adultExtraGuestCharge={get(toFieldName(day.key, "AdultExtraGuestCharge"))}
                setAdultExtraGuestCharge={set(toFieldName(day.key, "AdultExtraGuestCharge"))}
                childExtraGuestCharge={get(toFieldName(day.key, "ChildExtraGuestCharge"))}
                setChildExtraGuestCharge={set(toFieldName(day.key, "ChildExtraGuestCharge"))}
                infantExtraGuestCharge={get(toFieldName(day.key, "InfantExtraGuestCharge"))}
                setInfantExtraGuestCharge={set(toFieldName(day.key, "InfantExtraGuestCharge"))}
                floatingAdultExtraGuestCharge={get(toFieldName(day.key, "FloatingAdultExtraGuestCharge"))}
                setFloatingAdultExtraGuestCharge={set(toFieldName(day.key, "FloatingAdultExtraGuestCharge"))}
                floatingChildExtraGuestCharge={get(toFieldName(day.key, "FloatingChildExtraGuestCharge"))}
                setFloatingChildExtraGuestCharge={set(toFieldName(day.key, "FloatingChildExtraGuestCharge"))}
                floatingInfantExtraGuestCharge={get(toFieldName(day.key, "FloatingInfantExtraGuestCharge"))}
                setFloatingInfantExtraGuestCharge={set(toFieldName(day.key, "FloatingInfantExtraGuestCharge"))}
                baseGuestCount={get(toFieldName(day.key, "BaseGuestCount"))}
                setBaseGuestCount={set(toFieldName(day.key, "BaseGuestCount"))}
                discount={get(toFieldName(day.key, "Discount"))}
                setDiscount={set(toFieldName(day.key, "Discount"))}
                maxExtraGuestPrice={get(toFieldName(day.key, "MaxExtraGuestPrice"))}
                setMaxExtraGuestPrice={set(toFieldName(day.key, "MaxExtraGuestPrice"))}
                maxTotal={get(toFieldName(day.key, "MaxTotal"))}
                setMaxTotal={set(toFieldName(day.key, "MaxTotal"))}
                gstSlab={get(toFieldName(day.key, "GSTslab"))}
                setGstSlab={set(toFieldName(day.key, "GSTslab"))}
                gstPolicy={gstPolicy}
              />
            ))}
          </div>
        </div>
      </TabItem>
      <TabItem title="Prices with GST">
        <div className="mx-auto flex flex-col gap-5">
          <SectionHeading
            title="Day-wise Prices with GST"
            description="Review GST-applied totals for base and extra guest charges."
          />
          <div className="flex flex-row text-sm">
            <div className="flex grow flex-col">
              <p>
                <span className="font-bold italic">Adult: </span>13 years and
                older
              </p>
              <p>
                <span className="font-bold italic">Child: </span>2 to 12 years
                old
              </p>
              <p>
                <span className="font-bold italic">Infant: </span>0 to 1 year
                old
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex text-xs font-semibold uppercase tracking-wide text-gray-400">
              <div className="w-28 shrink-0 px-2 py-2">Day</div>
              <div className="w-28 shrink-0 px-2 py-2 text-center">GST Slab</div>
              <div className="w-80 shrink-0 px-2 py-2 text-center">Base Rental (Price / GST / Total)</div>
              <div className="w-80 shrink-0 px-2 py-2 text-center">Adult (Price / GST / Total)</div>
              <div className="w-80 shrink-0 px-2 py-2 text-center">Child (Price / GST / Total)</div>
              <div className="w-80 shrink-0 px-2 py-2 text-center">Infant (Price / GST / Total)</div>
              {enableFloatingGuests && <div className="w-80 shrink-0 px-2 py-2 text-center">Floating Adult (Price / GST / Total)</div>}
              {enableFloatingGuests && <div className="w-80 shrink-0 px-2 py-2 text-center">Floating Child (Price / GST / Total)</div>}
              {enableFloatingGuests && <div className="w-80 shrink-0 px-2 py-2 text-center">Floating Infant (Price / GST / Total)</div>}
            </div>
            {DAYS.map((day) => (
                <PricingWithGSTRow
                  key={`${day.key}-with-gst`}
                  suffix={day.key}
                  title={day.title}
                  enableFloatingGuests={enableFloatingGuests}
                  price={get(toFieldName(day.key, "Price"))}
                  setPrice={set(toFieldName(day.key, "Price"))}
                  adultExtraGuestCharge={get(toFieldName(day.key, "AdultExtraGuestCharge"))}
                  setAdultExtraGuestCharge={set(
                    toFieldName(day.key, "AdultExtraGuestCharge"),
                  )}
                  childExtraGuestCharge={get(toFieldName(day.key, "ChildExtraGuestCharge"))}
                  setChildExtraGuestCharge={set(
                    toFieldName(day.key, "ChildExtraGuestCharge"),
                  )}
                  infantExtraGuestCharge={get(
                    toFieldName(day.key, "InfantExtraGuestCharge"),
                  )}
                  setInfantExtraGuestCharge={set(
                    toFieldName(day.key, "InfantExtraGuestCharge"),
                  )}
                  floatingAdultExtraGuestCharge={get(
                    toFieldName(day.key, "FloatingAdultExtraGuestCharge"),
                  )}
                  floatingChildExtraGuestCharge={get(
                    toFieldName(day.key, "FloatingChildExtraGuestCharge"),
                  )}
                  floatingInfantExtraGuestCharge={get(
                    toFieldName(day.key, "FloatingInfantExtraGuestCharge"),
                  )}
                  gstSlab={get(toFieldName(day.key, "GSTslab"))}
                  priceWithGST={get(toFieldName(day.key, "PriceWithGST"))}
                  setPriceWithGST={set(toFieldName(day.key, "PriceWithGST"))}
                  adultExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "AdultExtraGuestChargeWithGST"),
                  )}
                  setAdultExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "AdultExtraGuestChargeWithGST"),
                  )}
                  childExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "ChildExtraGuestChargeWithGST"),
                  )}
                  setChildExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "ChildExtraGuestChargeWithGST"),
                  )}
                  infantExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "InfantExtraGuestChargeWithGST"),
                  )}
                  setInfantExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "InfantExtraGuestChargeWithGST"),
                  )}
                  floatingAdultExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "FloatingAdultExtraGuestChargeWithGST"),
                  )}
                  setFloatingAdultExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "FloatingAdultExtraGuestChargeWithGST"),
                  )}
                  floatingChildExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "FloatingChildExtraGuestChargeWithGST"),
                  )}
                  setFloatingChildExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "FloatingChildExtraGuestChargeWithGST"),
                  )}
                  floatingInfantExtraGuestChargeWithGST={get(
                    toFieldName(day.key, "FloatingInfantExtraGuestChargeWithGST"),
                  )}
                  setFloatingInfantExtraGuestChargeWithGST={set(
                    toFieldName(day.key, "FloatingInfantExtraGuestChargeWithGST"),
                  )}
                />
              ))}
          </div>
        </div>
      </TabItem>
    </Tabs>
  );
}
