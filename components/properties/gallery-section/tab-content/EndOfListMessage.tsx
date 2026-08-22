"use client";

interface EndOfListMessageProps {
  className?: string;
  message?: string;
}

export default function EndOfListMessage({ className, message }: EndOfListMessageProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {message ?? "This is the end - no more images in this tab."}
      </p>
    </div>
  );
}
