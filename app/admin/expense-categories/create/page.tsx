import ExpenseCategoryForm from "@/components/expense-categories/ExpenseCategoryForm";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { EXPENSE_CATEGORY_BREADCRUMBS } from "@/constants/expenseCategories";
import { Card } from "flowbite-react";

export default function CreateExpenseCategoryPage() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            ExpensesCategories
          </h5>
          <PageBreadcrumb items={EXPENSE_CATEGORY_BREADCRUMBS.create} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Create Expense Category
          </h6>
          <ExpenseCategoryForm />
        </div>
      </Card>
    </div>
  );
}
