import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import Link from "next/link";
import { HiPencil, HiPlus } from "react-icons/hi";
import { FolderKanban, Image as ImageIcon, LayoutPanelTop } from "lucide-react";

import { getAllStaticImages } from "@/actions/staticImageActions";
import DeleteStaticImageButton from "@/app/admin/static-images/DeleteStaticImageButton";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import { STATIC_IMAGES_BASE } from "@/constants/brandAdminScope";
import { getEmptyListMessage } from "@/constants/ui";
import { getSectionLabel, SECTIONS, staticImagesListBreadcrumbs, TABLE_COLUMNS } from "@/constants/staticImages";
import { parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";

const SCOPE = "mago" as const;
const BASE = STATIC_IMAGES_BASE[SCOPE];

export const dynamic = "force-dynamic";

type StaticImageListItem = {
  id: string;
  section: string;
  title: string;
  description?: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string;
  sortOrder?: number | null;
  isActive: boolean;
  createdAt?: string | Date | null;
};

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);

  let allData: StaticImageListItem[] = [];
  let fetchError: string | null = null;
  let sectionCounts: Record<string, number> = {};
  let activeCount = 0;
  let totalCount = 0;

  try {
    const rawData = (await getAllStaticImages(SCOPE)) as StaticImageListItem[];
    const sortedData = rawData.sort((a, b) => {
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (b.sortOrder !== a.sortOrder) return (b.sortOrder || 0) - (a.sortOrder || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    allData = sortedData.slice(offset, offset + limit);
    sectionCounts = rawData.reduce((acc: Record<string, number>, img) => {
      acc[img.section] = (acc[img.section] || 0) + 1;
      return acc;
    }, {});
    activeCount = rawData.filter((img) => img.isActive).length;
    totalCount = rawData.length;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to fetch static images";
  }

  if (fetchError) {
    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="py-8 text-center text-red-600">Error: {fetchError}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl dark:border-slate-700">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                    Static website images
                  </span>
                  <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-100">
                    Mago library
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">Mago Static Website Images</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Manage reusable Mago website artwork by section, with quick access to previews, ordering, and status.
                </p>
                <PageBreadcrumb items={staticImagesListBreadcrumbs(SCOPE)} className="mt-4 text-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Assets</p>
                  <p className="mt-2 text-2xl font-semibold">{totalCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Sections</p>
                  <p className="mt-2 text-2xl font-semibold">{SECTIONS.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
                  <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Link href={`${BASE}/create`} className="inline-flex h-full w-full items-center justify-center rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                    <HiPlus className="mr-2" />
                    New Images
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-5 flex items-center gap-2">
              <span className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:text-sky-300">
                <FolderKanban size={16} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Browse by section</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Open the exact Mago section you want to update.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SECTIONS.map((sec) => (
                <Link key={sec.value} href={`${BASE}/${sec.value}`} className="group block">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-sky-400 dark:hover:bg-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{sec.label}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Manage artwork, links, and ordering for this section.
                        </p>
                      </div>
                      <Badge color="info">{sectionCounts[sec.value] || 0}</Badge>
                    </div>
                    <div className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 dark:text-sky-300">
                      Manage section
                      <HiPencil className="ml-2" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-5 flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-300">
                <LayoutPanelTop size={16} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Asset table</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Review the latest assets across every Mago section.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHead>
                  <TableRow>
                    {TABLE_COLUMNS.map((col) => (
                      <TableHeadCell key={col} className="whitespace-nowrap">
                        {col}
                      </TableHeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {allData.length > 0 ? (
                    allData.map((image) => (
                      <TableRow key={image.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                        <TableCell className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">
                          {image.sortOrder}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3">
                            <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                              <img src={image.desktopImageUrl} alt="Desktop" className="h-full w-full object-cover" />
                              <div className="absolute bottom-0 left-0 bg-black/70 px-2 py-0.5 text-[10px] text-white">Desktop</div>
                            </div>
                            <div className="relative h-16 w-14 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                              <img src={image.mobileImageUrl} alt="Mobile" className="h-full w-full object-cover" />
                              <div className="absolute bottom-0 left-0 bg-black/70 px-2 py-0.5 text-[10px] text-white">Mobile</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <div className="max-w-[240px] truncate font-semibold">{image.title}</div>
                          {image.description ? (
                            <div className="max-w-[240px] truncate text-xs text-gray-500">{image.description}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge color="info" className="w-fit">
                            {getSectionLabel(image.section)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge color={image.isActive ? "success" : "failure"}>
                            {image.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`${BASE}/${image.section}`} title="Edit section">
                              <div className="w-fit rounded-md bg-blue-600 p-2 transition-colors hover:bg-blue-700">
                                <HiPencil size={16} className="text-white" />
                              </div>
                            </Link>
                            <DeleteStaticImageButton id={image.id} adminScope={SCOPE} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={TABLE_COLUMNS.length} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center gap-3">
                          <span className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            <ImageIcon size={20} />
                          </span>
                          <span>{getEmptyListMessage("static images", false)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <Pagination />
        </div>
      </Card>
    </div>
  );
}
