import { formatStaffActivityTimestamp } from "@/lib/staffActivityUtils";
import type { StaffActivitySummary } from "@/types/staffActivity";
import {
  Activity,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

interface ActivitySummaryCardsProps {
  summary: StaffActivitySummary;
}

const numberFormatter = new Intl.NumberFormat("en-IN");

export default function ActivitySummaryCards({
  summary,
}: ActivitySummaryCardsProps) {
  const cards = [
    {
      label: "Total activity",
      value: summary.total,
      icon: Activity,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
      detail: "Events matching this view",
    },
    {
      label: "Successful",
      value: summary.successful,
      icon: CheckCircle2,
      iconClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      detail: "Completed requests",
    },
    {
      label: "Failed",
      value: summary.failed,
      icon: ShieldAlert,
      iconClass: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300",
      detail: "Requests needing review",
    },
    {
      label: "Active staff",
      value: summary.activeStaff,
      icon: UsersRound,
      iconClass:
        "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
      detail: "Unique staff in results",
    },
  ] as const;

  return (
    <section aria-label="Activity summary" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {numberFormatter.format(card.value)}
                  </p>
                </div>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {card.detail}
              </p>
            </article>
          );
        })}
      </div>
      <p className="flex items-center justify-end gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        Last activity:{" "}
        {formatStaffActivityTimestamp(
          summary.lastActivityAt,
          "No activity yet",
        )}
      </p>
    </section>
  );
}
