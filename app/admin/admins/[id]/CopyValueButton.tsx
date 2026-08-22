"use client";

import { useState } from "react";
import { Button } from "flowbite-react";
import toast from "react-hot-toast";
import { HiClipboardCopy, HiCheck } from "react-icons/hi";

interface CopyValueButtonProps {
  value: string;
  label: string;
}

export default function CopyValueButton({ value, label }: CopyValueButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Button color="gray" size="xs" pill onClick={handleCopy} className="[&>span]:items-center">
      <span className="inline-flex items-center gap-1.5">
        {copied ? <HiCheck className="h-3.5 w-3.5" /> : <HiClipboardCopy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </span>
    </Button>
  );
}
