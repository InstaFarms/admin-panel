import { getExpenseCategoryById } from "@/actions/expenseCategoryActions";
import ExpenseCategoryForm from "@/components/expense-categories/ExpenseCategoryForm";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import {
  EXPENSE_CATEGORY_BREADCRUMBS,
  EXPENSE_CATEGORY_ERRORS,
} from "@/constants/expenseCategories";
import { ServerPageProps } from "@/utils/types";
import { Card } from "flowbite-react";

export default async function EditExpenseCategoryPage({
  params,
}: ServerPageProps) {
  const { id } = await params;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");
  const data = await getExpenseCategoryById(idString);

  if (!data) {
    throw new Error(EXPENSE_CATEGORY_ERRORS.notFound);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            ExpensesCategories
          </h5>
          <PageBreadcrumb items={EXPENSE_CATEGORY_BREADCRUMBS.edit} />
        </div>

        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 overflow-x-auto rounded-xl bg-slate-100 p-5 transition-all duration-200 dark:bg-gray-900">
          <h6 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Expense Category
          </h6>
          <ExpenseCategoryForm data={data} />
        </div>
      </Card>
    </div>
  );
}
