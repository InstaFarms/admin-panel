"use client";

import { updateNotificationTemplate } from "@/actions/notificationActions";
import type { NotificationTemplate } from "@/actions/notificationActions";
import MyButton from "@/components/MyButton";
import {
  Label,
  Select,
  TextInput,
  Textarea,
  ToggleSwitch,
} from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo, useEffect } from "react";
import toast from "react-hot-toast";

interface TemplateEditorProps {
  template: NotificationTemplate;
  eventTypes: { id: string; name: string }[];
  recipientRoles: string[];
}

/** Extract unique {{variableName}} placeholders from body (supports alphanumeric and underscore). */
function extractPlaceholdersFromBody(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const names = matches.map((m) => m.slice(2, -2));
  return [...new Set(names)];
}

export default function TemplateEditor({ template, eventTypes, recipientRoles }: TemplateEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const [templateName, setTemplateName] = useState(template.templateName);
  const [eventTypeId, setEventTypeId] = useState(template.eventTypeId ?? "");
  const [recipientRole, setRecipientRole] = useState<string>(template.recipientRole ?? "");
  const [subject, setSubject] = useState(template.subject ?? "");
  const [title, setTitle] = useState(template.title ?? "");
  const [body, setBody] = useState(template.body);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    () => template.variables ?? {}
  );
  const [isActive, setIsActive] = useState(template.isActive);
  const [language, setLanguage] = useState(template.language);
  const [version, setVersion] = useState(String(template.version));

  const placeholdersInBody = useMemo(() => extractPlaceholdersFromBody(body), [body]);

  // When body gets new {{placeholders}}, add them to variableValues with empty string
  useEffect(() => {
    setVariableValues((prev) => {
      let next = prev;
      for (const name of placeholdersInBody) {
        if (!(name in next)) {
          next = { ...next, [name]: "" };
        }
      }
      return next;
    });
  }, [placeholdersInBody.join(",")]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const variables: Record<string, string> = {};
    for (const name of placeholdersInBody) {
      variables[name] = variableValues[name] ?? "";
    }
    if (!body.trim()) {
      toast.error("Body cannot be empty");
      return;
    }
    if (!templateName.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }
    const versionNum = parseInt(version, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      toast.error("Version must be a positive integer");
      return;
    }
    if (template.channel === "email" && !subject.trim()) {
      toast.error("Email templates require a subject");
      return;
    }
    if (template.channel === "app" && !title.trim()) {
      toast.error("App templates require a title");
      return;
    }

    startTransition(() => {
      const promise = updateNotificationTemplate(template.id, {
        templateName: templateName.trim(),
        eventTypeId,
        recipientRole: recipientRole === "" ? null : recipientRole,
        subject: template.channel === "email" ? subject.trim() || null : null,
        title: template.channel === "app" ? title.trim() || null : null,
        body: body.trim(),
        variables: placeholdersInBody.length > 0 ? variables : null,
        isActive,
        language: language.trim() || "en",
        version: versionNum,
      }).then((res) => {
        if (!res.success) throw new Error(res.error ?? "Failed to save");
        return res;
      });

      toast.promise(promise, {
        loading: "Saving template...",
        success: () => {
          router.push("/admin/notifications/templates");
          router.refresh();
          return "Template saved";
        },
        error: (err) => (err instanceof Error ? err.message : "Failed to save"),
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* Template details */}
      <section className="space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Template details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="templateName" className="mb-1.5 block">Template name</Label>
            <TextInput
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. booking_confirm_customer"
              required
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="eventTypeId" className="mb-1.5 block">Notification event type</Label>
            <Select
              id="eventTypeId"
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
              className="w-full"
            >
              {eventTypes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="recipientRole" className="mb-1.5 block">Recipient role</Label>
            <Select
              id="recipientRole"
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              className="w-full"
            >
              <option value="">All roles</option>
              {recipientRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </div>
          {template.channel === "email" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="subject" className="mb-1.5 block">Subject</Label>
              <TextInput
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                required
                className="w-full"
              />
            </div>
          )}
          {template.channel === "app" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="title" className="mb-1.5 block">Title</Label>
              <TextInput
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Push notification title"
                required
                className="w-full"
              />
            </div>
          )}
        </div>
      </section>

      {/* Body (2/3) + Variables (1/3) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Body — 2/3 width on large screens */}
        <div className="flex flex-col lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Body
          </h3>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hello {{customerName}}, your booking {{bookingId}} is confirmed..."
            rows={18}
            required
            className="min-h-[320px] w-full flex-1 font-mono text-sm leading-relaxed"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">{"{{variableName}}"}</code> for
            placeholders. Variables appear in the panel on the right.
          </p>
        </div>

        {/* Variables — 1/3 width on large screens */}
        <div className="flex flex-col lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Variables
            {placeholdersInBody.length > 0 && (
              <span className="ml-2 font-normal normal-case text-gray-400">
                ({placeholdersInBody.length})
              </span>
            )}
          </h3>
          {placeholdersInBody.length === 0 ? (
            <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white/50 px-4 py-8 text-center dark:border-gray-600 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono dark:bg-gray-700">{"{{name}}"}</code> in the body to see inputs here.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
              {placeholdersInBody.map((name) => (
                <div key={name}>
                  <Label
                    htmlFor={`var-${name}`}
                    className="mb-1.5 block font-mono text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {"{{ " + name + " }}"}
                  </Label>
                  <TextInput
                    id={`var-${name}`}
                    value={variableValues[name] ?? ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                    placeholder={`Value for ${name}`}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Settings & actions */}
      <section className="flex flex-col gap-6 border-t border-gray-200 pt-8 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-28">
            <Label htmlFor="language" className="mb-1.5 block text-sm">Language</Label>
            <TextInput
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en"
              className="w-full"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="version" className="mb-1.5 block text-sm">Version</Label>
            <TextInput
              id="version"
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800">
            <ToggleSwitch
              checked={isActive}
              label="Active"
              onChange={setIsActive}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MyButton type="submit" loading={loading}>
            Save changes
          </MyButton>
          <button
            type="button"
            onClick={() => router.push("/admin/notifications/templates")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </section>
    </form>
  );
}
