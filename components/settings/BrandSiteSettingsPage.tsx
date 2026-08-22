import { Card } from "flowbite-react";
import { Globe2, Image as ImageIcon, Mail, Phone, TimerReset } from "lucide-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import BookingSettingsForm from "@/app/admin/settings/BookingSettingsForm";
import SettingsForm from "@/app/admin/settings/SettingsForm";
import type { SiteSettingsScope } from "@/constants/settings";

type BrandSiteSettingsPageProps = {
  scope: SiteSettingsScope;
  title: string;
  badgeLabel: string;
  breadcrumbs: { href: string; label: string }[];
  initialSettings: {
    homePageNumber?: string | null;
    supportNumber?: string | null;
    supportEmail?: string | null;
    whatsappNumber?: string | null;
    centralBookingNumber?: string | null;
    siteTitle?: string | null;
    siteMetaTitle?: string | null;
    siteMetaKeywords?: string | null;
    siteMetaDescription?: string | null;
  };
  instafarmWatermarkUrl?: string | null;
  bookingExpiryHours?: number;
};

export default function BrandSiteSettingsPage({
  scope,
  title,
  badgeLabel,
  breadcrumbs,
  initialSettings,
  instafarmWatermarkUrl,
  bookingExpiryHours,
}: BrandSiteSettingsPageProps) {
  const settingsFormId = `${scope}-site-settings-form`;
  const supportEmail = initialSettings.supportEmail || "Not set";
  const supportNumber = initialSettings.supportNumber || "Not set";
  const siteTitle = initialSettings.siteTitle || "Not set";
  const hasAnyWatermark = Boolean(instafarmWatermarkUrl);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl dark:border-slate-700">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                    Site configuration
                  </span>
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-100">
                    {badgeLabel}
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Manage public-facing contact details, search metadata, watermarks, and operational defaults from one clearer workspace.
                </p>
                <PageBreadcrumb items={breadcrumbs} className="mt-4 text-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Support</p>
                  <p className="mt-2 truncate text-sm font-semibold">{supportNumber}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-2 truncate text-sm font-semibold">{supportEmail}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Site Title</p>
                  <p className="mt-2 truncate text-sm font-semibold">{siteTitle}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Watermarks</p>
                  <p className="mt-2 text-sm font-semibold">{hasAnyWatermark ? "Configured" : "Not set"}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Site Settings</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Update public contact details, SEO defaults, and asset branding in one place.
                  </p>
                </div>
                <SettingsForm
                  adminScope={scope}
                  formId={settingsFormId}
                  showStickySaveBar={false}
                  initialSettings={initialSettings}
                  instafarmWatermarkUrl={instafarmWatermarkUrl}
                />
              </section>

              {typeof bookingExpiryHours === "number" ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Booking Workflow</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Control how long booking requests can remain pending before they expire automatically.
                    </p>
                  </div>
                  <BookingSettingsForm initialExpiryHours={bookingExpiryHours} />
                </section>
              ) : null}
            </div>

            <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Save Site Settings</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Apply contact, SEO, and watermark updates for this brand.
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <button
                    type="submit"
                    form={settingsFormId}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-500"
                  >
                    Save Site Settings
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configuration snapshot</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Phone size={16} />
                      <span className="text-sm font-medium">Support number</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{supportNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Mail size={16} />
                      <span className="text-sm font-medium">Support email</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">{supportEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Globe2 size={16} />
                      <span className="text-sm font-medium">Site title</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{siteTitle}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <ImageIcon size={16} />
                      <span className="text-sm font-medium">Watermarks</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {hasAnyWatermark ? "One or more watermark assets uploaded." : "No watermark assets uploaded yet."}
                    </p>
                  </div>
                  {typeof bookingExpiryHours === "number" ? (
                    <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <TimerReset size={16} />
                        <span className="text-sm font-medium">Booking expiry</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {bookingExpiryHours} hour{bookingExpiryHours === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Editor guidance</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    Keep contact fields current so support details stay reliable across the product.
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    Use a concise meta description that reads naturally in search previews.
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    Upload clean watermark assets with transparent backgrounds for the best visual result.
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </Card>
    </div>
  );
}
