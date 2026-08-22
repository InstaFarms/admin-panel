"use client";

import { useMemo } from "react";

export function usePropertyRichTextConfig() {
  return useMemo(
    () => ({
      height: 400,
      placeholder: "Enter property summary...",
      toolbar: true,
      showCharsCounter: true,
      showWordsCounter: true,
      showXPathInStatusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_only_text" as const,
      spellcheck: true,
      style: {
        color: "#ffffff",
        backgroundColor: "#000000",
      },
      buttons: [
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
        "|",
        "copyformat",
        "fullsize",
      ],
    }),
    []
  );
}
