"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Checkbox, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { HiSearch } from "react-icons/hi";
import toast from "react-hot-toast";
import type { ICalConnectionStatusRow } from "@/actions/icalActions";
import { bulkUpdateIcalSyncControl } from "@/actions/icalActions";
import ConfirmModal from "@/components/ConfirmModal";

type BulkAction = {
  allow: boolean;
  isAppliedToAll: boolean;
};

export default function ICalSyncControlsClient({ rows }: { rows: ICalConnectionStatusRow[] }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"airbnb" | "booking">("airbnb");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.propertyName.toLowerCase().includes(q));
  }, [rows, query]);

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedPropertyIds.includes(row.propertyId));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedPropertyIds((prev) => prev.filter((id) => !filteredRows.some((row) => row.propertyId === id)));
      return;
    }
    setSelectedPropertyIds((prev) => Array.from(new Set([...prev, ...filteredRows.map((row) => row.propertyId)])));
  };

  const toggleSelectOne = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const executeBulkUpdate = (allow: boolean, isAppliedToAll: boolean) => {
    startTransition(async () => {
      const result = await bulkUpdateIcalSyncControl({
        provider,
        allow,
        isAppliedToAll,
        propertyIds: isAppliedToAll ? [] : selectedPropertyIds,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success || "Bulk update completed");
      if (!isAppliedToAll) {
        setSelectedPropertyIds([]);
      }
      window.location.reload();
    });
  };

  const runBulkUpdate = (allow: boolean, isAppliedToAll: boolean) => {
    setPendingBulkAction({ allow, isAppliedToAll });
  };

  const closeConfirmModal = () => {
    if (isPending) return;
    setPendingBulkAction(null);
  };

  const confirmBulkUpdate = () => {
    if (!pendingBulkAction) return;
    executeBulkUpdate(pendingBulkAction.allow, pendingBulkAction.isAppliedToAll);
    setPendingBulkAction(null);
  };

  const confirmationText = pendingBulkAction
    ? `Are you sure you want to ${pendingBulkAction.allow ? "allow" : "stop"} ${provider} sync for ${
        pendingBulkAction.isAppliedToAll
          ? "all properties in current brand"
          : `${selectedPropertyIds.length} selected properties`
      }?`
    : "";

  return (
    <div className="space-y-4">
      <ConfirmModal
        showModal={Boolean(pendingBulkAction)}
        confirmationText={confirmationText}
        acceptCallback={confirmBulkUpdate}
        closeCallback={closeConfirmModal}
        loading={isPending}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <TextInput
          icon={HiSearch}
          placeholder="Search property..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={provider} onChange={(e) => setProvider(e.target.value as "airbnb" | "booking")}>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
        </Select>
        <div className="flex gap-2">
          <Button color="failure" disabled={isPending || selectedPropertyIds.length === 0} onClick={() => runBulkUpdate(false, false)}>
            Stop Selected
          </Button>
          <Button color="success" disabled={isPending || selectedPropertyIds.length === 0} onClick={() => runBulkUpdate(true, false)}>
            Allow Selected
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button color="failure" outline disabled={isPending} onClick={() => runBulkUpdate(false, true)}>
          Stop {provider} For All
        </Button>
        <Button color="success" outline disabled={isPending} onClick={() => runBulkUpdate(true, true)}>
          Allow {provider} For All
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table hoverable>
          <TableHead>
            <TableRow>
              <TableHeadCell>
                <Checkbox checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              </TableHeadCell>
              <TableHeadCell>Property</TableHeadCell>
              <TableHeadCell>Airbnb Sync</TableHeadCell>
              <TableHeadCell>Booking Sync</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {filteredRows.map((row) => (
              <TableRow key={row.propertyId} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                <TableCell>
                  <Checkbox
                    checked={selectedPropertyIds.includes(row.propertyId)}
                    onChange={() => toggleSelectOne(row.propertyId)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900 dark:text-white">{row.propertyName}</TableCell>
                <TableCell>{row.airbnbConnected ? "Allowed" : "Stopped / Not linked"}</TableCell>
                <TableCell>{row.bookingConnected ? "Allowed" : "Stopped / Not linked"}</TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No matching properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
