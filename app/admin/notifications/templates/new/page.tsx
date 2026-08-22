import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";
import { getNotificationTemplateEnums } from "@/actions/notificationActions";
import CreateTemplateForm from "./CreateTemplateForm";

export default async function Page() {
  const enums = await getNotificationTemplateEnums();

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-700">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Notification Template
          </h5>
          <Breadcrumb className="bg-transparent pb-0 dark:bg-transparent">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/notifications">Notifications</BreadcrumbItem>
            <BreadcrumbItem href="/admin/notifications/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem href="#">New</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className="w-full rounded-xl bg-slate-50/80 p-6 sm:p-8 lg:p-10 dark:bg-gray-900/50">
          <CreateTemplateForm
            eventTypes={enums.eventTypes}
            recipientRoles={enums.recipientRoles}
          />
        </div>
      </Card>
    </div>
  );
}
