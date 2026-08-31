"use client";

import { useState, useEffect, useMemo } from "react";
import { HiPencil, HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import ConfirmModal from "@/components/ConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSupervisors, deleteSupervisor } from "@/actions/supervisorActions";

interface Supervisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const STATUS_TABS = ["ALL", "ACTIVE", "INACTIVE"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "#", label: "Supervisors" },
];

export default function SupervisorsTable() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusTab>("ACTIVE");
  const [search, setSearch] = useState("");

  const [deleting, setDeleting] = useState<Supervisor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      const res = await getSupervisors();
      if (res.success && res.data) {
        setSupervisors(res.data);
        setListError(null);
      } else {
        setListError(res.message || "Failed to load supervisors");
      }
    } catch {
      setListError("An error occurred while loading supervisors");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteSupervisor(deleting.id);
      if (res.success) {
        toast.success("Supervisor deleted successfully");
        await loadSupervisors();
      } else {
        toast.error(res.message || "Failed to delete supervisor");
      }
    } catch {
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
      setDeleting(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return supervisors.filter((s) => {
      if (status === "ACTIVE" && !s.isActive) return false;
      if (status === "INACTIVE" && s.isActive) return false;
      if (!q) return true;
      return [s.name, s.email, s.phone].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [supervisors, status, search]);

  const emptyMessage = listError
    ? listError
    : search.trim()
      ? "No supervisors match your search."
      : "No supervisors found.";

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        {/* Header: title, breadcrumb, status tabs, search, primary action */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Supervisors
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 lg:w-auto" />
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              <div className="flex gap-2">
                {STATUS_TABS.map((item) => (
                  <Button
                    key={item}
                    size="xs"
                    color={status === item ? "blue" : "light"}
                    className="transition-colors"
                    onClick={() => setStatus(item)}
                  >
                    {item === "ALL"
                      ? "All"
                      : item === "ACTIVE"
                        ? "Active"
                        : "Inactive"}
                  </Button>
                ))}
              </div>
              <div className="min-w-0 flex-1 sm:w-[320px]">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email or phone…"
                  className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/8 dark:bg-[#374151] dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <Link href="/admin/supervisors/create" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        {listError && (
          <div className="py-4 text-center text-red-500 dark:text-red-400">
            {listError}
          </div>
        )}

        {/* Table: responsive container + rows */}
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Name</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Email</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Phone</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow
                      key={i}
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      {Array.from({ length: 6 }).map((__, c) => (
                        <TableCell key={c}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !listError && filtered.length > 0 ? (
                  filtered.map((supervisor, index) => (
                    <TableRow
                      key={supervisor.id}
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <Link
                          href={`/admin/supervisors/${supervisor.id}`}
                          className="block max-w-[180px] truncate text-blue-600 hover:underline dark:text-blue-400 sm:max-w-none"
                          title={`View ${supervisor.name}`}
                        >
                          {supervisor.name}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[220px] truncate sm:max-w-none">
                          {supervisor.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {supervisor.phone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={supervisor.isActive ? "success" : "gray"}
                          className="w-fit"
                        >
                          {supervisor.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <Link
                            href={`/admin/supervisors/${supervisor.id}`}
                            className="w-fit"
                            title="Edit"
                          >
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                          <button
                            type="button"
                            className="w-fit"
                            title="Delete"
                            onClick={() => setDeleting(supervisor)}
                          >
                            <div className="rounded-md bg-red-600 p-1 transition-colors hover:bg-red-700">
                              <HiTrash size={20} className="text-white" />
                            </div>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {loading ? 0 : filtered.length} of {supervisors.length} supervisors.
          </span>
        </div>
      </Card>

      <ConfirmModal
        showModal={!!deleting}
        tone="danger"
        title="Delete this supervisor?"
        confirmationText={
          deleting
            ? `${deleting.name} will be removed. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={isDeleting}
        acceptCallback={confirmDelete}
        closeCallback={() => {
          if (!isDeleting) setDeleting(null);
        }}
      />
    </div>
  );
}
