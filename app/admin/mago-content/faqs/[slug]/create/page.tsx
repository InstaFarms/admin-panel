import { Card } from "flowbite-react";
import FAQEditor from "@/app/admin/instafarm-content/faqs/[slug]/[id]/FAQEditor";
import { ServerPageProps } from "@/utils/types";
import { notFound } from "next/navigation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getFAQCreateBreadcrumbs } from "@/constants/faqs";

const SCOPE = "mago" as const;

export default async function Page({ params }: ServerPageProps) {
  const { slug } = await params;
  const category = Array.isArray(slug) ? slug[0] : slug;

  if (!category) {
    notFound();
  }

  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            FAQs - {categoryTitle}
          </h5>

          <PageBreadcrumb items={getFAQCreateBreadcrumbs(category, SCOPE)} />
        </div>

        <div className="mx-auto flex w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Add New FAQ
          </h6>
          <FAQEditor category={category} brandScope={SCOPE} />
        </div>
      </Card>
    </div>
  );
}
