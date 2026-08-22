import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, LayoutTemplate, Tags } from "lucide-react";
import { Card } from "flowbite-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import {
  BRAND_CONTENT_ROUTES,
  brandContentBreadcrumbLabel,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";

type BrandSettingsOverviewPageProps = {
  scope: BrandAdminScope;
};

const SECTION_META = {
  cms: {
    title: "CMS Content",
    description: "Manage long-form pages, metadata, and publishing status.",
    icon: FileText,
    accent: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    cta: "Open CMS",
  },
  webCarousel: {
    title: "Web Carousel",
    description: "Update homepage-style banners for wider website layouts.",
    icon: LayoutTemplate,
    accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    cta: "Open Web Carousel",
  },
  appCarousel: {
    title: "App Carousel",
    description: "Control mobile-first banner artwork and in-app promotion order.",
    icon: ImageIcon,
    accent: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    cta: "Open App Carousel",
  },
  tags: {
    title: "Tags",
    description: "Maintain reusable labels and color coding across content.",
    icon: Tags,
    accent: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
    cta: "Open Tags",
  },
} as const;

export default function BrandSettingsOverviewPage({ scope }: BrandSettingsOverviewPageProps) {
  const routes = BRAND_CONTENT_ROUTES[scope];
  const pageTitle = scope === "mago" ? "Mago Settings" : "Instafarm Settings";

  const cards = [
    { href: routes.cms, ...SECTION_META.cms },
    { href: routes.webCarousel, ...SECTION_META.webCarousel },
    { href: routes.appCarousel, ...SECTION_META.appCarousel },
    { href: routes.tags, ...SECTION_META.tags },
  ];

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl dark:border-slate-700">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                    Content control center
                  </span>
                  <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-100">
                    {pageTitle}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">{pageTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Jump into the exact content area you want to manage, from page content and tags to web and app carousel assets.
                </p>
                <PageBreadcrumb
                  items={[
                    { href: "/", label: "Home" },
                    { href: "/admin", label: "Admin" },
                    { href: "#", label: brandContentBreadcrumbLabel(scope) },
                  ]}
                  className="mt-4 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div className={`inline-flex rounded-full p-2 ${card.accent}`}>
                      <card.icon size={16} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{card.cta}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Content Areas</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Each workspace focuses on a different part of the brand experience.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <Link key={card.href} href={card.href} className="group block">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-cyan-400 dark:hover:bg-slate-800">
                    <div className="flex items-start gap-3">
                      <span className={`rounded-2xl p-3 ${card.accent}`}>
                        <card.icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                          {card.cta}
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
