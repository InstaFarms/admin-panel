"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
} from "flowbite-react";
import toast from "react-hot-toast";

import {
  getPropertyOnboardingReviewQueue,
  getPropertyOnboardingSubmission,
  reviewPropertyOnboardingSubmission,
} from "@/actions/propertyOnboardingSubmissionActions";

type Submission = Record<string, any>;
type Queue = {
  submissions: Submission[];
  frozenBaselines: Submission[];
  unreadNotificationCount: number;
};

const statusColor: Record<string, string> = {
  PENDING_ADMIN_REVIEW: "warning",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  CHANGES_REQUESTED: "purple",
  REJECTED: "failure",
};

function dateText(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function JsonSnapshot({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

export default function PropertyOnboardingSubmissionsPage() {
  const [queue, setQueue] = useState<Queue>({
    submissions: [],
    frozenBaselines: [],
    unreadNotificationCount: 0,
  });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<
    "APPROVE" | "CHANGES_REQUESTED" | "REJECT"
  >("APPROVE");
  const [reviewNote, setReviewNote] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const result: any = await getPropertyOnboardingReviewQueue();
    if (result.success) {
      setQueue(
        result.data ?? {
          submissions: [],
          frozenBaselines: [],
          unreadNotificationCount: 0,
        },
      );
    } else {
      toast.error(
        result.message || "Unable to load property onboarding review queue",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function selectSubmission(id: string) {
    const result: any = await getPropertyOnboardingSubmission(id);
    if (!result.success) {
      toast.error(result.message || "Unable to load request detail");
      return;
    }
    setSelected(result.data);
    setDecision("APPROVE");
    setReviewNote("");
  }

  async function review() {
    if (!selected) return;
    if (decision !== "APPROVE" && !reviewNote.trim()) {
      toast.error("Add a review note for requested changes or rejection");
      return;
    }
    setSaving(true);
    const result: any = await reviewPropertyOnboardingSubmission(selected.id, {
      decision,
      reviewNote: reviewNote.trim() || undefined,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.message || "Unable to record review");
      return;
    }
    toast.success(
      decision === "APPROVE"
        ? "Property request approved"
        : decision === "REJECT"
          ? "Property request rejected"
          : "Changes requested from Supervisor",
    );
    setSelected(null);
    await loadQueue();
  }

  if (loading && !queue.submissions.length && !queue.frozenBaselines.length) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Property Onboarding Review
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review Supervisor-submitted new-property intakes, existing-property
            changes, and frozen baseline evidence.
          </p>
        </div>
        <Button
          color="light"
          onClick={() => void loadQueue()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Alert color="info">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Supervisor drafts are private until submitted. Approval is the only
            action that writes the reviewed name and location to a canonical
            property.
          </span>
          <Badge color="info">
            {queue.unreadNotificationCount} unread review{" "}
            {queue.unreadNotificationCount === 1
              ? "notification"
              : "notifications"}
          </Badge>
        </div>
      </Alert>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submitted requests</h2>
          <Badge color="gray">{queue.submissions.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Kind</TableHeadCell>
                <TableHeadCell>Property</TableHeadCell>
                <TableHeadCell>Location</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Submitted</TableHeadCell>
                <TableHeadCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {queue.submissions.length ? (
                queue.submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {submission.kind === "NEW_PROPERTY"
                        ? "New Property"
                        : "Existing Property"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {submission.propertyName}
                    </TableCell>
                    <TableCell>{submission.location}</TableCell>
                    <TableCell>
                      <Badge
                        color={
                          (statusColor[submission.status] || "gray") as any
                        }
                      >
                        {submission.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{dateText(submission.submittedAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => void selectSubmission(submission.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-gray-500"
                  >
                    No submitted property requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selected && (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Request detail</h2>
              <p className="text-sm text-gray-500">
                {selected.propertyName} · {selected.location}
              </p>
            </div>
            <Badge color={(statusColor[selected.status] || "gray") as any}>
              {selected.status.replaceAll("_", " ")}
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label className="mb-2 block">Original property snapshot</Label>
              <JsonSnapshot value={selected.originalSnapshot} />
            </div>
            <div>
              <Label className="mb-2 block">Supervisor proposal snapshot</Label>
              <JsonSnapshot value={selected.proposalSnapshot} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Request history</h3>
            <div className="space-y-2">
              {(selected.events ?? []).map((event: Submission) => (
                <div key={event.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">
                      {event.eventType.replaceAll("_", " ")}
                    </span>
                    <span className="text-gray-500">
                      {dateText(event.createdAt)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      {event.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!!selected.baselines?.length && (
            <details>
              <summary className="cursor-pointer font-medium">
                Frozen baseline evidence ({selected.baselines.length})
              </summary>
              <div className="mt-3 space-y-3">
                {selected.baselines.map((baseline: Submission) => (
                  <JsonSnapshot
                    key={baseline.id}
                    value={baseline.baselineSnapshot}
                  />
                ))}
              </div>
            </details>
          )}

          {selected.status === "PENDING_ADMIN_REVIEW" && (
            <div className="rounded-lg border border-blue-200 p-4 dark:border-blue-900">
              <h3 className="font-medium">Admin decision</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
                <div>
                  <Label htmlFor="submission-decision">Decision</Label>
                  <Select
                    id="submission-decision"
                    value={decision}
                    onChange={(event) =>
                      setDecision(event.target.value as typeof decision)
                    }
                  >
                    <option value="APPROVE">Approve</option>
                    <option value="CHANGES_REQUESTED">Request changes</option>
                    <option value="REJECT">Reject</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="submission-note">
                    Review note{" "}
                    {decision !== "APPROVE" ? "(required)" : "(optional)"}
                  </Label>
                  <Textarea
                    id="submission-note"
                    rows={3}
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Explain the decision for the Supervisor and audit trail"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => void review()} disabled={saving}>
                  {saving ? "Saving…" : "Save decision"}
                </Button>
                <Button
                  color="light"
                  onClick={() => setSelected(null)}
                  disabled={saving}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Frozen onboarding baselines
            </h2>
            <p className="text-sm text-gray-500">
              The most recent 100 immutable baseline submissions.
            </p>
          </div>
          <Badge color="gray">{queue.frozenBaselines.length}</Badge>
        </div>
        <div className="space-y-3">
          {queue.frozenBaselines.length ? (
            queue.frozenBaselines.map((baseline) => (
              <details key={baseline.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer">
                  <span className="font-medium">{baseline.propertyName}</span> ·
                  Version {baseline.versionNumber} · frozen{" "}
                  {dateText(baseline.frozenAt)}
                </summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">
                      Property details captured at onboarding
                    </Label>
                    <JsonSnapshot value={baseline.sessionPropertySnapshot} />
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      Immutable baseline snapshot
                    </Label>
                    <JsonSnapshot value={baseline.baselineSnapshot} />
                  </div>
                </div>
              </details>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">
              No frozen onboarding baselines yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
