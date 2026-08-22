export const EXPENSE_CATEGORY_BREADCRUMBS = {
  list: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "#", label: "ExpensesCategories" },
  ],
  create: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/expense-categories", label: "ExpensesCategories" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/expense-categories", label: "ExpensesCategories" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const EXPENSE_CATEGORY_SEARCH_KEYS = [
  "Category Name",
  "Property",
  "Description",
] as const;

export const EXPENSE_CATEGORY_ERRORS = {
  notFound: "Expense category not found.",
} as const;
