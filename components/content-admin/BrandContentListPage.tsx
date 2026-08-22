import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import { parseLimitOffset } from "@/utils/server-utils";
import { Carousel, CMS, ServerPageProps, Tag } from "@/utils/types";
import {
  getCarouselList,
  getCmsList,
  getTagsList,
} from "@/actions/instafarm-settingsActions";
import {
  BRAND_CONTENT_ROUTES,
  brandContentBreadcrumbLabel,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { HiPencil, HiPlus } from "react-icons/hi";
import Link from "next/link";

type ContentSection = "cms" | "webCarousel" | "appCarousel" | "tags";

type BrandContentListPageProps = {
  scope: BrandAdminScope;
  section: ContentSection;
  searchParams: ServerPageProps["searchParams"];
};

type CarouselListRow = Carousel & {
  bannerUrl?: string | null;
  mobBannerUrl?: string | null;
};

function getSectionConfig(scope: BrandAdminScope, section: ContentSection) {
  const routes = BRAND_CONTENT_ROUTES[scope];

  switch (section) {
    case "cms":
      return {
        title: "CMS Content",
        createHref: `${routes.cms}/create`,
        createLabel: "New CMS Content",
        listHref: routes.cms,
      };
    case "webCarousel":
      return {
        title: "Web Carousel Items",
        createHref: `${routes.hub}/carousel/create?type=WEB`,
        createLabel: "New Web Carousel Item",
        listHref: routes.webCarousel,
      };
    case "appCarousel":
      return {
        title: "App Carousel Items",
        createHref: `${routes.hub}/carousel/create?type=APP`,
        createLabel: "New App Carousel Item",
        listHref: routes.appCarousel,
      };
    case "tags":
      return {
        title: "Tags",
        createHref: `${routes.tags}/create`,
        createLabel: "New Tag",
        listHref: routes.tags,
      };
  }
}

export default async function BrandContentListPage({
  scope,
  section,
  searchParams,
}: BrandContentListPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const routes = BRAND_CONTENT_ROUTES[scope];
  const config = getSectionConfig(scope, section);

  const breadcrumbs = [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: config.listHref, label: config.title },
  ];

  if (section === "cms") {
    const { data } = await getCmsList(limit, offset, scope);

    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {brandContentBreadcrumbLabel(scope)} CMS
              </h5>
              <Button as={Link} href={config.createHref} className="cursor-pointer">
                <HiPlus className="mr-2 h-4 w-4" />
                {config.createLabel}
              </Button>
            </div>
            <div className="pb-3">
              <PageBreadcrumb items={breadcrumbs} />
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHead>
                  <TableRow>
                    <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Title</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Heading</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {data?.length ? (
                    data.map(({ id, title, heading, isActive }: CMS, index: number) => (
                      <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800" key={id}>
                        <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">{title}</TableCell>
                        <TableCell className="text-gray-900 dark:text-white">{heading}</TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-1 text-sm ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={`${routes.hub}/cms/${id}`} className="w-fit">
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-400">
                        No CMS content found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination />
        </Card>
      </div>
    );
  }

  if (section === "tags") {
    const { data } = await getTagsList(limit, offset, scope);

    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {brandContentBreadcrumbLabel(scope)} Tags
              </h5>
              <Button as={Link} href={config.createHref} className="cursor-pointer">
                <HiPlus className="mr-2 h-4 w-4" />
                {config.createLabel}
              </Button>
            </div>
            <div className="pb-3">
              <PageBreadcrumb items={breadcrumbs} />
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHead>
                  <TableRow>
                    <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Name</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Color</TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {data?.length ? (
                    data.map(({ id, name, color }: Tag, index: number) => (
                      <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800" key={id}>
                        <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">{name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {color ? <div className="h-4 w-4 rounded" style={{ backgroundColor: color }} /> : null}
                            <span className="text-gray-900 dark:text-white">{color || "No color"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`${routes.hub}/tags/${id}`} className="w-fit">
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">
                        No tags found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination />
        </Card>
      </div>
    );
  }

  const carouselType = section === "appCarousel" ? "APP" : "WEB";
  const { data: rawData } = await getCarouselList(limit, offset, carouselType, scope);
  const data = ((rawData || []) as CarouselListRow[]).map((item) => ({
    ...item,
    desktopBannerUrl: item.bannerUrl,
    mobileBannerUrl: item.mobBannerUrl,
  }));

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-row items-center justify-between">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              {brandContentBreadcrumbLabel(scope)} {carouselType === "APP" ? "App" : "Web"} Carousel
            </h5>
            <Button as={Link} href={config.createHref} className="cursor-pointer">
              <HiPlus className="mr-2 h-4 w-4" />
              {config.createLabel}
            </Button>
          </div>
          <div className="pb-3">
            <PageBreadcrumb items={breadcrumbs} />
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Desktop Banner</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Mobile Banner</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Heading</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Weight</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length ? (
                  data.map(({ id, heading, weight, desktopBannerUrl, mobileBannerUrl }: Carousel, index: number) => (
                    <TableRow key={id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                      <TableCell>
                        {desktopBannerUrl ? (
                          <img src={desktopBannerUrl} alt="Desktop banner" className="h-10 w-16 rounded object-cover" />
                        ) : (
                          <span className="text-gray-400">No image</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mobileBannerUrl ? (
                          <img src={mobileBannerUrl} alt="Mobile banner" className="h-10 w-16 rounded object-cover" />
                        ) : (
                          <span className="text-gray-400">No image</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">{heading}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">{weight}</TableCell>
                      <TableCell>
                        <Link href={`${routes.hub}/carousel/${id}`} className="w-fit">
                          <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                            <HiPencil size={20} className="text-white" />
                          </div>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No {carouselType === "APP" ? "app" : "web"} carousel items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}
