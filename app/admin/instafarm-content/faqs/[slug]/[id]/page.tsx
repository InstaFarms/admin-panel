import { Card } from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getFaqById } from "@/actions/faqActions";
import FAQEditor from "@/app/admin/instafarm-content/faqs/[slug]/[id]/FAQEditor";
import { notFound } from "next/navigation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getFAQEditBreadcrumbs, FAQ_ERRORS } from "@/constants/faqs";

export default async function Page({ params }: ServerPageProps) {
  const { slug, id } = await params;
  const category = Array.isArray(slug) ? slug[0] : slug;

  if (!category) {
    notFound();
  }

  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  const idString = Array.isArray(id) ? id[0] : (id ?? "");

  const data = await getFaqById(idString);

  if (!data) {
    throw new Error(FAQ_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            FAQs - {categoryTitle}
          </h5>

          <PageBreadcrumb items={getFAQEditBreadcrumbs(category)} />
        </div>

        <div className="mx-auto flex w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit FAQ
          </h6>
          <FAQEditor data={data} category={category} />
        </div>
      </Card>
    </div>
  );
}
