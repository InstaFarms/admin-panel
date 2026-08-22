"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiTrash, HiPencil } from "react-icons/hi";
import {
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  ToggleSwitch,
} from "flowbite-react";

import SectionHeading from "@/components/properties/SectionHeading";
import {
  getMinBookingRules,
  createMinBookingRule,
  updateMinBookingRule,
  deleteMinBookingRule,
  type MinBookingRule,
} from "@/actions/minBookingRulesActions";

type DraftRule = {
  id?: string;
  label: string;
  startDate: string;
  endDate: string;
  minNights: string;
};

const emptyDraft = (): DraftRule => ({
  label: "",
  startDate: "",
  endDate: "",
  minNights: "2",
});

export default function MinBookingRulesSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [rules, setRules] = useState<MinBookingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<DraftRule | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getMinBookingRules(propertyId)
      .then(setRules)
      .catch(() => toast.error("Failed to load rules"))
      .finally(() => setLoading(false));
  }, [propertyId]);

  // Fades/slides in any row id that's new since the last time this ran - covers
  // a freshly-created rule and the initial batch load, but not edits/toggles
  // (those replace rows in place without introducing new ids).
  useEffect(() => {
    const currentIds = new Set(rules.map((r) => r.id));
    const newEls = rules
      .filter((r) => !prevIdsRef.current.has(r.id))
      .map((r) => rowRefs.current[r.id])
      .filter((el): el is HTMLTableRowElement => !!el);

    if (newEls.length > 0) {
      import("gsap").then(({ gsap }) => {
        gsap.from(newEls, { opacity: 0, x: -16, duration: 0.35, stagger: 0.04, ease: "power2.out" });
      });
    }
    prevIdsRef.current = currentIds;
  }, [rules]);

  const handleSave = () => {
    if (!draft) return;
    const minNights = parseInt(draft.minNights, 10);
    if (!draft.label.trim()) return toast.error("Label is required");
    if (!draft.startDate || !draft.endDate) return toast.error("Dates are required");
    if (draft.endDate <= draft.startDate) return toast.error("End date must be after start date");
    if (!minNights || minNights < 1) return toast.error("Min nights must be at least 1");

    const days = (new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / 86400000;
    if (minNights > days) return toast.error(`Min nights (${minNights}) cannot exceed range length (${days} days)`);

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateMinBookingRule(editingId, {
            label: draft.label,
            startDate: draft.startDate,
            endDate: draft.endDate,
            minNights,
          });
          setRules((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
          toast.success("Rule updated");
        } else {
          const created = await createMinBookingRule({
            propertyId,
            label: draft.label,
            startDate: draft.startDate,
            endDate: draft.endDate,
            minNights,
          });
          setRules((prev) => [created, ...prev]);
          toast.success("Rule created");
        }
        setDraft(null);
        setEditingId(null);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to save rule");
      }
    });
  };

  const handleToggle = (rule: MinBookingRule) => {
    startTransition(async () => {
      try {
        const updated = await updateMinBookingRule(rule.id, { isActive: !rule.isActive });
        setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      } catch {
        toast.error("Failed to toggle rule");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteMinBookingRule(id);
        const rowEl = rowRefs.current[id];
        if (rowEl) {
          const { gsap } = await import("gsap");
          gsap.to(rowEl, {
            opacity: 0,
            x: -16,
            duration: 0.25,
            ease: "power2.in",
            onComplete: () => setRules((prev) => prev.filter((r) => r.id !== id)),
          });
        } else {
          setRules((prev) => prev.filter((r) => r.id !== id));
        }
        toast.success("Rule deleted");
      } catch {
        toast.error("Failed to delete rule");
      }
    });
  };

  const startEdit = (rule: MinBookingRule) => {
    setEditingId(rule.id);
    setDraft({
      id: rule.id,
      label: rule.label,
      startDate: rule.startDate,
      endDate: rule.endDate,
      minNights: String(rule.minNights),
    });
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeading
          title="Peak Season Minimum Nights"
          description="Set date ranges where a minimum booking duration is required. The minimum is counted from check-in through the end of the range."
        />
        {!draft && (
          <Button
            size="sm"
            color="blue"
            onClick={() => setDraft(emptyDraft())}
          >
            <HiPlus className="mr-1 h-4 w-4" />
            Add Rule
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {draft && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-200">
            {editingId ? "Edit Rule" : "New Rule"}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Label
              </label>
              <TextInput
                placeholder="e.g. Christmas 2026"
                value={draft.label}
                onChange={(e) => setDraft((d) => d && { ...d, label: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <TextInput
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => d && { ...d, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <TextInput
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => d && { ...d, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Min Nights
              </label>
              <TextInput
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 3"
                value={draft.minNights}
                onChange={(e) => setDraft((d) => d && { ...d, minNights: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" color="blue" onClick={handleSave} disabled={isPending}>
              {isPending ? <Spinner size="sm" className="mr-1" /> : null}
              {editingId ? "Save Changes" : "Create Rule"}
            </Button>
            <Button size="sm" color="gray" onClick={cancelEdit} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Rules table */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" /> Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No peak season rules yet. Add one above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Label</TableHeadCell>
                <TableHeadCell>Start Date</TableHeadCell>
                <TableHeadCell>End Date</TableHeadCell>
                <TableHeadCell>Min Nights</TableHeadCell>
                <TableHeadCell>Active</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {rules.map((rule) => (
                <TableRow
                  key={rule.id}
                  ref={(el) => {
                    rowRefs.current[rule.id] = el;
                  }}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {rule.label}
                  </TableCell>
                  <TableCell>{rule.startDate}</TableCell>
                  <TableCell>{rule.endDate}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {rule.minNights} night{rule.minNights !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ToggleSwitch
                      checked={rule.isActive}
                      onChange={() => handleToggle(rule)}
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="Edit"
                      >
                        <HiPencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                        title="Delete"
                        disabled={isPending}
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
