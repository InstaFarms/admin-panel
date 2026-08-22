import { Card } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CarouselEditor from "@/app/admin/instafarm/instafarms-settings/carousel/[id]/CarouselEditor";
import { ServerPageProps } from "@/utils/types";
import { BRAND_CONTENT_ROUTES } from "@/constants/brandAdminScope";

const SCOPE = "mago" as const;

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const validType = type === "APP" ? "APP" : "WEB";
  const typeLabel = validType === "APP" ? "App" : "Web";

  const breadcrumbs = [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    {
      href:
        validType === "APP"
          ? BRAND_CONTENT_ROUTES[SCOPE].appCarousel
          : BRAND_CONTENT_ROUTES[SCOPE].webCarousel,
      label: `${typeLabel} Carousel`,
    },
    { href: "#", label: `Create ${typeLabel} Carousel` },
  ];

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {typeLabel} Carousel Item
          </h5>
          <PageBreadcrumb items={breadcrumbs} />
        </div>
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <h6 className="mb-4 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create New {typeLabel} Carousel Item
          </h6>
          <CarouselEditor type={validType} brandScope={SCOPE} />
        </div>
      </Card>
    </div>
  );
}
