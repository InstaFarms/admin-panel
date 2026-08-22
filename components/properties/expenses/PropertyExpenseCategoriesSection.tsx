"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiPlus, HiTrash } from "react-icons/hi";

import {
  createExpenseCategoryForProperty,
  deleteExpenseCategory,
  getExpenseCategoriesForProperty,
  updateExpenseCategoryForProperty,
} from "@/actions/expenseCategoryActions";
import type { PropertyExpenseCategory } from "@/actions/expenseCategoryActions";
import SectionHeading from "@/components/properties/SectionHeading";
import { parseServerActionResult } from "@/utils/utils";
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

type CategoryDraft = {
  id?: string;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyDraft = (): CategoryDraft => ({
  name: "",
  description: "",
  status: "ACTIVE",
});

function draftFromRow(row: PropertyExpenseCategory): CategoryDraft {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    status: row.isActive ? "ACTIVE" : "INACTIVE",
  };
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PropertyExpenseCategoriesSection({
  propertyId,
  onChanged,
}: {
  propertyId: string;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<PropertyExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CategoryDraft | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await getExpenseCategoriesForProperty(propertyId));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load expense categories",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [propertyId]);

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Please enter category name.");
      return;
    }

    const formData = new FormData();
    formData.set("name", draft.name.trim());
    formData.set("description", draft.description.trim());
    formData.set("status", draft.status);

    startTransition(() => {
      const promise = parseServerActionResult(
        draft.id
          ? updateExpenseCategoryForProperty(propertyId, draft.id, formData)
          : createExpenseCategoryForProperty(propertyId, formData),
      ).then(async (message) => {
        setDraft(null);
        await refresh();
        onChanged?.();
        return message;
      });

      toast.promise(promise, {
        loading: draft.id
          ? "Updating expense category..."
          : "Creating expense category...",
        success: (message) => message,
        error: (error) => (error as Error).message,
      });
    });
  };

  const removeCategory = (row: PropertyExpenseCategory) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;

    startTransition(() => {
      const promise = parseServerActionResult(deleteExpenseCategory(row.id)).then(
        async (message) => {
          if (draft?.id === row.id) setDraft(null);
          await refresh();
          onChanged?.();
          return message;
        },
      );

      toast.promise(promise, {
        loading: "Deleting expense category...",
        success: (message) => message,
        error: (error) => (error as Error).message,
      });
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeading
          title="Expense Categories"
          description="Configure the expense categories available for this property."
          className="mb-0"
        />
        <Button
          type="button"
          size="sm"
          disabled={loading || isPending}
          onClick={() => setDraft(emptyDraft())}
        >
          <HiPlus className="mr-2" />
          Create Category
        </Button>
      </div>

      {draft ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 transition-all duration-200 dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Category Name
              </label>
              <TextInput
                value={draft.name}
                maxLength={160}
                placeholder="Housekeeping"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Status
              </label>
              <Select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as "ACTIVE" | "INACTIVE",
                  })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Description
              </label>
              <Textarea
                rows={3}
                maxLength={1000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={saveDraft}
            >
              {draft.id ? "Update Category" : "Create Category"}
            </Button>
            <Button
              type="button"
              size="sm"
              color="light"
              disabled={isPending}
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <JarvisLoader size="md" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHead>
              <TableRow>
                <TableHeadCell>Category</TableHeadCell>
                <TableHeadCell>Description</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Created</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell className="min-w-[180px] font-medium text-gray-900 dark:text-white">
                      {row.name}
                    </TableCell>
                    <TableCell className="min-w-[260px] text-gray-600 dark:text-gray-300">
                      <div className="max-w-[420px] truncate">
                        {row.description || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={row.isActive ? "success" : "gray"}
                        className="w-fit"
                      >
                        {row.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          color="light"
                          disabled={isPending}
                          onClick={() => setDraft(draftFromRow(row))}
                        >
                          <HiPencil />
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          color="failure"
                          disabled={isPending}
                          onClick={() => removeCategory(row)}
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
                    colSpan={5}
                    className="py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    No expense categories found for this property.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
