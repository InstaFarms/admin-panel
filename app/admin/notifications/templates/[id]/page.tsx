import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  Badge,
} from "flowbite-react";
import { ServerPageProps } from "@/utils/types";
import { getNotificationTemplateById, getNotificationTemplateEnums } from "@/actions/notificationActions";
import TemplateEditor from "./TemplateEditor";

const CHANNEL_BADGE_COLOR: Record<string, "blue" | "green" | "yellow" | "purple" | "gray"> = {
  email: "blue",
  whatsapp: "green",
  sms: "yellow",
  app: "purple",
};

export default async function Page({ params }: ServerPageProps) {
  const { id } = await params;
  const idString = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

  const [result, enumsResult] = await Promise.all([
    getNotificationTemplateById(idString),
    getNotificationTemplateEnums(),
  ]);

  if (!result.success || !result.data) {
    throw new Error(result.error ?? "Template not found");
  }

  const template = result.data;
  const eventTypes = enumsResult.eventTypes ?? [];
  const recipientRoles = enumsResult.recipientRoles ?? [];
  const channelColor = CHANNEL_BADGE_COLOR[template.channel] ?? "gray";

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Edit Notification Template
            </h5>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={channelColor} className="capitalize">
                {template.channel}
              </Badge>
              <Badge color="gray">
                {template.notificationType.replace(/_/g, " ")}
              </Badge>
              <Badge color="gray">
                {template.recipientRole ?? "All roles"}
              </Badge>
            </div>
          </div>
          <Breadcrumb className="bg-transparent pb-0 dark:bg-transparent">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/notifications">Notifications</BreadcrumbItem>
            <BreadcrumbItem href="/admin/notifications/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem href="#">Edit</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className="w-full rounded-xl bg-slate-50/80 p-6 sm:p-8 lg:p-10 dark:bg-gray-900/50">
          <TemplateEditor template={template} eventTypes={eventTypes} recipientRoles={recipientRoles} />
        </div>
      </Card>
    </div>
  );
}
