"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, FileInput, Label, TextInput, Textarea } from "flowbite-react";
import { Globe2, Image as ImageIcon, Phone, Search, ShieldCheck } from "lucide-react";

import { updateSiteSettings } from "@/actions/settingsActions";
import { SETTINGS_ERRORS, SETTINGS_SCOPE_FORM_FIELD, type SiteSettingsScope } from "@/constants/settings";

interface SettingsFormProps {
  adminScope?: SiteSettingsScope;
  formId?: string;
  showStickySaveBar?: boolean;
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
}

type SettingsTab = "contact" | "seo" | "watermarks";

type SettingsFields = {
  homePageNumber: string;
  supportNumber: string;
  supportEmail: string;
  whatsappNumber: string;
  centralBookingNumber: string;
  siteTitle: string;
  siteMetaTitle: string;
  siteMetaKeywords: string;
  siteMetaDescription: string;
};

function buildInitialFields(initialSettings: SettingsFormProps["initialSettings"]): SettingsFields {
  const normalizePhone = (value?: string | null) => (value || "").replace(/\D/g, "").slice(0, 10);

  return {
    homePageNumber: normalizePhone(initialSettings.homePageNumber),
    supportNumber: normalizePhone(initialSettings.supportNumber),
    supportEmail: initialSettings.supportEmail || "",
    whatsappNumber: normalizePhone(initialSettings.whatsappNumber),
    centralBookingNumber: normalizePhone(initialSettings.centralBookingNumber),
    siteTitle: initialSettings.siteTitle || "",
    siteMetaTitle: initialSettings.siteMetaTitle || "",
    siteMetaKeywords: initialSettings.siteMetaKeywords || "",
    siteMetaDescription: initialSettings.siteMetaDescription || "",
  };
}

function isValidEmail(email: string): boolean {
  if (!email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeTenDigitPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function getLengthTone(length: number, min: number, max: number) {
  if (length === 0) return "text-slate-500 dark:text-slate-400";
  if (length < min) return "text-amber-600 dark:text-amber-300";
  if (length > max) return "text-rose-600 dark:text-rose-300";
  return "text-emerald-600 dark:text-emerald-300";
}

function SectionCard({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsForm({
  adminScope = "instafarms",
  formId = "site-settings-form",
  showStickySaveBar = true,
  initialSettings,
  instafarmWatermarkUrl,
}: SettingsFormProps) {
  const router = useRouter();
  const initialFields = buildInitialFields(initialSettings);
  const [savedFields, setSavedFields] = useState<SettingsFields>(initialFields);
  const [fields, setFields] = useState<SettingsFields>(initialFields);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [instafarmWatermarkName, setInstafarmWatermarkName] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("contact");

  useEffect(() => {
    const nextFields = buildInitialFields(initialSettings);
    setSavedFields(nextFields);
    setFields(nextFields);
    setInstafarmWatermarkName("");
  }, [initialSettings]);

  const isDirty =
    Object.keys(fields).some((key) => fields[key as keyof SettingsFields] !== savedFields[key as keyof SettingsFields]) ||
    Boolean(instafarmWatermarkName);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || isPending) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isPending]);

  const updateField = (key: keyof SettingsFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (formData: FormData) => {
    Object.entries(fields).forEach(([key, value]) => {
      formData.set(key, value);
    });

    startTransition(() => {
      updateSiteSettings(formData)
        .then((result) => {
          if (result.success) {
            setSavedFields(fields);
            setInstafarmWatermarkName("");
            setMessage({ type: "success", text: result.success });
            router.refresh();
          } else if (result.error) {
            setMessage({ type: "error", text: result.error });
          }

          setTimeout(() => setMessage(null), 5000);
        })
        .catch(() => {
          setMessage({ type: "error", text: SETTINGS_ERRORS.updateFailed });
          setTimeout(() => setMessage(null), 5000);
        });
    });
  };

  const metaTitleLength = fields.siteMetaTitle.trim().length;
  const metaDescriptionLength = fields.siteMetaDescription.trim().length;
  const metaDescriptionWords = fields.siteMetaDescription.trim().split(/\s+/).filter(Boolean).length;
  const emailLooksValid = !fields.supportEmail || isValidEmail(fields.supportEmail);
  const tabMeta: Array<{
    id: SettingsTab;
    label: string;
    description: string;
  }> = [
    { id: "contact", label: "Contact", description: "Phone, email, support" },
    { id: "seo", label: "SEO", description: "Search metadata" },
    { id: "watermarks", label: "Watermarks", description: "Branding assets" },
  ];
  const seoComplete = Boolean(fields.siteMetaTitle && fields.siteMetaDescription && fields.siteMetaKeywords);
  const watermarkComplete = Boolean(instafarmWatermarkUrl || instafarmWatermarkName);

  const getTabStatus = (tab: SettingsTab) => {
    if (tab === "contact") {
      return fields.supportNumber && fields.supportEmail && fields.centralBookingNumber ? "Ready" : "Pending";
    }
    if (tab === "seo") {
      return seoComplete ? "Ready" : "Pending";
    }
    return watermarkComplete ? "Configured" : "Optional";
  };

  return (
    <form id={formId} action={handleSubmit} noValidate className="space-y-6">
      <input type="hidden" name={SETTINGS_SCOPE_FORM_FIELD} value={adminScope} />

      {message ? (
        <Alert color={message.type === "success" ? "success" : "failure"}>
          {message.text}
        </Alert>
      ) : null}

      {isDirty ? (
        <Alert color="warning">
          You have unsaved changes. Save before leaving this page to avoid losing updates.
        </Alert>
      ) : null}

      <section className="rounded-2xl bg-slate-100 p-2 dark:bg-gray-950">
        <div className="grid gap-2 sm:grid-cols-3">
          {tabMeta.map((tab) => {
            const active = activeTab === tab.id;
            const status = getTabStatus(tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    active
                      ? "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-slate-200"
                      : "bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-80">{tab.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className={activeTab === "contact" ? "block" : "hidden"}>
        <SectionCard
          id="contact"
          title="Contact Information"
          description="These details are used across the public site and support touchpoints."
          icon={<Phone size={18} />}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="homePageNumber" className="mb-2 block">
                Home Page Number <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="homePageNumber"
                name="homePageNumber"
                type="tel"
                value={fields.homePageNumber}
                onChange={(e) => updateField("homePageNumber", normalizeTenDigitPhone(e.target.value))}
                placeholder="Enter 10 digit home page number"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Enter exactly 10 digits.</p>
            </div>

            <div>
              <Label htmlFor="supportNumber" className="mb-2 block">
                Support Number <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="supportNumber"
                name="supportNumber"
                type="tel"
                value={fields.supportNumber}
                onChange={(e) => updateField("supportNumber", normalizeTenDigitPhone(e.target.value))}
                placeholder="Enter 10 digit support number"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Enter exactly 10 digits.</p>
            </div>

            <div>
              <Label htmlFor="supportEmail" className="mb-2 block">
                Support Email <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="supportEmail"
                name="supportEmail"
                type="email"
                value={fields.supportEmail}
                onChange={(e) => updateField("supportEmail", e.target.value)}
                placeholder="Enter support email"
                color={emailLooksValid ? "gray" : "failure"}
                required
              />
              <p className={`mt-2 text-xs ${emailLooksValid ? "text-slate-500 dark:text-slate-400" : "text-rose-600 dark:text-rose-300"}`}>
                {emailLooksValid ? "Used for public-facing support contact." : "Enter a valid email address."}
              </p>
            </div>

            <div>
              <Label htmlFor="whatsappNumber" className="mb-2 block">
                WhatsApp Number <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                value={fields.whatsappNumber}
                onChange={(e) => updateField("whatsappNumber", normalizeTenDigitPhone(e.target.value))}
                placeholder="Enter 10 digit WhatsApp number"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Enter exactly 10 digits.</p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="centralBookingNumber" className="mb-2 block">
                Central Booking Number <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="centralBookingNumber"
                name="centralBookingNumber"
                type="tel"
                value={fields.centralBookingNumber}
                onChange={(e) => updateField("centralBookingNumber", normalizeTenDigitPhone(e.target.value))}
                placeholder="Enter 10 digit central booking number"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Enter exactly 10 digits.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className={activeTab === "seo" ? "block" : "hidden"}>
        <SectionCard
          id="seo"
          title="SEO & Brand Metadata"
          description="Tune how the site is presented in browser tabs and search results."
          icon={<Search size={18} />}
        >
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  <Globe2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Search appearance</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tune how the site presents itself in search results and social previews.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Google-style preview
                </p>
                <p className="mt-3 text-[1.7rem] font-medium leading-tight text-blue-700 dark:text-sky-400">
                  {fields.siteMetaTitle.trim() || fields.siteTitle.trim() || "Meta title preview"}
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                  {adminScope === "mago" ? "https://mago.example/" : "https://instafarms.example/"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {fields.siteMetaDescription.trim() || "Write a concise description to show what this site is about and why someone should click it."}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="siteTitle" className="mb-2 block">
                Site Title <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id="siteTitle"
                name="siteTitle"
                type="text"
                value={fields.siteTitle}
                onChange={(e) => updateField("siteTitle", e.target.value)}
                placeholder="Enter site title"
                required
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label htmlFor="siteMetaTitle" className="block">
                    Site Meta Title <span className="text-red-500">*</span>
                  </Label>
                  <span className={`text-xs font-medium ${getLengthTone(metaTitleLength, 50, 60)}`}>
                    {metaTitleLength} chars
                  </span>
                </div>
                <TextInput
                  id="siteMetaTitle"
                  name="siteMetaTitle"
                  type="text"
                  value={fields.siteMetaTitle}
                  onChange={(e) => updateField("siteMetaTitle", e.target.value)}
                  placeholder="Enter site meta title"
                  required
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Ideal length: 50 to 60 characters.</p>
              </div>

              <div>
                <div className="mb-2 block">
                  <Label htmlFor="siteMetaKeywords">Site Meta Keywords <span className="text-red-500">*</span></Label>
                </div>
                <TextInput
                  id="siteMetaKeywords"
                  name="siteMetaKeywords"
                  type="text"
                  value={fields.siteMetaKeywords}
                  onChange={(e) => updateField("siteMetaKeywords", e.target.value)}
                  placeholder="Enter site meta keywords"
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label htmlFor="siteMetaDescription" className="block">
                  Site Meta Description <span className="text-red-500">*</span>
                </Label>
                <div className={`text-xs font-medium ${getLengthTone(metaDescriptionLength, 140, 160)}`}>
                  {metaDescriptionLength} chars, {metaDescriptionWords} words
                </div>
              </div>
              <Textarea
                id="siteMetaDescription"
                name="siteMetaDescription"
                value={fields.siteMetaDescription}
                onChange={(e) => updateField("siteMetaDescription", e.target.value)}
                placeholder="Your one stop destination for anything and everything related to Farmhouses!"
                rows={5}
                required
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Ideal length: 140 to 160 characters for search previews.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-gray-900">
                <p className="font-medium text-slate-900 dark:text-white">Meta title</p>
                <p className={`mt-1 ${getLengthTone(metaTitleLength, 50, 60)}`}>
                  {metaTitleLength === 0 ? "Not set yet" : metaTitleLength < 50 ? "A little short" : metaTitleLength > 60 ? "A little long" : "Good length"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-gray-900">
                <p className="font-medium text-slate-900 dark:text-white">Meta description</p>
                <p className={`mt-1 ${getLengthTone(metaDescriptionLength, 140, 160)}`}>
                  {metaDescriptionLength === 0 ? "Not set yet" : metaDescriptionLength < 140 ? "Could use more detail" : metaDescriptionLength > 160 ? "Could be tightened" : "Good length"}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className={activeTab === "watermarks" ? "block" : "hidden"}>
        <SectionCard
          id="watermarks"
          title="Watermark Assets"
          description="Upload branding assets used on property and listing imagery."
          icon={<ImageIcon size={18} />}
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
              <Label htmlFor="instafarmWatermark" className="mb-2 block">
                Add Instafarms Watermark
              </Label>
              <FileInput
                id="instafarmWatermark"
                name="instafarmWatermark"
                accept="image/*"
                className="w-full"
                onChange={(e) => setInstafarmWatermarkName(e.target.files?.[0]?.name || "")}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                PNG with transparent background usually works best.
              </p>
              {instafarmWatermarkName ? (
                <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  New file selected: {instafarmWatermarkName}
                </p>
              ) : null}
              {instafarmWatermarkUrl ? (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current watermark:</p>
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <img
                      src={instafarmWatermarkUrl}
                      alt="Instafarm Watermark"
                      className="h-16 w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      {showStickySaveBar ? (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-blue-500/15 p-2 text-blue-600 dark:text-blue-300">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isDirty ? "Unsaved changes detected" : "All changes saved"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isDirty
                      ? "Save now to keep contact details, SEO, and watermark updates in sync."
                      : "Your current site configuration is up to date."}
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full sm:w-auto px-8 py-2">
                {isPending ? "Saving..." : "Save Site Settings"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
