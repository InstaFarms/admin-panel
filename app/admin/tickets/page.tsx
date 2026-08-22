"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    Badge,
    Breadcrumb,
    BreadcrumbItem,
    Button,
    Card,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeadCell,
    TableRow,
    TextInput,
} from "flowbite-react";
import { HiSearch } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import PropertySelector from "@/components/PropertySelector";
import TicketDetailModal from "@/components/news-feed/TicketDetailModal";

import { fetchNewsFeedTickets } from "@/actions/newsFeedActions";
import { fetchOperationalTickets } from "@/actions/supervisorAuditActions";

import {
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    formatAge,
    priorityBadgeColor,
    statusBadgeColor,
    statusLabel,
} from "@/constants/newsFeed";

const SEARCH_DEBOUNCE_MS = 400;

const OPS_TICKET_LIMIT = 100;

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [ticketsCursor, setTicketsCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);

    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [q, setQ] = useState("");

    const [openTicketId, setOpenTicketId] = useState<string | null>(null);

    // Operational tickets (the `tickets` table) — a separate store from the
    // news-feed queue above, loaded independently so a failure in one list
    // cannot blank the other.
    const [opsTickets, setOpsTickets] = useState<any[]>([]);
    const [opsLoading, setOpsLoading] = useState(true);
    const [opsStatus, setOpsStatus] = useState<"OPEN" | "RESOLVED">("OPEN");

    // Debounce the free-text search.
    useEffect(() => {
        const t = setTimeout(() => setQ(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [searchInput]);

    const ticketFilters = useCallback(
        () => ({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(priorityFilter ? { priority: priorityFilter } : {}),
            ...(propertyFilter ? { propertyId: propertyFilter } : {}),
            ...(q ? { q } : {}),
        }),
        [statusFilter, priorityFilter, propertyFilter, q]
    );

    const loadTickets = useCallback(async () => {
        setTicketsLoading(true);
        const result = await fetchNewsFeedTickets(ticketFilters());
        if (result.success && result.data) {
            setTickets(result.data.items || []);
            setTicketsCursor(result.data.nextCursor || null);
            setCountsByStatus(result.data.countsByStatus || {});
            setTotal(result.data.total || 0);
        } else {
            toast.error(result.message || result.error || "Failed to fetch tickets");
        }
        setTicketsLoading(false);
    }, [ticketFilters]);

    const loadMoreTickets = async () => {
        if (!ticketsCursor) return;
        setLoadingMore(true);
        const result = await fetchNewsFeedTickets({ ...ticketFilters(), cursor: ticketsCursor });
        if (result.success && result.data) {
            setTickets((prev) => [...prev, ...(result.data.items || [])]);
            setTicketsCursor(result.data.nextCursor || null);
        } else {
            toast.error(result.message || result.error || "Failed to fetch tickets");
        }
        setLoadingMore(false);
    };

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        let cancelled = false;
        setOpsLoading(true);
        fetchOperationalTickets({ status: opsStatus, limit: OPS_TICKET_LIMIT })
            .then((result: any) => {
                if (cancelled) return;
                if (result?.success && Array.isArray(result.data)) {
                    setOpsTickets(result.data);
                } else {
                    setOpsTickets([]);
                    toast.error(result?.message || result?.error || "Failed to fetch operational tickets");
                }
            })
            .finally(() => {
                if (!cancelled) setOpsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [opsStatus]);

    const statusTabs: { key: string; label: string; count: number }[] = [
        { key: "", label: "All", count: total },
        ...TICKET_STATUSES.map((s) => ({
            key: s,
            label: statusLabel(s),
            count: countsByStatus[s] || 0,
        })),
    ];

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white dark:bg-gray-800">
                <div className="space-between flex w-full flex-col gap-4">
                    <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Tickets
                        </h5>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex flex-col sm:flex-row">
                        <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                            <BreadcrumbItem href="/">Home</BreadcrumbItem>
                            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                            <BreadcrumbItem href="#">Tickets</BreadcrumbItem>
                        </Breadcrumb>
                    </div>
                </div>

                {/* Status tabs (triage counts) */}
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setStatusFilter(t.key)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                                statusFilter === t.key
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            }`}
                        >
                            {t.label} ({t.count})
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-52 flex-1">
                        <TextInput
                            sizing="sm"
                            icon={HiSearch}
                            placeholder="Search title, description, ticket #, property…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <Select
                        sizing="sm"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-auto"
                    >
                        <option value="">All Priorities</option>
                        {TICKET_PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </Select>
                    <div className="min-w-64">
                        <PropertySelector propertyId={propertyFilter} update={setPropertyFilter} />
                    </div>
                </div>

                {/* Tickets table */}
                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <Table hoverable striped>
                            <TableHead>
                              <TableRow>
                                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Ticket #</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Title</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Priority</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Assignee</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Raised By</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Age</TableHeadCell>
                              </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {ticketsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center">
                                            <JarvisLoader size="lg" />
                                        </TableCell>
                                    </TableRow>
                                ) : tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                                            No tickets found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow
                                            key={ticket.id}
                                            className="cursor-pointer bg-white dark:border-gray-700 dark:bg-gray-800"
                                            onClick={() => setOpenTicketId(ticket.id)}
                                        >
                                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {ticket.propertyName || "N/A"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {ticket.ticketNumber}
                                            </TableCell>
                                            <TableCell className="max-w-72 truncate text-gray-700 dark:text-gray-300">
                                                {ticket.title}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    color={priorityBadgeColor(ticket.priority)}
                                                    className="inline-block text-xs font-semibold"
                                                >
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    color={statusBadgeColor(ticket.status)}
                                                    className="inline-block whitespace-nowrap text-xs font-semibold uppercase"
                                                >
                                                    {statusLabel(ticket.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {ticket.assignedRoleLabel || ticket.assignedToLabel || "Unassigned"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {ticket.raiserName || "N/A"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {formatAge(ticket.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {ticketsCursor && !ticketsLoading && (
                    <div className="flex justify-center pt-2">
                        <Button size="xs" color="light" onClick={loadMoreTickets} disabled={loadingMore}>
                            {loadingMore ? "Loading…" : "Load more"}
                        </Button>
                    </div>
                )}
            </Card>

            {/*
                Operational tickets live in a SECOND store (the `tickets` table) that the
                list above has never read. A ticket a supervisor raised, a caretaker
                resolved with proof and the supervisor then verified appeared in neither
                the list above nor an audit report — many carry no auditSessionId — so the
                round trip was invisible to an admin. This reads the existing
                /supervisor-audits/tickets queue and leaves the news-feed list untouched.
            */}
            <Card className="mt-4 w-full bg-white dark:bg-gray-800">
                <div className="flex w-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Operational tickets
                        </h5>
                        <div className="flex items-center gap-2">
                            <Button
                                size="xs"
                                color={opsStatus === "OPEN" ? "primary" : "light"}
                                onClick={() => setOpsStatus("OPEN")}
                            >
                                Open
                            </Button>
                            <Button
                                size="xs"
                                color={opsStatus === "RESOLVED" ? "primary" : "light"}
                                onClick={() => setOpsStatus("RESOLVED")}
                            >
                                Resolved
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Raised by supervisors and caretakers against a property, with the
                        resolution recorded. Newest {OPS_TICKET_LIMIT} shown.
                    </p>

                    <div className="overflow-x-auto">
                        <Table hoverable>
                            <TableHead>
                                <TableHeadCell>Title</TableHeadCell>
                                <TableHeadCell>Property</TableHeadCell>
                                <TableHeadCell>Priority</TableHeadCell>
                                <TableHeadCell>Status</TableHeadCell>
                                <TableHeadCell>Raised by</TableHeadCell>
                                <TableHeadCell>Resolution</TableHeadCell>
                                <TableHeadCell>Resolved</TableHeadCell>
                            </TableHead>
                            <TableBody className="divide-y">
                                {opsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500">
                                            Loading…
                                        </TableCell>
                                    </TableRow>
                                ) : opsTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500">
                                            No {opsStatus.toLowerCase()} operational tickets.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    opsTickets.map((t: any) => (
                                        <TableRow key={t.id} className="bg-white dark:bg-gray-800">
                                            <TableCell className="font-medium text-gray-900 dark:text-white">
                                                {t.title || t.issueType || "Issue"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {t.propertyName || "—"}
                                            </TableCell>
                                            <TableCell>{t.priority || "—"}</TableCell>
                                            <TableCell>{t.status || "—"}</TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {t.raisedBy?.name || "—"}
                                            </TableCell>
                                            {/* The other half of the lifecycle. The table showed only
                                                that a ticket was resolved, never what was done, what
                                                proof was filed, or whether a supervisor had verified
                                                it — so the admin could not review the round trip. */}
                                            <TableCell className="max-w-xs text-sm text-gray-700 dark:text-gray-300">
                                                {t.resolution ? (
                                                    <div className="space-y-1">
                                                        <p className="line-clamp-2" title={t.resolution.notes}>
                                                            {t.resolution.notes}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                            {t.resolution.mediaUrls?.length > 0 && (
                                                                <a
                                                                    href={t.resolution.mediaUrls[0]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline dark:text-blue-400">
                                                                    {t.resolution.mediaUrls.length} proof
                                                                    {t.resolution.mediaUrls.length > 1 ? "s" : ""}
                                                                </a>
                                                            )}
                                                            {t.resolution.resolvedByName && (
                                                                <span className="text-gray-500 dark:text-gray-400">
                                                                    by {t.resolution.resolvedByName}
                                                                </span>
                                                            )}
                                                            {t.resolution.verifiedAt ? (
                                                                <span className="text-green-600 dark:text-green-400">
                                                                    Verified
                                                                    {t.resolution.verifiedByName
                                                                        ? ` by ${t.resolution.verifiedByName}`
                                                                        : ""}
                                                                </span>
                                                            ) : (
                                                                <span className="text-amber-600 dark:text-amber-400">
                                                                    Awaiting verification
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {t.resolvedAt ? formatAge(t.resolvedAt) : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>

            {openTicketId && (
                <TicketDetailModal
                    ticketId={openTicketId}
                    onClose={() => setOpenTicketId(null)}
                    onUpdated={loadTickets}
                />
            )}
        </div>
    );
}
