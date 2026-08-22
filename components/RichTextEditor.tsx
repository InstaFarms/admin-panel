"use client";

import dynamic from "next/dynamic";

import { useMemo } from "react";

// Dynamically import Jodit editor to avoid SSR issues
const JoditEditor = dynamic(() => import("jodit-react"), {
    ssr: false,
    loading: () => (
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center dark:bg-gray-800 dark:text-gray-400">
            Loading editor...
        </div>
    ),
});

interface RichTextEditorProps {
    value: string;
    onBlur?: (newContent: string) => void;
    onChange?: (newContent: string) => void;
    placeholder?: string;
    className?: string;
}

export default function RichTextEditor({
    value,
    onBlur,
    onChange,
    placeholder = "Start typing...",
    className = "",
}: RichTextEditorProps) {
    const config = useMemo(
        () => ({
            readonly: false,
            placeholder: placeholder,
            toolbarAdaptive: true,
            buttons: [
                "source",
                "|",
                "bold",
                "italic",
                "underline",
                "strikethrough",
                "|",
                "superscript",
                "subscript",
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
                "undo",
                "redo",
                "|",
                "hr",
                "eraser",
                "copyformat",
                "|",
                "fullsize",
                "print",
                "about",
            ],
            height: 400,
            width: "100%",
        }),
        [placeholder]
    );

    return (
        <div className={`rich-text-editor ${className}`}>
            <JoditEditor
                value={value}
                config={config}
                onBlur={onBlur}
                onChange={onChange}
            />
        </div>
    );
}
