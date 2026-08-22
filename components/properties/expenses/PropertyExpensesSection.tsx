"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  HiChevronDown,
  HiChevronRight,
  HiPencil,
  HiPlus,
  HiTrash,
} from "react-icons/hi";

import { getExpenseCategoriesForProperty } from "@/actions/expenseCategoryActions";
import type { PropertyExpenseCategory } from "@/actions/expenseCategoryActions";
import {
  createPropertyMonthlyExpense,
  createPropertyMonthlyExpenseEntry,
  deletePropertyMonthlyExpense,
  deletePropertyMonthlyExpenseEntry,
  getPropertyMonthlyExpenses,
  updatePropertyMonthlyExpense,
  updatePropertyMonthlyExpenseEntry,
} from "@/actions/propertyExpenseActions";
import type {
  MonthlyExpenseEntry,
  PropertyMonthlyExpense,
  PropertyMonthlyExpenseStatus,
} from "@/actions/propertyExpenseActions";
import SectionHeading from "@/components/properties/SectionHeading";
import {
  Badge,
  Button,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

type MonthDraft = {
  id?: string;
  month: string;
  status: PropertyMonthlyExpenseStatus;
  notes: string;
};

type EntryDraft = {
  id?: string;
  propertyMonthlyExpenseId: string;
  expenseDate: string;
  propertyExpenseCategoryId: string;
  description: string;
  amountExclGst: string;
  gstRate: string;
  attachmentUrl: string;
};

const monthStatusOptions: PropertyMonthlyExpenseStatus[] = [
  "OPEN",
  "CLOSED",
  "LOCKED",
];

function toMonthInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 7);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function normalizeMonth(value: string) {
  const trimmed = value.trim();
  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) return `${isoMonth[1]}-${isoMonth[2]}-01`;
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-01`;
  const namedMonth = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (namedMonth) {
    const monthIndex = new Date(`${namedMonth[1]} 1, 2000`).getMonth();
    if (!Number.isNaN(monthIndex)) {
      return `${namedMonth[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    }
  }
  return trimmed;
}

function formatMonth(value: string) {
  const date = new Date(`${toMonthInput(value)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function emptyMonthDraft(): MonthDraft {
  return {
    month: "",
    status: "OPEN",
    notes: "",
  };
}

function monthDraftFromRow(row: PropertyMonthlyExpense): MonthDraft {
  return {
    id: row.id,
    month: toMonthInput(row.month),
    status: row.status,
    notes: row.notes ?? "",
  };
}

function emptyEntryDraft(monthId: string): EntryDraft {
  return {
    propertyMonthlyExpenseId: monthId,
    expenseDate: "",
    propertyExpenseCategoryId: "",
    description: "",
    amountExclGst: "",
    gstRate: "0",
    attachmentUrl: "",
  };
}

function entryDraftFromRow(row: MonthlyExpenseEntry): EntryDraft {
  return {
    id: row.id,
    propertyMonthlyExpenseId: row.propertyMonthlyExpenseId,
    expenseDate: toDateInput(row.expenseDate),
    propertyExpenseCategoryId: row.propertyExpenseCategoryId,
    description: row.description ?? "",
    amountExclGst: String(row.amountExclGst ?? ""),
    gstRate: String(row.gstRate ?? 0),
    attachmentUrl: row.attachmentUrl ?? "",
  };
}

export default function PropertyExpensesSection({
  propertyId,
  refreshKey = 0,
}: {
  propertyId: string;
  refreshKey?: number;
}) {
  const [months, setMonths] = useState<PropertyMonthlyExpense[]>([]);
  const [categories, setCategories] = useState<PropertyExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedMonthId, setExpandedMonthId] = useState<string | null>(null);
  const [monthDraft, setMonthDraft] = useState<MonthDraft | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextMonths, nextCategories] = await Promise.all([
        getPropertyMonthlyExpenses(propertyId),
        getExpenseCategoriesForProperty(propertyId),
      ]);
      setMonths(nextMonths);
      setCategories(nextCategories);
      setExpandedMonthId((current) => current ?? nextMonths[0]?.id ?? null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load expenses",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [propertyId, refreshKey]);

  const saveMonthDraft = () => {
    if (!monthDraft) return;
    if (!monthDraft.month) {
      toast.error("Select a month first.");
      return;
    }

    const payload = {
      propertyId,
      month: normalizeMonth(monthDraft.month),
      status: monthDraft.status,
      notes: monthDraft.notes.trim() || null,
    };

    startTransition(() => {
      const savePromise = (
        monthDraft.id
          ? updatePropertyMonthlyExpense(monthDraft.id, payload)
          : createPropertyMonthlyExpense(payload)
      ).then(async () => {
        setMonthDraft(null);
        await refresh();
      });

      toast.promise(savePromise, {
        loading: monthDraft.id
          ? "Updating monthly expense..."
          : "Creating monthly expense...",
        success: monthDraft.id
          ? "Monthly expense updated."
          : "Monthly expense created.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const removeMonth = (month: PropertyMonthlyExpense) => {
    if (
      !window.confirm(`Delete ${formatMonth(month.month)} and its entries?`)
    ) {
      return;
    }

    startTransition(() => {
      const deletePromise = deletePropertyMonthlyExpense(month.id).then(
        async () => {
          if (expandedMonthId === month.id) setExpandedMonthId(null);
          await refresh();
        },
      );

      toast.promise(deletePromise, {
        loading: "Deleting monthly expense...",
        success: "Monthly expense deleted.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const saveEntryDraft = () => {
    if (!entryDraft) return;
    if (!entryDraft.expenseDate) {
      toast.error("Select expense date first.");
      return;
    }
    if (!entryDraft.propertyExpenseCategoryId) {
      toast.error("Select expense category first.");
      return;
    }

    const amountExclGst = Number(entryDraft.amountExclGst);
    const gstRate = Number(entryDraft.gstRate || 0);
    if (!Number.isFinite(amountExclGst) || amountExclGst < 0) {
      toast.error("Enter a valid expense amount.");
      return;
    }
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      toast.error("GST rate must be between 0 and 100.");
      return;
    }

    const payload = {
      expenseDate: entryDraft.expenseDate,
      propertyExpenseCategoryId: entryDraft.propertyExpenseCategoryId,
      description: entryDraft.description.trim() || null,
      amountExclGst,
      gstRate,
      attachmentUrl: entryDraft.attachmentUrl.trim() || null,
    };

    startTransition(() => {
      const savePromise = (
        entryDraft.id
          ? updatePropertyMonthlyExpenseEntry(entryDraft.id, payload)
          : createPropertyMonthlyExpenseEntry({
              propertyMonthlyExpenseId: entryDraft.propertyMonthlyExpenseId,
              propertyId,
              ...payload,
            })
      ).then(async () => {
        setEntryDraft(null);
        await refresh();
      });

      toast.promise(savePromise, {
        loading: entryDraft.id ? "Updating expense..." : "Creating expense...",
        success: entryDraft.id ? "Expense updated." : "Expense created.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const removeEntry = (entry: MonthlyExpenseEntry) => {
    if (!window.confirm("Delete this expense entry?")) return;

    startTransition(() => {
      const deletePromise = deletePropertyMonthlyExpenseEntry(entry.id).then(
        async () => {
          setEntryDraft(null);
          await refresh();
        },
      );

      toast.promise(deletePromise, {
        loading: "Deleting expense...",
        success: "Expense deleted.",
        error: (error) => (error as Error).message,
      });
    });
  };

  const renderMonthDraft = () =>
    monthDraft ? (
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 transition-all duration-200 dark:border-blue-900/60 dark:bg-blue-950/30">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Month
            </label>
            <TextInput
              type="month"
              value={monthDraft.month}
              onChange={(event) =>
                setMonthDraft({ ...monthDraft, month: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Status
            </label>
            <Select
              value={monthDraft.status}
              onChange={(event) =>
                setMonthDraft({
                  ...monthDraft,
                  status: event.target.value as PropertyMonthlyExpenseStatus,
                })
              }
            >
              {monthStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Notes
            </label>
            <Textarea
              rows={3}
              value={monthDraft.notes}
              onChange={(event) =>
                setMonthDraft({ ...monthDraft, notes: event.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={saveMonthDraft}
          >
            {monthDraft.id ? "Update Month" : "Create Month"}
          </Button>
          <Button
            type="button"
            size="sm"
            color="light"
            disabled={isPending}
            onClick={() => setMonthDraft(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    ) : null;

  const renderEntryDraft = (monthId: string) =>
    entryDraft?.propertyMonthlyExpenseId === monthId ? (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900/80">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Date
            </label>
            <TextInput
              type="date"
              value={entryDraft.expenseDate}
              onChange={(event) =>
                setEntryDraft({
                  ...entryDraft,
                  expenseDate: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Category
            </label>
            <Select
              value={entryDraft.propertyExpenseCategoryId}
              onChange={(event) =>
                setEntryDraft({
                  ...entryDraft,
                  propertyExpenseCategoryId: event.target.value,
                })
              }
            >
              <option value="">Select category</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Amount Excl. GST
            </label>
            <TextInput
              type="number"
              min={0}
              step="0.01"
              value={entryDraft.amountExclGst}
              onChange={(event) =>
                setEntryDraft({
                  ...entryDraft,
                  amountExclGst: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              GST Rate %
            </label>
            <TextInput
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={entryDraft.gstRate}
              onChange={(event) =>
                setEntryDraft({ ...entryDraft, gstRate: event.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <Textarea
              rows={3}
              value={entryDraft.description}
              onChange={(event) =>
                setEntryDraft({
                  ...entryDraft,
                  description: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Attachment URL
            </label>
            <TextInput
              value={entryDraft.attachmentUrl}
              onChange={(event) =>
                setEntryDraft({
                  ...entryDraft,
                  attachmentUrl: event.target.value,
                })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={saveEntryDraft}
          >
            {entryDraft.id ? "Update Expense" : "Create Expense"}
          </Button>
          <Button
            type="button"
            size="sm"
            color="light"
            disabled={isPending}
            onClick={() => setEntryDraft(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeading
          title="Expenses"
          description="Maintain monthly property expenses and their line items for Mago finance calculations."
          className="mb-0"
        />
        <Button
          type="button"
          size="sm"
          disabled={loading || isPending}
          onClick={() => setMonthDraft(emptyMonthDraft())}
        >
          <HiPlus className="mr-2" />
          Create Month
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <JarvisLoader size="md" />
        </div>
      ) : (
        <div className="space-y-4">
          {renderMonthDraft()}

          {categories.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Create expense categories for this property before adding expense
              entries.
            </div>
          ) : null}

          {months.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              No monthly expenses found for this property.
            </div>
          ) : (
            <div className="space-y-3">
              {months.map((month) => {
                const expanded = expandedMonthId === month.id;
                return (
                  <div
                    key={month.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-700 dark:bg-slate-950/30"
                  >
                    <div className="flex w-full flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-900">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-3 text-left"
                        onClick={() =>
                          setExpandedMonthId(expanded ? null : month.id)
                        }
                      >
                        <span>
                          {expanded ? (
                            <HiChevronDown className="text-slate-500" />
                          ) : (
                            <HiChevronRight className="text-slate-500" />
                          )}
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900 dark:text-white">
                            {formatMonth(month.month)}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {month.entries.length} entr
                            {month.entries.length === 1 ? "y" : "ies"}
                          </span>
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge color="info" className="w-fit">
                          {month.status}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {formatMoney(month.totalExpenseInclGst)}
                        </span>
                        <Button
                          type="button"
                          size="xs"
                          color="light"
                          disabled={isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMonthDraft(monthDraftFromRow(month));
                          }}
                        >
                          <HiPencil />
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          color="failure"
                          disabled={isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeMonth(month);
                          }}
                        >
                          <HiTrash />
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
                        <div className="grid gap-3 text-sm sm:grid-cols-3">
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Expense Excl. GST
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {formatMoney(month.totalExpenseExclGst)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              GST
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {formatMoney(month.totalGstAmount)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/70">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Expense Incl. GST
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {formatMoney(month.totalExpenseInclGst)}
                            </p>
                          </div>
                        </div>

                        {month.notes ? (
                          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                            {month.notes}
                          </p>
                        ) : null}

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              isPending || activeCategories.length === 0
                            }
                            onClick={() =>
                              setEntryDraft(emptyEntryDraft(month.id))
                            }
                          >
                            <HiPlus className="mr-2" />
                            Create Expense
                          </Button>
                        </div>

                        {renderEntryDraft(month.id)}

                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHead>
                              <TableRow>
                                <TableHeadCell>Date</TableHeadCell>
                                <TableHeadCell>Category</TableHeadCell>
                                <TableHeadCell>Description</TableHeadCell>
                                <TableHeadCell>Excl. GST</TableHeadCell>
                                <TableHeadCell>GST</TableHeadCell>
                                <TableHeadCell>Incl. GST</TableHeadCell>
                                <TableHeadCell>Actions</TableHeadCell>
                              </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                              {month.entries.length > 0 ? (
                                month.entries.map((entry) => (
                                  <TableRow
                                    key={entry.id}
                                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                                  >
                                    <TableCell className="whitespace-nowrap">
                                      {formatDate(entry.expenseDate)}
                                    </TableCell>
                                    <TableCell className="min-w-[160px]">
                                      {entry.categoryName || "N/A"}
                                    </TableCell>
                                    <TableCell className="min-w-[220px]">
                                      <div className="max-w-[360px] truncate">
                                        {entry.description || "N/A"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {formatMoney(entry.amountExclGst)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {formatMoney(entry.gstAmount)} (
                                      {Number(entry.gstRate ?? 0).toFixed(2)}%)
                                    </TableCell>
                                    <TableCell className="font-semibold whitespace-nowrap">
                                      {formatMoney(entry.amountInclGst)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          size="xs"
                                          color="light"
                                          disabled={isPending}
                                          onClick={() =>
                                            setEntryDraft(
                                              entryDraftFromRow(entry),
                                            )
                                          }
                                        >
                                          <HiPencil />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="xs"
                                          color="failure"
                                          disabled={isPending}
                                          onClick={() => removeEntry(entry)}
                                        >
                                          <HiTrash />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell
                                    colSpan={7}
                                    className="py-4 text-center text-gray-500 dark:text-gray-400"
                                  >
                                    No expenses added for this month.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
