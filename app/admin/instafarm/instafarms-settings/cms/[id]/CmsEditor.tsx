"use client";

import MyButton from "@/components/MyButton";
import RichTextEditor from "@/components/RichTextEditor";
import DeleteCmsButton from "../../DeleteCmsButton";
import { CMS } from "@/utils/types";
import { useCmsEditorForm } from "@/hooks/useCmsEditorForm";
import { Checkbox, Label, TextInput, Textarea } from "flowbite-react";
import {
  HiAdjustments,
  HiCheckCircle,
  HiClipboardList,
  HiClock,
  HiDocumentText,
  HiEye,
  HiGlobeAlt,
  HiLightningBolt,
  HiPencilAlt,
  HiSparkles,
} from "react-icons/hi";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import { useEffect, useState } from "react";

interface CmsEditorProps {
  data?: CMS;
  brandScope?: BrandAdminScope;
}

function formatHtml(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const normalized = trimmed
    .replace(/>\s+</g, "><")
    .replace(/</g, "\n<")
    .replace(/\n+/g, "\n")
    .trim();

  const tokens = normalized.split("\n").filter(Boolean);
  let indentLevel = 0;

  return tokens
    .map((token) => {
      const current = token.trim();
      const isClosingTag = /^<\//.test(current);
      const isComment = /^<!--/.test(current);
      const isOpeningTag = /^<[^/!][^>]*>$/.test(current);
      const tagMatch = current.match(/^<\/?([a-zA-Z0-9-]+)/);
      const tagName = tagMatch?.[1]?.toLowerCase() ?? "";
      const isVoidTag =
        current.endsWith("/>") ||
        voidTags.has(tagName) ||
        /^<!/.test(current);
      const hasInlineContent = /^<[^>]+>[^<]+<\/[^>]+>$/.test(current);

      if (isClosingTag) {
        indentLevel = Math.max(indentLevel - 1, 0);
      }

      const line = `${"  ".repeat(indentLevel)}${current}`;

      if (!isClosingTag && !isComment && isOpeningTag && !isVoidTag && !hasInlineContent) {
        indentLevel += 1;
      }

      return line;
    })
    .join("\n");
}

export default function CmsEditor({ data, brandScope = "instafarms" }: CmsEditorProps) {
  const { fields, setField, activeTab, setActiveTab, loading, handleSubmit } = useCmsEditorForm(data, { brandScope });
  const [contentView, setContentView] = useState<"edit" | "html" | "preview">("edit");
  const [htmlDraft, setHtmlDraft] = useState("");

  const descriptionLength = fields.metaDescription.trim().length;
  const contentWords = fields.content.trim().split(/\s+/).filter(Boolean).length;
  const contentLines = fields.content.split(/\n/).filter((line) => line.trim().length > 0).length;
  const seoFieldCount = [fields.metaTitle, fields.metaDescription, fields.metaUrl, fields.metaImage].filter(
    (value) => value.trim().length > 0
  ).length;
  const recommendedMetaTitle = fields.metaTitle.trim().length >= 35 && fields.metaTitle.trim().length <= 65;
  const recommendedMetaDescription = descriptionLength >= 120 && descriptionLength <= 160;
  const canonicalLooksValid =
    fields.metaUrl.trim().length === 0 || /^https?:\/\/\S+/i.test(fields.metaUrl.trim());
  const contentReady = Boolean(fields.title.trim() && fields.heading.trim() && fields.content.trim());
  const completionItems = [
    {
      label: "Core content",
      done: contentReady,
      hint: "Title, heading, and body are filled.",
    },
    {
      label: "SEO basics",
      done: seoFieldCount >= 3,
      hint: "At least 3 SEO fields are filled.",
    },
    {
      label: "Search snippet quality",
      done: recommendedMetaTitle && recommendedMetaDescription,
      hint: "Title and description are in a healthy range.",
    },
    {
      label: "Ready to publish",
      done: Boolean(fields.isActive && contentReady),
      hint: "Page is active and has content.",
    },
  ];
  const completionCount = completionItems.filter((item) => item.done).length;
  const excerpt = fields.content.trim().replace(/\s+/g, " ").slice(0, 180);

  useEffect(() => {
    if (contentView === "html") {
      setHtmlDraft(formatHtml(fields.content));
    }
  }, [contentView, fields.content]);

  return (
    <form action={handleSubmit} className="flex w-full flex-col gap-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm dark:border-gray-700 dark:from-slate-900 dark:via-gray-900 dark:to-emerald-950/40">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                <HiDocumentText className="h-4 w-4" />
                CMS Editor
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  fields.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                }`}
              >
                <HiLightningBolt className="h-4 w-4" />
                {fields.isActive ? "Live on site" : "Draft mode"}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {fields.title.trim() || data?.title || "Untitled CMS page"}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                Shape the page content and its SEO metadata side by side, with live guidance for publishing quality.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Words</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{contentWords}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Content blocks</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{contentLines}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">SEO fields</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{seoFieldCount}/4</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Readiness</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{completionCount}/4</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-lg dark:bg-black/40 lg:max-w-sm">
            <div className="flex items-start gap-3">
              <HiSparkles className="mt-1 h-5 w-5 text-emerald-300" />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Editor guidance</p>
                <p className="text-sm leading-6 text-slate-300">
                  Keep the content tab focused on page storytelling, then switch to SEO to tighten how the page appears in search and sharing previews.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-100 p-2 dark:bg-gray-950 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                activeTab === "content"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <HiClipboardList className="h-4 w-4" />
                Content
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{contentWords} words</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("seo")}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition ${
                activeTab === "seo"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <HiAdjustments className="h-4 w-4" />
                SEO Metadata
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{seoFieldCount}/4 complete</span>
            </button>
          </div>

          {activeTab === "content" ? (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    <HiPencilAlt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Page identity</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Start with a clear internal title and the headline users will see on the page.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2 block">
                      <Label htmlFor="title">Title</Label>
                    </div>
                    <TextInput
                      id="title"
                      name="title"
                      placeholder="Weekend Getaways Landing Page"
                      required
                      value={fields.title}
                      onChange={(e) => setField("title", e.target.value)}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Used to identify this CMS entry inside admin.</p>
                  </div>
                  <div>
                    <div className="mb-2 block">
                      <Label htmlFor="heading">Heading</Label>
                    </div>
                    <TextInput
                      id="heading"
                      name="heading"
                      placeholder="Escape to handpicked farm stays"
                      required
                      value={fields.heading}
                      onChange={(e) => setField("heading", e.target.value)}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Primary page headline shown to visitors.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 block">
                    <Label htmlFor="subHeading">Sub Heading</Label>
                  </div>
                  <TextInput
                    id="subHeading"
                    name="subHeading"
                    placeholder="Add a short supporting line that sets the tone"
                    value={fields.subHeading}
                    onChange={(e) => setField("subHeading", e.target.value)}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <HiDocumentText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Page content</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Write the body copy here. Keep the first lines strong because they often become the preview hook.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="content">Content</Label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{contentWords} words</span>
                    </div>
                    <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-gray-900">
                      <button
                        type="button"
                        onClick={() => setContentView("edit")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          contentView === "edit"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-gray-800 dark:text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentView("html")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          contentView === "html"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-gray-800 dark:text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentView("preview")}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          contentView === "preview"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-gray-800 dark:text-white"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  {contentView === "edit" ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <RichTextEditor
                        value={fields.content}
                        placeholder="Describe the experience, what makes the page valuable, and any key details visitors should know."
                        onChange={(newContent) => setField("content", newContent)}
                        className="w-full"
                      />
                    </div>
                  ) : contentView === "html" ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Source view with readable indentation for direct HTML editing.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = formatHtml(htmlDraft);
                            setHtmlDraft(formatted);
                            setField("content", formatted);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-gray-800"
                        >
                          Format HTML
                        </button>
                      </div>
                      <Textarea
                        id="contentHtml"
                        name="contentHtml"
                        rows={22}
                        value={htmlDraft}
                        onChange={(e) => {
                          setHtmlDraft(e.target.value);
                          setField("content", e.target.value);
                        }}
                        onBlur={(e) => {
                          const formatted = formatHtml(e.target.value);
                          setHtmlDraft(formatted);
                          setField("content", formatted);
                        }}
                        className="font-mono text-sm leading-6"
                        placeholder="<p>Write or paste HTML here...</p>"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Raw HTML mode is useful for cleaning pasted markup or making precise edits.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-gray-700 dark:bg-gray-900/70">
                      {fields.content.trim() ? (
                        <div
                          className="cms-content-preview jodit-wysiwyg prose max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: fields.content }}
                        />
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Add content in the editor to see the rendered preview here.
                        </p>
                      )}
                    </div>
                  )}
                  <input
                    type="hidden"
                    id="content"
                    name="content"
                    value={fields.content}
                    readOnly
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Rich formatting is supported here and will be saved as HTML.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-gray-600 dark:bg-gray-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Preview excerpt</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {excerpt || "Your content preview will appear here once you start typing."}
                    {excerpt.length === 180 ? "..." : ""}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    <HiGlobeAlt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Search appearance</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Tune how this page presents itself in search results and social previews.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Google-style preview</p>
                  <p className="mt-3 text-lg font-medium text-blue-700 dark:text-sky-400">
                    {fields.metaTitle.trim() || fields.heading.trim() || "Meta title preview"}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                    {fields.metaUrl.trim() || "https://www.instafarms.com/example-page"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {fields.metaDescription.trim() || "Write a concise description to show what this page is about and why someone should click it."}
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <span className={`text-xs ${recommendedMetaTitle ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {fields.metaTitle.trim().length}/65
                      </span>
                    </div>
                    <TextInput
                      id="metaTitle"
                      name="metaTitle"
                      placeholder="Write a concise, click-worthy SEO title"
                      value={fields.metaTitle}
                      onChange={(e) => setField("metaTitle", e.target.value)}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Aim for roughly 35 to 65 characters.</p>
                  </div>
                  <div>
                    <div className="mb-2 block">
                      <Label htmlFor="metaUrl">Meta URL</Label>
                    </div>
                    <TextInput
                      id="metaUrl"
                      name="metaUrl"
                      placeholder="https://www.instafarms.com/your-page"
                      value={fields.metaUrl}
                      onChange={(e) => setField("metaUrl", e.target.value)}
                    />
                    <p className={`mt-2 text-xs ${canonicalLooksValid ? "text-slate-500 dark:text-slate-400" : "text-red-600 dark:text-red-400"}`}>
                      {canonicalLooksValid ? "Use the canonical public URL for this page." : "Enter a full URL starting with http:// or https://"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <span className={`text-xs ${recommendedMetaDescription ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {descriptionLength}/160
                    </span>
                  </div>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    rows={5}
                    placeholder="Summarize the page in a clear, compelling sentence for search engines and social sharing."
                    value={fields.metaDescription}
                    onChange={(e) => setField("metaDescription", e.target.value)}
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Recommended range: 120 to 160 characters.</p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 block">
                    <Label htmlFor="metaImage">Meta Image URL</Label>
                  </div>
                  <TextInput
                    id="metaImage"
                    name="metaImage"
                    placeholder="https://cdn.example.com/og-image.jpg"
                    value={fields.metaImage}
                    onChange={(e) => setField("metaImage", e.target.value)}
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Publishing</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Control page visibility and save changes.</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  fields.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-slate-200"
                }`}
              >
                {fields.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <label
              htmlFor="isActive"
              className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/70"
            >
              <Checkbox
                id="isActive"
                name="isActive"
                checked={fields.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Make this page live</p>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Turn this on when the content and SEO details are ready for users.
                </p>
              </div>
            </label>

            <div className="mt-5 flex flex-col gap-3">
              <MyButton type="submit" loading={loading} className="w-full">
                Save CMS Content
              </MyButton>
              {data?.id ? <DeleteCmsButton id={data.id} brandScope={brandScope} showLabel /> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <HiCheckCircle className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Readiness checklist</h3>
            </div>
            <div className="mt-4 space-y-3">
              {completionItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                        item.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {item.done ? "\u2713" : "!"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{item.hint}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <HiEye className="h-5 w-5 text-sky-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Quick snapshot</h3>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-900/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Headline</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                  {fields.heading.trim() || "No heading added yet"}
                </p>
                {fields.subHeading?.trim() ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{fields.subHeading}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <HiClock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Mode</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {activeTab === "content" ? "Content editing" : "SEO editing"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <HiAdjustments className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">SEO score</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{seoFieldCount}/4 fields</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
