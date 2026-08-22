"use client";

import { SpecialDateData } from "@/utils/types";
import { Button, TabItem, Tabs } from "flowbite-react";
import SpecialDatePricingRow from "@/components/common/SpecialDatePricingRow";
import SpecialDatePricingWithGSTRow from "@/components/common/SpecialDatePricingWithGSTRow";
import SectionHeading from "@/components/properties/SectionHeading";
import { toast } from "react-hot-toast";

interface SpecialDatesSectionProps {
  specialDateData: SpecialDateData[];
  updateSpecialDate: (data: SpecialDateData) => boolean | void;
  addSpecialDate: () => void;
  removeSpecialDate: (id: string) => void;
  createNewSpecialDate: () => SpecialDateData;
  setSpecialDateData: (data: SpecialDateData[]) => void;
  maxGuestCount?: number | null;
  gstPolicy?: { boundary: number; lower: number; higher: number };
}

export default function SpecialDatesSection({
  specialDateData,
  updateSpecialDate,
  addSpecialDate,
  removeSpecialDate,
  createNewSpecialDate,
  setSpecialDateData,
  maxGuestCount,
  gstPolicy,
}: SpecialDatesSectionProps) {
  // Wrapper to handle validation errors from updateSpecialDate
  const handleUpdateSpecialDate = (data: SpecialDateData) => {
    const result = updateSpecialDate(data);
    // If result is false, it means validation failed (duplicate date)
    if (result === false) {
      toast.error(`Date ${data.date} is already used. Please choose a different date.`);
    }
  };

  return (
    <Tabs>
      <TabItem title="Basic Calculations">
        <div className="mx-auto flex flex-col gap-5">
          <SectionHeading
            title="Special Dates Basic Calculations"
            description="Set date-specific pricing, guest charges, discounts, and GST slab."
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
          {specialDateData.length === 0 ? (
            <div className="my-5">
              <Button
                onClick={() => setSpecialDateData([createNewSpecialDate()])}
              >
                Create Special Date
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Header */}
              <div className="flex text-xs font-semibold uppercase tracking-wide text-gray-400">
                <div className="w-44 shrink-0 px-3 py-2">Date</div>
                <div className="w-36 shrink-0 px-3 py-2 text-center">Base Price</div>
                <div className="w-80 shrink-0 px-3 py-2 text-center">Extra Guest Price (Adult / Child / Infant)</div>
                <div className="w-36 shrink-0 px-3 py-2 text-center">Base Guest Count</div>
                <div className="w-32 shrink-0 px-3 py-2 text-center">Discount</div>
                <div className="w-40 shrink-0 px-3 py-2 text-center">Max Extra Guest Price</div>
                <div className="w-36 shrink-0 px-3 py-2 text-center">Max Total</div>
                <div className="w-28 shrink-0 px-3 py-2 text-center">GST Slab</div>
                <div className="w-24 shrink-0 px-3 py-2 text-center">Actions</div>
              </div>
              {/* Rows */}
              {specialDateData.map((sd, index) => (
                <SpecialDatePricingRow
                  data={sd}
                  setData={handleUpdateSpecialDate}
                  key={sd.id}
                  showPlusButton={specialDateData.length === index + 1}
                  addSpecialDate={addSpecialDate}
                  removeSpecialDate={() => removeSpecialDate(sd.id)}
                  maxGuestCount={maxGuestCount}
                  gstPolicy={gstPolicy}
                />
              ))}
            </div>
          )}
        </div>
      </TabItem>
      <TabItem title="Prices with GST">
        <div className="mx-auto flex flex-col gap-5">
          <SectionHeading
            title="Special Dates Prices with GST"
            description="Review GST-applied totals for special date pricing."
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
          {specialDateData.length === 0 ? (
            <div className="my-5">
              <Button
                onClick={() => setSpecialDateData([createNewSpecialDate()])}
              >
                Create Special Date
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex text-xs font-semibold uppercase tracking-wide text-gray-400">
                <div className="w-44 shrink-0 px-2 py-2">Date</div>
                <div className="w-28 shrink-0 px-2 py-2 text-center">GST Slab</div>
                <div className="w-80 shrink-0 px-2 py-2 text-center">Base Rental (Price / GST / Total)</div>
                <div className="w-80 shrink-0 px-2 py-2 text-center">Adult (Price / GST / Total)</div>
                <div className="w-80 shrink-0 px-2 py-2 text-center">Child (Price / GST / Total)</div>
                <div className="w-80 shrink-0 px-2 py-2 text-center">Infant (Price / GST / Total)</div>
              </div>
              {specialDateData.map((sd) => (
                <SpecialDatePricingWithGSTRow
                  data={sd}
                  setData={handleUpdateSpecialDate}
                  key={sd.id}
                />
              ))}
            </div>
          )}
        </div>
      </TabItem>
    </Tabs>
  );
}

