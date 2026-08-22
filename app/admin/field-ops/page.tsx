import { Card } from "flowbite-react";
import { HiOutlineClipboardCheck } from "react-icons/hi";

import FieldOpsManager from "@/components/field-ops/FieldOpsManager";
import PageBreadcrumb from "@/components/PageBreadcrumb";

export const dynamic = "force-dynamic";

const FIELD_OPS_BREADCRUMBS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "#", label: "Field Ops" },
] as const;

export default function FieldOpsPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <HiOutlineClipboardCheck className="h-6 w-6" />
            </span>
            <div>
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Field Ops
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure meter thresholds, task templates, and staff
                assignments per property.
              </p>
            </div>
          </div>
          <PageBreadcrumb
            items={FIELD_OPS_BREADCRUMBS}
            className="w-full shrink-0"
          />
        </div>
      </Card>

      <FieldOpsManager />
    </div>
  );
}
