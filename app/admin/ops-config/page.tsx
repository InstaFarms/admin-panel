import { Card } from "flowbite-react";
import { HiOutlineCog } from "react-icons/hi";

import OpsConfigManager from "@/components/ops-config/OpsConfigManager";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { OPS_CONFIG_BREADCRUMBS } from "@/constants/opsConfig";

export const dynamic = "force-dynamic";

export default function OpsConfigPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <HiOutlineCog className="h-6 w-6" />
            </span>
            <div>
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Ops Configuration
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure what each property physically has — spaces and assets —
                plus the operations, workflows, and schedules that run on them.
              </p>
            </div>
          </div>
          <PageBreadcrumb
            items={OPS_CONFIG_BREADCRUMBS}
            className="w-full shrink-0"
          />
        </div>
      </Card>

      <OpsConfigManager />
    </div>
  );
}
