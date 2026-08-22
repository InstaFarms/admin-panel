import { Card } from "flowbite-react";
import { notFound } from "next/navigation";

import { getCollectionWithProperties } from "@/actions/collectionActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CollectionEditor from "@/components/collection/CollectionEditor";
import { getCollectionBreadcrumbs } from "@/constants/collections";
import type { ServerPageProps } from "@/utils/types";

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");

  const rawData = idString ? await getCollectionWithProperties(idString, "instafarms") : null;
  if (!rawData) notFound();

  const breadcrumbs = getCollectionBreadcrumbs("instafarms");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Collections
          </h5>
          <PageBreadcrumb items={breadcrumbs.edit} className="pb-3" />
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold text-gray-900 dark:text-white">Edit Collection</h6>
          <CollectionEditor data={rawData} adminScope="instafarms" />
        </div>
      </Card>
    </div>
  );
}