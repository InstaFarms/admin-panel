"use client";

import { useState } from "react";
import { HiClipboard, HiCheck } from "react-icons/hi";

import { Tooltip } from "flowbite-react";

export default function CouponCodeCopy({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{code}</span>
            <Tooltip content={copied ? "Copied!" : "Copy code"}>
                <button
                    onClick={handleCopy}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    {copied ? (
                        <HiCheck className="w-4 h-4 text-green-500" />
                    ) : (
                        <HiClipboard className="w-4 h-4" />
                    )}
                </button>
            </Tooltip>
        </div>
    );
}
