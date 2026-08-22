import { Badge, Button, Card } from "flowbite-react";
import Link from "next/link";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import CustomerEditor from "../[id]/CustomerEditor";

const MAGO_BREADCRUMBS = {
  create: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-customers", label: "Mago Customers" },
    { href: "#", label: "Create" },
  ],
};

const CREATE_FORM_ID = "mago-customer-create-form";

export default async function Page() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <PageBreadcrumb items={MAGO_BREADCRUMBS.create} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Create New Customer
                </h1>
                <Badge color="info">Mago</Badge>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
                Set up a fresh Mago customer profile with identity details, contact information, and mobile verification before saving.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/admin/mago-customers">
                <Button color="gray">Cancel</Button>
              </Link>
              <Button
                type="submit"
                form={CREATE_FORM_ID}
                className="border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-800"
              >
                Create Customer
              </Button>
            </div>
          </div>
        </div>

        <CustomerEditor brandName={CUSTOMER_BRANDS.MAGO} formId={CREATE_FORM_ID} />
      </Card>
    </div>
  );
}
