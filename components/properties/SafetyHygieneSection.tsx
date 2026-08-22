"use client";

import { SafetyHygiene, SafetyHygieneData } from "@/utils/types";
import { Button } from "flowbite-react";
import SafetyHygieneRow from "@/components/common/SafetyHygieneRow";

interface SafetyHygieneSectionProps {
  safetyHygiene: SafetyHygieneData[];
  allSafetyHygiene: SafetyHygiene[];
  addSafetyHygiene: () => void;
  removeSafetyHygiene: (id: string) => void;
  updateSafetyHygiene: (id: string, updates: Partial<SafetyHygieneData>) => void;
}

export default function SafetyHygieneSection({
  safetyHygiene,
  allSafetyHygiene,
  addSafetyHygiene,
  removeSafetyHygiene,
  updateSafetyHygiene,
}: SafetyHygieneSectionProps) {
  return (
    <>
      {safetyHygiene.length === 0 ? (
        <div className="my-5">
          <Button onClick={addSafetyHygiene}>Add Safety/Hygiene</Button>
        </div>
      ) : (
        <table className="mx-auto w-full border-separate border-spacing-5">
          <thead>
            <tr>
              <th className="text-left">Safety/Hygiene Item</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safetyHygiene.map((item, index) => (
              <SafetyHygieneRow
                data={item}
                safetyHygieneOptions={allSafetyHygiene}
                key={item.id}
                showPlusButton={safetyHygiene.length === index + 1}
                createSafetyHygiene={addSafetyHygiene}
                removeSafetyHygiene={removeSafetyHygiene}
                updateSafetyHygiene={updateSafetyHygiene}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
