"use client";

import { useEffect, useState } from "react";
import { Badge, Modal, ModalBody, ModalHeader } from "flowbite-react";
import { HiOutlineExternalLink, HiOutlineIdentification } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";

import {
  getBookingGuestIds,
  type GuestIdCapture,
  type GuestIdCollection,
} from "@/actions/fieldOpsActions";

function formatDateTime(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function GuestIdCardsPanel({
  bookingId,
}: {
  bookingId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<GuestIdCollection | null>(null);
  const [captures, setCaptures] = useState<GuestIdCapture[]>([]);
  const [preview, setPreview] = useState<GuestIdCapture | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getBookingGuestIds(bookingId)
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setError(res.error || "Failed to load guest IDs");
          return;
        }
        setCollection(res.data?.collection ?? null);
        setCaptures(res.data?.captures ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load guest IDs");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const expected = collection?.expectedCount ?? 0;
  const collected = collection?.collectedCount ?? captures.length;
  const hasShortfall = expected > 0 && collected < expected;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineIdentification className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Guest ID Cards
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID documents collected on-site for this booking.
            </p>
          </div>
        </div>

        {collection || captures.length > 0 ? (
          <div className="flex items-center gap-2">
            <Badge color={hasShortfall ? "failure" : "success"} size="sm">
              {collected} / {expected || collected} collected
            </Badge>
            {collection?.status ? (
              <Badge color="gray" size="sm">
                {collection.status}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasShortfall ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
          Shortfall: {expected - collected} of {expected} ID card
          {expected - collected === 1 ? "" : "s"} not yet collected.
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <JarvisLoader size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 py-6 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : captures.length === 0 ? (
        <div className="rounded-lg border border-slate-200 py-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
          No guest ID cards have been collected for this booking yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {captures.map((capture) => (
            <button
              type="button"
              key={capture.id}
              onClick={() => setPreview(capture)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700"
              title="Click to enlarge"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capture.mediaUrl}
                alt="Guest ID card"
                className="aspect-[3/2] w-full object-cover transition group-hover:scale-105"
                loading="lazy"
              />
              {capture.createdAt ? (
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] text-white">
                  {formatDateTime(capture.createdAt)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <Modal show={!!preview} onClose={() => setPreview(null)} size="4xl">
        <ModalHeader>Guest ID Card</ModalHeader>
        <ModalBody>
          {preview ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.mediaUrl}
                alt="Guest ID card enlarged"
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
              {preview.createdAt ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Captured {formatDateTime(preview.createdAt)}
                </div>
              ) : null}
              <a
                href={preview.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <HiOutlineExternalLink className="h-4 w-4" />
                Open original in new tab
              </a>
            </div>
          ) : null}
        </ModalBody>
      </Modal>
    </div>
  );
}
