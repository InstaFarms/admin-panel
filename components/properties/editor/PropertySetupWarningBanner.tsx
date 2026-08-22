"use client";

import { Card } from "flowbite-react";
import { AlertTriangle } from "lucide-react";

import type { PropertySetupIssue } from "@/actions/propertySetupReadinessActions";

interface PropertySetupWarningBannerProps {
  issues: PropertySetupIssue[];
}

export default function PropertySetupWarningBanner({ issues }: PropertySetupWarningBannerProps) {
  if (issues.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            This property is missing critical setup — bookings/payments may fail or misbehave
          </h4>
          <ul className="mt-2 space-y-1.5">
            {issues.map((issue, i) => (
              <li
                key={`${issue.code}-${issue.brandName ?? i}`}
                className="text-sm text-amber-800 dark:text-amber-300"
              >
                <span className="font-medium">{issue.message}</span>
                {" — "}
                <span>{issue.consequence}</span>{" "}
                <span className="text-amber-600 dark:text-amber-400">
                  (see &quot;{issue.tabLabel}&quot; tab)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
