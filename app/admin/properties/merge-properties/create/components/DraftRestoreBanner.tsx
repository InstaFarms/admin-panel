"use client";

import { Button, Card } from "flowbite-react";

interface DraftRestoreBannerProps {
  visible: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftRestoreBanner({ visible, onRestore, onDiscard }: DraftRestoreBannerProps) {
  if (!visible) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-700 dark:text-gray-200">
          A saved draft was found for merge property creation.
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" onClick={onRestore}>
            Restore Draft
          </Button>
          <Button size="xs" color="light" onClick={onDiscard}>
            Discard Draft
          </Button>
        </div>
      </div>
    </Card>
  );
}

