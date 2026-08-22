"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import JSZip from "jszip";
import { Modal } from "flowbite-react";
import toast from "react-hot-toast";
import GalleryDownloadModalContent from "./GalleryDownloadModalContent";
import { captureError } from "@/lib/sentry";

/* ============================
   TYPES
============================ */

export type DownloadPhase =
  | "idle"
  | "downloading"
  | "creating_zip"
  | "done"
  | "error";

export type DownloadItemStatus =
  | "pending"
  | "downloading"
  | "done"
  | "failed";

export interface DownloadItem {
  id: string;
  label: string;
  folder: string;
  url: string;
  status: DownloadItemStatus;
  error?: string;
}

export interface DownloadJob {
  id: string;
  items: DownloadItem[];
}

interface GalleryDownloadState {
  phase: DownloadPhase;
  currentJob: DownloadJob | null;
  overallError: string | null;
  modalOpen: boolean;
}

interface GalleryDownloadContextValue extends GalleryDownloadState {
  completedCount: number;
  totalCount: number;
  startDownload: (items: Omit<DownloadItem, "status" | "error">[]) => void;
  openModal: () => void;
  closeModal: () => void;
  cancelDownload: () => void;
  dismissSuccessPopup: () => void;
}

/* ============================
   CONTEXT
============================ */

const GalleryDownloadContext =
  createContext<GalleryDownloadContextValue | null>(null);

export function useGalleryDownload() {
  const ctx = useContext(GalleryDownloadContext);
  if (!ctx) {
    throw new Error(
      "useGalleryDownload must be used within GalleryDownloadProvider"
    );
  }
  return ctx;
}

/* ============================
   HELPERS
============================ */

const DOWNLOAD_CONCURRENCY = 6;

function withStatus(
  items: Omit<DownloadItem, "status" | "error">[]
): DownloadItem[] {
  return items.map((it) => ({ ...it, status: "pending" as const, error: undefined }));
}

/* ============================
   PROVIDER
============================ */

export function GalleryDownloadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GalleryDownloadState>({
    phase: "idle",
    currentJob: null,
    overallError: null,
    modalOpen: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const completedCount = state.currentJob
    ? state.currentJob.items.filter(
        (i) => i.status === "done" || i.status === "failed"
      ).length
    : 0;
  const totalCount = state.currentJob ? state.currentJob.items.length : 0;

  const runDownloadJob = useCallback(
    async (job: DownloadJob) => {
      cancelledRef.current = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      const updateCurrentJob = (
        updater: (prev: DownloadJob) => DownloadJob
      ) => {
        setState((s) => ({
          ...s,
          currentJob: s.currentJob?.id === job.id ? updater(s.currentJob) : s.currentJob,
        }));
      };

      setState((s) => ({ ...s, phase: "downloading", overallError: null }));

      const zip = new JSZip();
      const items = job.items;
      const total = items.length;
      let nextIndex = 0;

      type PendingResult = { status: "done" | "failed"; error?: string };
      const pendingBatchRef = { current: new Map<string, PendingResult>() };
      let flushScheduled = false;

      const flushBatch = () => {
        if (pendingBatchRef.current.size === 0) {
          flushScheduled = false;
          return;
        }
        const toApply = new Map(pendingBatchRef.current);
        pendingBatchRef.current.clear();
        flushScheduled = false;
        updateCurrentJob((j) => ({
          ...j,
          items: j.items.map((i) => {
            const r = toApply.get(i.id);
            if (r) return { ...i, status: r.status, error: r.error };
            return i;
          }),
        }));
      };

      const scheduleBatchUpdate = () => {
        if (flushScheduled) return;
        flushScheduled = true;
        queueMicrotask(flushBatch);
      };

      const processOne = async (index: number): Promise<void> => {
        const item = items[index];
        try {
          const res = await fetch(
            `/api/proxy-image?url=${encodeURIComponent(item.url)}`,
            { signal }
          );
          if (signal.aborted || cancelledRef.current) return;
          if (!res.ok) throw new Error("Failed to download");
          const blob = await res.blob();
          if (signal.aborted || cancelledRef.current) return;
          zip.folder(item.folder)?.file(item.label, blob, { compression: "STORE" });
          pendingBatchRef.current.set(item.id, { status: "done" });
        } catch (err) {
          if (signal.aborted || cancelledRef.current) return;
          captureError(err);
          const message = err instanceof Error ? err.message : "Failed";
          pendingBatchRef.current.set(item.id, { status: "failed", error: message });
        }
        scheduleBatchUpdate();
      };

      const worker = async (): Promise<void> => {
        while (!signal.aborted && !cancelledRef.current) {
          const index = nextIndex++;
          if (index >= total) break;
          await processOne(index);
        }
      };

      const workerCount = Math.min(DOWNLOAD_CONCURRENCY, total);
      if (workerCount > 0) {
        await Promise.all(
          Array.from({ length: workerCount }, () => worker())
        );
      }
      flushBatch();

      if (signal.aborted || cancelledRef.current) {
        setState((s) => ({
          ...s,
          phase: "idle",
          currentJob: null,
          modalOpen: false,
        }));
        return;
      }

      setState((s) => ({ ...s, phase: "creating_zip" }));

      try {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `gallery-images-${job.id.slice(0, 8)}.zip`;
        link.click();
        URL.revokeObjectURL(url);

        setState((s) => ({
          ...s,
          phase: "done",
          currentJob: s.currentJob,
        }));
        toast.success("Download completed");
      } catch (err) {
        captureError(err);
        const message = err instanceof Error ? err.message : "Zip creation failed";
        setState((s) => ({
          ...s,
          phase: "error",
          overallError: message,
        }));
      }
    },
    []
  );

  const startDownload = useCallback(
    (itemsInput: Omit<DownloadItem, "status" | "error">[]) => {
      setState((s) => {
        if (s.phase !== "idle" || s.currentJob) {
          return s;
        }
        const job: DownloadJob = {
          id: typeof crypto !== "undefined" ? crypto.randomUUID() : `job-${Date.now()}`,
          items: withStatus(itemsInput),
        };
        setTimeout(() => runDownloadJob(job), 0);
        return {
          ...s,
          phase: "downloading",
          currentJob: job,
          modalOpen: true,
          overallError: null,
        };
      });
    },
    [runDownloadJob]
  );

  const cancelDownload = useCallback(() => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((s) => ({
      ...s,
      phase: "idle",
      currentJob: null,
      modalOpen: false,
    }));
  }, []);

  const openModal = useCallback(
    () => setState((s) => ({ ...s, modalOpen: true })),
    []
  );

  const closeModal = useCallback(
    () =>
      setState((s) => ({
        ...s,
        modalOpen: false,
        // Reset job state when closing so "Download as ZIP" can start again
        phase: "idle",
        currentJob: null,
        overallError: null,
      })),
    []
  );

  const dismissSuccessPopup = useCallback(() => {
    setState((s) => ({
      ...s,
      modalOpen: false,
      phase: "idle",
      currentJob: null,
    }));
  }, []);

  const value: GalleryDownloadContextValue = {
    ...state,
    completedCount,
    totalCount,
    startDownload,
    openModal,
    closeModal,
    cancelDownload,
    dismissSuccessPopup,
  };

  return (
    <GalleryDownloadContext.Provider value={value}>
      {children}

      {state.modalOpen && (
        <Modal show onClose={closeModal} size="7xl">
          <div className="min-h-[75vh] flex flex-col">
            <GalleryDownloadModalContent
              phase={state.phase}
              currentJob={state.currentJob}
              overallError={state.overallError}
              completedCount={completedCount}
              totalCount={totalCount}
              onCancel={cancelDownload}
              onClose={closeModal}
            />
          </div>
        </Modal>
      )}
    </GalleryDownloadContext.Provider>
  );
}
