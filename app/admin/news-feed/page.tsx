"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
} from "flowbite-react";
import { HiTicket } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import PropertySelector from "@/components/PropertySelector";

import { fetchNewsFeedQuestions } from "@/actions/newsFeedActions";

import { formatAdminDateTime } from "@/lib/dateUtils";
import { QUESTION_STATUSES, statusBadgeColor, statusLabel } from "@/constants/newsFeed";

export default function NewsFeedPage() {
    // ── Questions state ────────────────────────────────────────────────────────
    const [questions, setQuestions] = useState<any[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [questionsCursor, setQuestionsCursor] = useState<string | null>(null);
    const [questionsLoadingMore, setQuestionsLoadingMore] = useState(false);
    const [questionStatusFilter, setQuestionStatusFilter] = useState("");
    const [questionPropertyFilter, setQuestionPropertyFilter] = useState<string | null>(null);

    const questionFilters = useCallback(
        () => ({
            ...(questionStatusFilter ? { status: questionStatusFilter } : {}),
            ...(questionPropertyFilter ? { propertyId: questionPropertyFilter } : {}),
        }),
        [questionStatusFilter, questionPropertyFilter]
    );

    const loadQuestions = useCallback(async () => {
        setQuestionsLoading(true);
        const result = await fetchNewsFeedQuestions(questionFilters());
        if (result.success && result.data) {
            setQuestions(result.data.items || []);
            setQuestionsCursor(result.data.nextCursor || null);
        } else {
            toast.error(result.message || result.error || "Failed to fetch questions");
        }
        setQuestionsLoading(false);
    }, [questionFilters]);

    const loadMoreQuestions = async () => {
        if (!questionsCursor) return;
        setQuestionsLoadingMore(true);
        const result = await fetchNewsFeedQuestions({ ...questionFilters(), cursor: questionsCursor });
        if (result.success && result.data) {
            setQuestions((prev) => [...prev, ...(result.data.items || [])]);
            setQuestionsCursor(result.data.nextCursor || null);
        } else {
            toast.error(result.message || result.error || "Failed to fetch questions");
        }
        setQuestionsLoadingMore(false);
    };

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    return (
        <div className="flex w-full flex-col">
            <Card className="w-full bg-white dark:bg-gray-800">
                <div className="space-between flex w-full flex-col gap-4">
                    {/* Title + link to Tickets */}
                    <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            News Feed
                        </h5>
                        <Button as={Link} href="/admin/tickets" size="xs" color="light">
                            <HiTicket className="mr-2 h-4 w-4" />
                            Go to Tickets
                        </Button>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex flex-col sm:flex-row">
                        <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                            <BreadcrumbItem href="/">Home</BreadcrumbItem>
                            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                            <BreadcrumbItem href="#">News Feed</BreadcrumbItem>
                        </Breadcrumb>
                    </div>
                </div>

                {/* Question filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <Select
                        sizing="sm"
                        value={questionStatusFilter}
                        onChange={(e) => setQuestionStatusFilter(e.target.value)}
                        className="w-auto"
                    >
                        <option value="">All Statuses</option>
                        {QUESTION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {statusLabel(s)}
                            </option>
                        ))}
                    </Select>
                    <div className="min-w-64">
                        <PropertySelector
                            propertyId={questionPropertyFilter}
                            update={setQuestionPropertyFilter}
                        />
                    </div>
                </div>

                {/* Questions table */}
                <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <Table hoverable striped>
                            <TableHead>
                              <TableRow>
                                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Question</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Category</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Asked By</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Routed To</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                                  <TableHeadCell className="whitespace-nowrap">Asked At</TableHeadCell>
                              </TableRow>
                            </TableHead>
                            <TableBody className="divide-y">
                                {questionsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center">
                                            <JarvisLoader size="lg" />
                                        </TableCell>
                                    </TableRow>
                                ) : questions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                                            No questions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    questions.map((question) => (
                                        <TableRow
                                            key={question.id}
                                            className="bg-white dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {question.propertyName || "N/A"}
                                            </TableCell>
                                            <TableCell className="max-w-96 truncate text-gray-700 dark:text-gray-300">
                                                {question.body}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {question.category || "-"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {question.askerName || "N/A"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {question.routedRoleLabel || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    color={statusBadgeColor(question.status)}
                                                    className="inline-block whitespace-nowrap text-xs font-semibold uppercase"
                                                >
                                                    {statusLabel(question.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {formatAdminDateTime(question.createdAt, { fallback: "-" })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {questionsCursor && !questionsLoading && (
                    <div className="flex justify-center pt-2">
                        <Button
                            size="xs"
                            color="light"
                            onClick={loadMoreQuestions}
                            disabled={questionsLoadingMore}
                        >
                            {questionsLoadingMore ? "Loading…" : "Load more"}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
