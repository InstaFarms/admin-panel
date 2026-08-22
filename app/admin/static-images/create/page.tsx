"use client";

import { useState } from "react";
import { Card, Select } from "flowbite-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import LabelWrapper from "@/components/LabelWrapper";
import { SECTIONS, BREADCRUMBS, type StaticImageSection } from "@/constants/staticImages";
import StaticImageEditor from "../StaticImageEditor";

export default function Page() {
  const [section, setSection] = useState<StaticImageSection>(SECTIONS[0].value);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-4">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Static Images
          </h5>
          <PageBreadcrumb items={BREADCRUMBS.create} className="pb-3" />

          <LabelWrapper label="Select Section">
            <Select
              value={section}
              onChange={e => setSection(e.target.value as StaticImageSection)}
              required
            >
              {SECTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </LabelWrapper>
        </div>

        <StaticImageEditor section={section} />
      </Card>
    </div>
  );
}