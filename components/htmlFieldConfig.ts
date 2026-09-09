"use client";

import { useMemo } from "react";

import { useDarkMode } from "@/hooks/bookings/useDarkMode";

export type HtmlFieldSize = "compact" | "full";

const FULL_BUTTONS = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "|",
  "ul",
  "ol",
  "|",
  "outdent",
  "indent",
  "|",
  "font",
  "fontsize",
  "brush",
  "paragraph",
  "|",
  "image",
  "table",
  "link",
  "|",
  "align",
  "|",
  "undo",
  "redo",
  "|",
  "hr",
  "eraser",
  "copyformat",
  "|",
  "source",
  "fullsize",
];

// Short-form fields (FAQ answers, info blocks) get the same core formatting minus
// the page-layout tools that make no sense inside a card.
const COMPACT_BUTTONS = [
  "bold",
  "italic",
  "underline",
  "|",
  "ul",
  "ol",
  "|",
  "link",
  "|",
  "paragraph",
  "brush",
  "|",
  "undo",
  "redo",
  "|",
  "eraser",
  "source",
];

/**
 * Single Jodit config for every rich-text field in the admin panel.
 * Sizes only differ in height and how many toolbar buttons are shown.
 */
export function useHtmlFieldConfig(size: HtmlFieldSize = "full", placeholder?: string) {
  const isDarkMode = useDarkMode();

  return useMemo(
    () => ({
      readonly: false,
      placeholder: placeholder ?? "Start typing...",
      theme: isDarkMode ? "dark" : "default",
      toolbar: true,
      toolbarAdaptive: true,
      toolbarSticky: false,
      statusbar: size === "full",
      showCharsCounter: size === "full",
      showWordsCounter: size === "full",
      showXPathInStatusbar: false,
      // Keep pasted formatting but drop Word/Docs junk markup, instead of
      // prompting the admin with a dialog on every paste.
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_clear_html" as const,
      spellcheck: true,
      height: size === "compact" ? 220 : 400,
      width: "100%",
      buttons: size === "compact" ? COMPACT_BUTTONS : FULL_BUTTONS,
    }),
    [size, placeholder, isDarkMode]
  );
}
