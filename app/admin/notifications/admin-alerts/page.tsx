/**
 * Admin Alerts: which admin panel roles are emailed for which admin.* event.
 * P1 rules email the role the moment the event fires; P2 rules are held for the
 * daily digest (Phase 2) and send nothing today. Rules ship seeded and editable.
 */
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getAdminAlertRules } from "@/actions/notificationActions";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import { Card } from "flowbite-react";
import AdminAlertRulesTable from "./AdminAlertRulesTable";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "#", label: "Admin Alerts" },
];

export default async function Page() {
  let rules: Awaited<ReturnType<typeof getAdminAlertRules>> = [];
  try {
    rules = await getAdminAlertRules();
  } catch (err) {
    console.error("Error fetching admin alert rules:", err);
    throw new Error("Failed to fetch admin alert rules");
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Admin Alerts
            </h5>
            <p className="pt-1 text-sm text-gray-500 dark:text-gray-400">
              Who gets emailed when something needs attention. <b>P1</b> sends one email
              immediately. <b>P2</b> is collected into the daily digest and sends nothing yet.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
          </div>

          {rules.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {getEmptyListMessage("admin alert rules", false)}
            </p>
          ) : (
            <AdminAlertRulesTable rules={rules} />
          )}
        </div>
      </Card>
    </div>
  );
}
