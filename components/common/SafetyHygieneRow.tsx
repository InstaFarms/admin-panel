"use client";

import { SafetyHygiene, SafetyHygieneData } from "@/utils/types";
import { Button, Select } from "flowbite-react";
import { useState } from "react";
import { HiMinus, HiPlus } from "react-icons/hi";

interface SafetyHygieneRowProps {
  data: SafetyHygieneData;
  safetyHygieneOptions: SafetyHygiene[];
  showPlusButton: boolean;
  createSafetyHygiene: () => void;
  removeSafetyHygiene: (id: string) => void;
  updateSafetyHygiene: (id: string, updates: Partial<SafetyHygieneData>) => void;
}

export default function SafetyHygieneRow({
  data,
  safetyHygieneOptions,
  showPlusButton,
  createSafetyHygiene,
  removeSafetyHygiene,
  updateSafetyHygiene,
}: SafetyHygieneRowProps) {
  const [selectedSafetyHygiene, setSelectedSafetyHygiene] = useState<string>(
    data.safetyHygieneId || ""
  );

  const handleSafetyHygieneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSafetyHygiene(value);
    updateSafetyHygiene(data.id, { safetyHygieneId: value });
  };

  return (
    <tr>
      <td>
        <Select
          id={`safetyHygiene-${data.id}`}
          value={selectedSafetyHygiene}
          onChange={handleSafetyHygieneChange}
          required
        >
          <option value="">Select Safety/Hygiene Item</option>
          {safetyHygieneOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </td>
      <td>
        <div className="flex gap-2">
          <Button
            className="bg-primary-500 aspect-square p-2"
            onClick={() => removeSafetyHygiene(data.id)}
          >
            <HiMinus />
          </Button>
          {showPlusButton && (
            <Button
              className="bg-primary-500 aspect-square p-2"
              onClick={createSafetyHygiene}
            >
              <HiPlus />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

