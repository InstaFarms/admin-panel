"use client";

import { useState } from "react";
import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { SECTIONS, type StaticImageSection, staticImagesCreateBreadcrumbs } from "@/constants/staticImages";
import StaticImageEditor from "@/app/admin/static-images/StaticImageEditor";

const SCOPE = "mago" as const;

export default function MagoStaticImagesCreatePage() {
  const [section, setSection] = useState<StaticImageSection>(SECTIONS[0].value);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Mago Static Images
          </h5>
          <PageBreadcrumb items={staticImagesCreateBreadcrumbs(SCOPE)} />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Section
            <select
              className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700"
              value={section}
              onChange={e => setSection(e.target.value as StaticImageSection)}
            >
              {SECTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <StaticImageEditor section={section} adminScope={SCOPE} />
        </div>
      </Card>
    </div>
  );
}
