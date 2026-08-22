"use client";

import { createNotificationEventType, createNotificationTemplate } from "@/actions/notificationActions";
import MyButton from "@/components/MyButton";
import {
  Button,
  Label,
  Select,
  TextInput,
  Textarea,
  ToggleSwitch,
} from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiX } from "react-icons/hi";

function extractPlaceholdersFromBody(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const names = matches.map((m) => m.slice(2, -2));
  return [...new Set(names)];
}

interface CreateTemplateFormProps {
  eventTypes: { id: string; name: string }[];
  recipientRoles: string[];
}

const CHANNELS = ["email", "whatsapp", "sms", "app"] as const;

export default function CreateTemplateForm({
  eventTypes: initialEventTypes,
  recipientRoles,
}: CreateTemplateFormProps) {
  const [loading, startTransition] = useTransition();
  const [addingEventType, setAddingEventType] = useTransition();
  const [addingEventTypeLoading, setAddingEventTypeLoading] = useState(false);
  const router = useRouter();
  const [eventTypesList, setEventTypesList] = useState(initialEventTypes);
  const [showAddEventType, setShowAddEventType] = useState(false);
  const [newEventTypeName, setNewEventTypeName] = useState("");
  const [channel, setChannel] = useState<string>("email");
  const [eventTypeId, setEventTypeId] = useState(initialEventTypes[0]?.id ?? "");
  const [recipientRole, setRecipientRole] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [language, setLanguage] = useState("en");
  const [version, setVersion] = useState("1");

  const placeholdersInBody = useMemo(() => extractPlaceholdersFromBody(body), [body]);

  useEffect(() => {
    setEventTypesList((prev) => {
      const fromInitial = initialEventTypes.filter((e) => !prev.some((p) => p.id === e.id));
      if (fromInitial.length === 0) return prev;
      return [...prev, ...fromInitial];
    });
  }, [initialEventTypes]);

  useEffect(() => {
    if (eventTypesList.length && !eventTypesList.some((e) => e.id === eventTypeId)) {
      setEventTypeId(eventTypesList[0].id);
    }
  }, [eventTypesList, eventTypeId]);

  const handleAddEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEventTypeName.trim();
    if (!name) {
      toast.error("Enter an event type name");
      return;
    }
    setAddingEventTypeLoading(true);
    setAddingEventType(() => {
      createNotificationEventType(name)
        .then((res) => {
          if (res.success && res.data) {
            setEventTypesList((prev) => [...prev, res.data!]);
            setEventTypeId(res.data.id);
            setNewEventTypeName("");
            setShowAddEventType(false);
            toast.success(`Event type "${res.data.name}" added`);
          } else {
            toast.error(res.error ?? "Failed to add event type");
          }
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to add event type";
          toast.error(msg);
        })
        .finally(() => setAddingEventTypeLoading(false));
    });
  };

  useEffect(() => {
    setVariableValues((prev) => {
      let next = prev;
      for (const name of placeholdersInBody) {
        if (!(name in next)) next = { ...next, [name]: "" };
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
    if (channel === "email" && !subject.trim()) {
      toast.error("Email templates require a subject");
      return;
    }
    if (channel === "app" && !title.trim()) {
      toast.error("App templates require a title");
      return;
    }

    startTransition(() => {
      const promise = createNotificationTemplate({
        channel,
        eventTypeId,
        recipientRole: recipientRole === "" ? null : recipientRole,
        templateName: templateName.trim(),
        subject: channel === "email" ? subject.trim() || null : null,
        title: channel === "app" ? title.trim() || null : null,
        body: body.trim(),
        variables: placeholdersInBody.length > 0 ? variables : null,
        isActive,
        language: language.trim() || "en",
        version: versionNum,
      }).then((res) => {
        if (!res.success) throw new Error(res.error ?? "Failed to create template");
        return res;
      });

      toast.promise(promise, {
        loading: "Creating template...",
        success: (res) => {
          if (res.data?.id) {
            router.push(`/admin/notifications/templates/${res.data.id}`);
            router.refresh();
          } else {
            router.push("/admin/notifications/templates");
            router.refresh();
          }
          return "Template created";
        },
        error: (err) => (err instanceof Error ? err.message : "Failed to create"),
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <section className="space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Template details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="channel" className="mb-1.5 block">Channel</Label>
            <Select id="channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full">
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="eventTypeId" className="mb-1.5 block">Notification event type</Label>
            {eventTypesList.length === 0 && !showAddEventType ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/50">
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  No event types yet. Add your first one to create templates for it.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => setShowAddEventType(true)}
                >
                  <HiPlus className="h-4 w-4" />
                  Add event type
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Select
                    id="eventTypeId"
                    value={eventTypeId}
                    onChange={(e) => setEventTypeId(e.target.value)}
                    className="w-full sm:max-w-xs"
                  >
                    {eventTypesList.map((e) => (
                      <option key={e.id} value={e.id}>{e.name.replace(/_/g, " ")}</option>
                    ))}
                  </Select>
                  {!showAddEventType ? (
                    <button
                      type="button"
                      onClick={() => setShowAddEventType(true)}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:border-gray-500"
                    >
                      <HiPlus className="h-4 w-4 shrink-0" />
                      Add new event type
                    </button>
                  ) : null}
                </div>
                {showAddEventType ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/50">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Label htmlFor="newEventTypeName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        New event type name
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEventType(false);
                          setNewEventTypeName("");
                        }}
                        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                        aria-label="Cancel"
                      >
                        <HiX className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                      Use lowercase with underscores (e.g. <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">booking_confirmed</code>).
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <TextInput
                          id="newEventTypeName"
                          value={newEventTypeName}
                          onChange={(e) => setNewEventTypeName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddEventType({ preventDefault: () => {} } as React.FormEvent);
                            }
                          }}
                          placeholder="e.g. promo_offer"
                          disabled={addingEventTypeLoading}
                          className="w-full"
                        />
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <MyButton
                          type="button"
                          size="sm"
                          loading={addingEventTypeLoading}
                          onClick={() => handleAddEventType({ preventDefault: () => {} } as React.FormEvent)}
                        >
                          Add event type
                        </MyButton>
                        <Button
                          type="button"
                          size="sm"
                          color="light"
                          onClick={() => {
                            setShowAddEventType(false);
                            setNewEventTypeName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
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
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="templateName" className="mb-1.5 block">Template name</Label>
            <TextInput
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. my_event_customer"
              required
              className="w-full"
            />
          </div>
          {channel === "email" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="subject" className="mb-1.5 block">Subject</Label>
              <TextInput
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                required={channel === "email"}
                className="w-full"
              />
            </div>
          )}
          {channel === "app" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="title" className="mb-1.5 block">Title</Label>
              <TextInput
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Push notification title"
                required={channel === "app"}
                className="w-full"
              />
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Body
          </h3>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hello {{customerName}}, your booking {{bookingId}}..."
            rows={18}
            required
            className="min-h-[320px] w-full flex-1 font-mono text-sm leading-relaxed"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">{"{{variableName}}"}</code> for
            placeholders. Variables appear in the panel on the right.
          </p>
        </div>
        <div className="flex flex-col lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Variables {placeholdersInBody.length > 0 && `(${placeholdersInBody.length})`}
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
                  <Label htmlFor={`var-${name}`} className="mb-1.5 block font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                    {"{{ " + name + " }}"}
                  </Label>
                  <TextInput
                    id={`var-${name}`}
                    value={variableValues[name] ?? ""}
                    onChange={(e) => setVariableValues((prev) => ({ ...prev, [name]: e.target.value }))}
                    placeholder={`Value for ${name}`}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-gray-200 pt-8 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-28">
            <Label htmlFor="language" className="mb-1.5 block text-sm">Language</Label>
            <TextInput id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="w-full" />
          </div>
          <div className="w-24">
            <Label htmlFor="version" className="mb-1.5 block text-sm">Version</Label>
            <TextInput id="version" type="number" min={1} value={version} onChange={(e) => setVersion(e.target.value)} className="w-full" />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800">
            <ToggleSwitch checked={isActive} label="Active" onChange={setIsActive} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MyButton type="submit" loading={loading}>Create template</MyButton>
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
