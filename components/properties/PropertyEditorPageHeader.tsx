import { ADMIN_BASE_PATH } from "@/constants/routes";
import PageBreadcrumb from "@/components/PageBreadcrumb";

interface PropertyEditorPageHeaderProps {
  isEditMode: boolean;
}

export default function PropertyEditorPageHeader({
  isEditMode,
}: PropertyEditorPageHeaderProps) {
  const breadcrumbs = [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/properties", label: "Properties" },
    { href: "#", label: isEditMode ? "Edit" : "Create" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        Properties
      </h5>
      <PageBreadcrumb
        items={breadcrumbs}
        className="bg-white pb-3 dark:bg-gray-800"
      />
    </div>
  );
}
