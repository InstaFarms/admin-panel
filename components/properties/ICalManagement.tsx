"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  Select,
} from "flowbite-react";

interface ICalManagementProps {
  propertyId?: string | null;
  isResort?: boolean;
  resortRooms?: any[];
  icalLinks: any[];
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  newLink: { name: string; icalUrl: string; roomId?: string | null };
  setNewLink: (link: { name: string; icalUrl: string; roomId?: string | null }) => void;
  exportUrl: string;
  icalLoading: boolean;
  handleAddIcalLink: () => Promise<void | boolean>;
  handleSyncIcalLink: (linkId: string) => Promise<boolean>;
  handleDeleteIcalLink: (linkId: string) => Promise<boolean>;
  handleCopyExportUrl: () => void;
}

export default function ICalManagement({
  propertyId,
  isResort,
  resortRooms,
  icalLinks,
  showAddForm,
  setShowAddForm,
  newLink,
  setNewLink,
  exportUrl,
  icalLoading,
  handleAddIcalLink,
  handleSyncIcalLink,
  handleDeleteIcalLink,
  handleCopyExportUrl,
}: ICalManagementProps) {
  const [isLocalhostTesting, setIsLocalhostTesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    setIsLocalhostTesting(localHosts.has(window.location.hostname));
  }, []);

  const handleSync = async (linkId: string) => {
    await handleSyncIcalLink(linkId);
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Delete this iCal link?")) return;
    await handleDeleteIcalLink(linkId);
  };

  if (!propertyId) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="mb-2 text-lg">Save property first</p>
        <p className="text-sm">
          You need to save the property before managing iCal links
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="rounded-lg border border-gray-300 bg-white p-5 dark:border-gray-600 dark:bg-gray-800">
        <h4 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Export Calendar to Other Platforms
        </h4>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Share this iCal URL with Airbnb, Booking.com, or any platform that
          supports iCal feeds
        </p>
        <div className="flex gap-2">
          <TextInput
            readOnly
            value={exportUrl}
            className="flex-1 font-mono text-sm"
            disabled={isLocalhostTesting}
          />
          <Button
            onClick={handleCopyExportUrl}
            color="blue"
            disabled={isLocalhostTesting}
          >
            Copy
          </Button>
        </div>
        {isLocalhostTesting ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Do not copy this link while testing on localhost. Use the deployed
            dev or production web app to copy and share the iCal export URL.
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-5 dark:border-gray-600 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Import Calendars from Other Platforms
          </h4>
          <Button
            size="sm"
            color={showAddForm ? "gray" : "green"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "Add Calendar"}
          </Button>
        </div>

        {showAddForm && (
          <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            {isResort && resortRooms && resortRooms.length > 0 && (
              <Select
                value={newLink.roomId || ""}
                onChange={(e) => setNewLink({ ...newLink, roomId: e.target.value || null })}
              >
                <option value="">-- Apply to Property Level --</option>
                {resortRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            )}
            <TextInput
              placeholder="Platform name (e.g., Airbnb, Booking.com)"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
            />
            <TextInput
              placeholder="Paste iCal URL here"
              value={newLink.icalUrl}
              onChange={(e) =>
                setNewLink({ ...newLink, icalUrl: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddIcalLink}
                disabled={icalLoading}
                color="green"
              >
                {icalLoading ? "Adding..." : "Add Calendar"}
              </Button>
              <Button
                color="gray"
                onClick={() => {
                  setShowAddForm(false);
                  setNewLink({ name: "", icalUrl: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Platform</TableHeadCell>
                {isResort && <TableHeadCell>Room</TableHeadCell>}
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Last Synced</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {icalLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {link.name}
                  </TableCell>
                  {isResort && (
                    <TableCell>
                      {resortRooms?.find((r) => r.id === link.roomId)?.name || "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        link.syncStatus === "success"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : link.syncStatus === "error"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : link.syncStatus === "syncing"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {link.syncStatus === "success"
                        ? "Success"
                        : link.syncStatus === "error"
                          ? "Error"
                          : link.syncStatus === "syncing"
                            ? "Syncing"
                            : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {link.lastSyncedAt
                      ? new Date(link.lastSyncedAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })
                      : "Never synced"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        color="blue"
                        onClick={() => handleSync(link.id)}
                        disabled={icalLoading}
                      >
                        Sync
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        onClick={() => handleDelete(link.id)}
                        disabled={icalLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {icalLinks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isResort ? 5 : 4} className="py-8 text-center text-gray-500">
                    <p>No calendar links added yet</p>
                    <p className="mt-1 text-sm">
                      Add your first calendar to sync bookings automatically
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h5 className="mb-2 font-semibold text-blue-900 dark:text-blue-200">
          How it works
        </h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
          <li>
            Export: Share your InstaFarms calendar with other platforms to
            prevent double bookings
          </li>
          <li>
            Import: Add calendars from other platforms to automatically block
            dates
          </li>
          <li>Calendars sync automatically every 10 minutes</li>
          <li>You can manually sync anytime using the Sync button</li>
        </ul>
      </div>
    </div>
  );
}
