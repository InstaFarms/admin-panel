"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Checkbox, TextInput } from "flowbite-react";
import { HiMenu, HiMinus } from "react-icons/hi";
import { ActivityData } from "@/utils/types";

interface SortableActivityRowProps {
  data: ActivityData;
  removeActivity: (id: string) => void;
}

function ActivityRowContent({
  data,
  removeActivity,
}: {
  data: ActivityData;
  removeActivity: (id: string) => void;
}) {
  const [weight, setWeight] = useState(data.weight?.toString() || "");
  const [isPaid, setIsPaid] = useState(data.isPaid || false);
  const [isUSP, setIsUSP] = useState(data.isUSP || false);

  useEffect(() => {
    setWeight(data.weight?.toString() || "");
  }, [data.weight]);

  useEffect(() => {
    setIsPaid(data.isPaid || false);
    setIsUSP(data.isUSP || false);
  }, [data.isPaid, data.isUSP]);

  return (
    <>
      <td className="px-3 py-3 align-middle">
        <span className="font-medium text-gray-900 dark:text-gray-100" id={`activity-title-${data.id}`}>
          {data.name || "--"}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex justify-center">
          <TextInput
            className="w-28"
            type="numeric"
            inputMode="numeric"
            id={`activity-weight-${data.id}`}
            name={`activity-weight-${data.id}`}
            placeholder="Weight"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              data.weight = parseInt(e.target.value) || null;
            }}
          />
        </div>
      </td>
      <td className="px-3 py-3 text-center align-middle">
        <div className="flex items-center justify-center">
          <Checkbox
            id={`activity-isPaid-${data.id}`}
            name={`activity-isPaid-${data.id}`}
            value="true"
            checked={isPaid}
            onChange={(e) => {
              setIsPaid(e.target.checked);
              data.isPaid = e.target.checked;
            }}
          />
        </div>
      </td>
      <td className="px-3 py-3 text-center align-middle">
        <div className="flex items-center justify-center">
          <Checkbox
            id={`activity-isUSP-${data.id}`}
            name={`activity-isUSP-${data.id}`}
            value="true"
            checked={isUSP}
            onChange={(e) => {
              setIsUSP(e.target.checked);
              data.isUSP = e.target.checked;
            }}
          />
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center justify-start">
          <Button
            className="h-8 w-8 bg-rose-600 p-0 hover:bg-rose-500 focus:ring-rose-400"
            onClick={() => removeActivity(data.id)}
            type="button"
          >
            <HiMinus />
          </Button>
        </div>
      </td>
    </>
  );
}

export default function SortableActivityRow(props: SortableActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.data.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-200 align-middle dark:border-gray-700">
      <td
        {...attributes}
        {...listeners}
        className="w-12 cursor-move px-3 py-3 align-middle"
        suppressHydrationWarning
      >
        <HiMenu className="text-gray-400 hover:text-gray-600" size={20} />
      </td>
      <ActivityRowContent data={props.data} removeActivity={props.removeActivity} />
    </tr>
  );
}
