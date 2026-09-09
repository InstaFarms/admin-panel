"use client";

import HtmlField from "@/components/HtmlField";
import SectionHeading from "@/components/properties/SectionHeading";

type RichTextPanelProps = {
  title: string;
  description: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hiddenName: string;
  hiddenValue: string;
};

/**
 * Property "Others" tab wrapper: a section heading plus the shared HtmlField.
 * The editor itself, its toolbar and its preview all live in HtmlField now.
 */
export default function RichTextPanel({
  title,
  description,
  label,
  value,
  onChange,
  hiddenName,
  hiddenValue,
}: RichTextPanelProps) {
  return (
    <div className="space-y-4">
      <SectionHeading title={title} description={description} />
      <HtmlField
        label={label}
        size="full"
        value={value}
        onChange={onChange}
        hiddenName={hiddenName}
        hiddenValue={hiddenValue}
      />
    </div>
  );
}
