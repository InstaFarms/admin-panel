/**
 * Shared breadcrumb for admin pages. Renders Flowbite Breadcrumb from an array of links.
 * Use the same items shape (href + label) across list, create, and edit pages.
 */
import { Breadcrumb, BreadcrumbItem } from "flowbite-react";

export interface BreadcrumbItemConfig {
  href: string;
  label: string;
}

export interface PageBreadcrumbProps {
  /** Ordered list of breadcrumb links (last item is often current page with href="#"). */
  items: readonly BreadcrumbItemConfig[];
  /** Optional class name for the Breadcrumb wrapper (default: card-style background and padding). */
  className?: string;
}

const DEFAULT_CLASS_NAME = "bg-white pb-3 dark:bg-gray-800";

export default function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  return (
    <Breadcrumb className={className ?? DEFAULT_CLASS_NAME}>
      {items.map((item) => (
        <BreadcrumbItem key={`${item.href}-${item.label}`} href={item.href}>
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}
