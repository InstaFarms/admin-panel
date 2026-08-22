import { Card } from "flowbite-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import CollectionEditor from "@/components/collection/CollectionEditor";
import { getCollectionBreadcrumbs } from "@/constants/collections";

export default async function Page() {
  const breadcrumbs = getCollectionBreadcrumbs("instafarms");

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Collections
          </h5>
          <PageBreadcrumb items={breadcrumbs.create} className="pb-3" />
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <h6 className="text-lg font-bold text-gray-900 dark:text-white">Create New Collection</h6>
          <CollectionEditor adminScope="instafarms" />
        </div>
      </Card>
    </div>
  );
}