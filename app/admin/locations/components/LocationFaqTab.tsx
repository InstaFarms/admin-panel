"use client";

import React from "react";
import { Checkbox, Label, TextInput } from "flowbite-react";
import { HiMinus, HiPlus } from "react-icons/hi";
import HtmlField from "@/components/HtmlField";
import LocationBrandTabWrapper from "./LocationBrandTabWrapper";

interface LocationFaqTabProps {
  localIsEditMode: boolean;
  showBrandEditor: boolean;
  selectedBrandName: string;
  onAddBrand: () => void;
  addingBrand: boolean;
  locationName: string;
  faqs: Array<{ question: string; answer: string; weight: number; isActive: boolean }>;
  addFaq: () => void;
  removeFaq: (index: number) => void;
  updateFaq: (index: number, field: string, value: string | number | boolean) => void;
}

export default function LocationFaqTab(props: LocationFaqTabProps) {
  return (
    <LocationBrandTabWrapper
      localIsEditMode={props.localIsEditMode}
      showBrandEditor={props.showBrandEditor}
      selectedBrandName={props.selectedBrandName}
      onAddBrand={props.onAddBrand}
      addingBrand={props.addingBrand}
      locationName={props.locationName}
      lockNoticeTitle="Brand FAQs Locked"
    >
      <div className="mx-auto flex max-w-[1000px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <h6 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Manage Questions & Answers
          </h6>
          <button
            type="button"
            onClick={props.addFaq}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-md hover:bg-blue-700"
          >
            <HiPlus /> Add FAQ
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {props.faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Question #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => props.removeFaq(index)}
                  className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <HiMinus size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="md:col-span-3">
                  <Label className="mb-2 block">Question</Label>
                  <TextInput
                    value={faq.question}
                    onChange={(e) => props.updateFaq(index, "question", e.target.value)}
                    placeholder="Enter the question"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Weight</Label>
                  <TextInput
                    type="number"
                    value={faq.weight}
                    onChange={(e) =>
                      props.updateFaq(index, "weight", parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full"
                  />
                </div>
                <HtmlField
                  className="md:col-span-4"
                  label="Answer"
                  value={faq.answer}
                  onChange={(answer) => props.updateFaq(index, "answer", answer)}
                  placeholder="Enter the answer"
                />
                <div className="md:col-span-4 flex items-center gap-2">
                  <Checkbox
                    id={`faq-active-${index}`}
                    checked={faq.isActive}
                    onChange={(e) => props.updateFaq(index, "isActive", e.target.checked)}
                  />
                  <Label htmlFor={`faq-active-${index}`}>Visible to users</Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LocationBrandTabWrapper>
  );
}
