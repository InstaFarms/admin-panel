"use client";

/**
 * Editable rules matrix: one row per (admin.* event x admin panel role).
 * Each control writes through immediately and rolls back on failure, so the
 * table never shows a state the server did not accept.
 */
import { useState, useTransition } from "react";
import {
  Badge,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  ToggleSwitch,
} from "flowbite-react";
import toast from "react-hot-toast";
import {
  updateAdminAlertRule,
  type AdminAlertPriority,
  type AdminAlertRule,
} from "@/actions/notificationActions";

interface AdminAlertRulesTableProps {
  rules: AdminAlertRule[];
}

const ROLE_BADGE_COLOR: Record<AdminAlertRule["adminRole"], string> = {
  SUPER_ADMIN: "failure",
  FINANCE_TEAM: "warning",
  OPS_TEAM: "info",
  SALES_EXECUTIVE: "success",
};

/** "admin.payment_failed" → "Payment failed" */
function humanizeEvent(eventName: string): string {
  const bare = eventName.replace(/^admin\./, "").replace(/_/g, " ");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

export default function AdminAlertRulesTable({ rules }: AdminAlertRulesTableProps) {
  const [rows, setRows] = useState(rules);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function applyPatch(
    id: string,
    patch: { priority?: AdminAlertPriority; enabled?: boolean }
  ) {
    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
    setPendingId(id);

    startTransition(async () => {
      try {
        await updateAdminAlertRule(id, patch);
        toast.success("Alert rule updated");
      } catch {
        setRows(previous);
        toast.error("Could not update the alert rule");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>Event</TableHeadCell>
            <TableHeadCell>Notifies</TableHeadCell>
            <TableHeadCell>Priority</TableHeadCell>
            <TableHeadCell>Enabled</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {rows.map((rule) => (
            <TableRow
              key={rule.id}
              className="bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <TableCell className="whitespace-nowrap">
                <div className="font-medium text-gray-900 dark:text-white">
                  {humanizeEvent(rule.eventName)}
                </div>
                <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {rule.eventName}
                </div>
              </TableCell>

              <TableCell>
                <Badge color={ROLE_BADGE_COLOR[rule.adminRole] ?? "gray"} className="w-fit">
                  {rule.adminRole.replace(/_/g, " ")}
                </Badge>
              </TableCell>

              <TableCell>
                <Select
                  sizing="sm"
                  value={rule.priority}
                  disabled={pendingId === rule.id}
                  onChange={(event) =>
                    applyPatch(rule.id, {
                      priority: event.target.value as AdminAlertPriority,
                    })
                  }
                >
                  <option value="P1">P1 — email immediately</option>
                  <option value="P2">P2 — daily digest</option>
                </Select>
              </TableCell>

              <TableCell>
                <ToggleSwitch
                  checked={rule.enabled}
                  disabled={pendingId === rule.id}
                  label=""
                  onChange={(checked) => applyPatch(rule.id, { enabled: checked })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
