"use client";

import {
  createPropertyFromPayload,
  editPropertyFromPayload,
} from "@/actions/propertyActions";
import { buildPropertyUpsertPayload } from "@/components/properties/editor/buildPropertyUpsertPayload";
import {
  confirmAdvanceAmountIfHigherThanBase,
  validatePropertySubmitPayload,
} from "@/components/properties/editor/propertySubmitValidation";
import { BRAND_SLUGS, type BrandSlug, type PropertyEditorDraft } from "@/lib/properties/propertyEditorDraft";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { captureError } from "@/lib/sentry";

interface EditorStateLike {
  draft: PropertyEditorDraft;
  dirtyPaths: string[];
  dirtySections: string[];
  serverSnapshot: PropertyEditorDraft | null;
  commitDraft: () => void;
}

interface UsePropertySubmitArgs {
  editorState: EditorStateLike;
  isEditMode: boolean;
  saveUnsavedAreas: (propertyIdOverride?: string) => Promise<boolean>;
  propertyId?: string | null;
  activeBrandSlug: BrandSlug;
  propertyUpdatedAt?: string | null;
  onUpdatedAtChange?: (newUpdatedAt: string | null) => void;
  onSuccess?: (savedPropertyId: string | null) => void;
}

export function usePropertySubmit({
  editorState,
  isEditMode,
  saveUnsavedAreas,
  propertyId,
  activeBrandSlug,
  propertyUpdatedAt,
  onUpdatedAtChange,
  onSuccess,
}: UsePropertySubmitArgs) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  const handleSubmit = async (): Promise<boolean> => {
    const toastId = "property-submit";
    const showStep = (message: string, ms = 500) => {
      toast.loading(message, { id: toastId, duration: Infinity });
      return new Promise((r) => setTimeout(r, ms));
    };

    await showStep(isEditMode ? "Starting property update..." : "Starting property create...");
    const payload = buildPropertyUpsertPayload({
      draft: editorState.draft,
      dirtyPaths: editorState.dirtyPaths,
      dirtySections: editorState.dirtySections,
      serverSnapshot: editorState.serverSnapshot,
      brandSlugs: [activeBrandSlug],
    }) as Record<string, unknown>;

    for (const slug of BRAND_SLUGS) {
      const node =
        payload[slug] && typeof payload[slug] === "object"
          ? (payload[slug] as Record<string, unknown>)
          : null;
      if (node) {
        delete node.gallery;
      }
    }

    const relationIntent =
      payload.relationIntent && typeof payload.relationIntent === "object"
        ? (payload.relationIntent as Record<string, unknown>)
        : null;
    if (relationIntent) {
      relationIntent.gallery = "unchanged";
    }

    if (isEditMode) {
      if (propertyUpdatedAt) {
        payload.lastKnownUpdatedAt = propertyUpdatedAt;
      }
    }

    const validationError = validatePropertySubmitPayload(payload);
    if (validationError) {
      toast.dismiss(toastId);
      toast.error(validationError);
      return false;
    }

    await showStep("Validation passed for data.");
    if (!confirmAdvanceAmountIfHigherThanBase(payload)) {
      toast.dismiss(toastId);
      return false;
    }

    await showStep("Preparing canonical property payload");
    toast.loading("Data updating at Database...", { id: toastId, duration: Infinity });

    return await new Promise<boolean>((resolve) => {
    startTransition(() => {
      const promise = isEditMode
        ? editPropertyFromPayload(propertyId!, payload)
        : createPropertyFromPayload(payload);

      promise
        .then(async (result) => {
          if (result.error) {
            throw new Error(result.error);
          }

          const resolvedPropertyId = isEditMode
            ? propertyId || null
            : result.data?.propertyId || null;

          if (resolvedPropertyId) {
            const areaSaved = await saveUnsavedAreas(resolvedPropertyId || undefined);
            if (!areaSaved) {
              toast.error("Property saved, but some audit areas failed to save.");
              return;
            }
          }

          editorState.commitDraft();
          onUpdatedAtChange?.(result.data?.propertyUpdatedAt ?? null);
          onSuccess?.(resolvedPropertyId);

          if (!isEditMode && resolvedPropertyId) {
            router.push(`/admin/properties/${resolvedPropertyId}`);
          } else {
            router.refresh();
          }
          toast.success(
            isEditMode ? "Property updated successfully." : "Property created successfully.",
            { duration: 3000 }
          );
          resolve(true);
        })
        .catch((err) => {
          captureError(err);
          console.error("Property save error:", err);
          const message = (err as Error).message || "Failed to update. Server Error.";
          toast.error(message, {
            duration: 5000,
          });
          resolve(false);
        })
        .finally(() => {
          toast.dismiss(toastId);
        });
    });
    });
  };

  return { loading, handleSubmit };
}
