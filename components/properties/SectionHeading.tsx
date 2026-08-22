"use client";

interface SectionHeadingProps {
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeading({
  title,
  description,
  className = "mb-4",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
    </div>
  );
}
