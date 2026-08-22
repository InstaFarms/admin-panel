import { Card } from "flowbite-react";
import { notFound } from "next/navigation";

import { getStaticImagesBySection } from "@/actions/staticImageActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import {
  VALID_SECTIONS, BREADCRUMBS, getSectionLabel,
  type StaticImageSection,
} from "@/constants/staticImages";
import StaticImageEditor from "../StaticImageEditor";

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!VALID_SECTIONS.includes(section as StaticImageSection)) {
    notFound();
  }

  let data: any[] = [];
  let fetchError: string | null = null;

  try {
    data = await getStaticImagesBySection(section as StaticImageSection, false);
    data = data.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to fetch static images";
  }

  const sectionLabel = getSectionLabel(section);

  if (fetchError) {
    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="text-center text-red-600 py-8">Error: {fetchError}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-4">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Edit {sectionLabel}
          </h5>
          <PageBreadcrumb items={BREADCRUMBS.section(sectionLabel)} className="pb-3" />
        </div>
        <StaticImageEditor data={data} section={section as StaticImageSection} />
      </Card>
    </div>
  );
}