"use client";

export const PROPERTY_EDITOR_FORM_ID = "propertyForm";

interface UsePropertyEditorViewModelArgs {
  draftPropertyName: string;
  propertyId?: string | null;
}

export function usePropertyEditorViewModel({
  draftPropertyName,
  propertyId,
}: UsePropertyEditorViewModelArgs) {
  const pageTitle =
    draftPropertyName || (propertyId ? "Loading..." : "New Property");

  return {
    pageTitle,
  };
}
