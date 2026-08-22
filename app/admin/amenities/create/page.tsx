import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";
import AmenityEditor from "../[id]/AmenityEditor";

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Amenities
          </h5>

          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/amenities">Amenities</BreadcrumbItem>
            <BreadcrumbItem href="#">Create</BreadcrumbItem>
          </Breadcrumb>
        </div>

        {/* Responsive form container */}
        <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Create New Amenity
          </h6>
          <AmenityEditor />
        </div>
      </Card>
    </div>
  );
}