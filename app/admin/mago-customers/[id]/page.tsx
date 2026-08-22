import { Badge, Button, Card } from "flowbite-react";
import { DateTime } from "luxon";
import { notFound } from "next/navigation";

import { getCustomerBookings } from "@/actions/bookingActions";
import { getCustomerById } from "@/actions/customerActions";
import { getPropertiesByIds } from "@/actions/propertyActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import CustomerDetailTabs from "@/components/customers/CustomerDetailTabs";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { mapPropertyData } from "@/lib/propertyUtils";
import type { ServerPageProps } from "@/utils/types";
import DeleteCustomerButton from "../DeleteCustomerButton";
import CustomerEditor from "./CustomerEditor";

const MAGO_BREADCRUMBS = {
  edit: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-customers", label: "Mago Customers" },
    { href: "#", label: "Edit" },
  ],
};

const EDIT_FORM_ID = "mago-customer-edit-form";

function formatDateOfBirth(value?: string | null) {
  if (!value) return "Not added";
  const dob = DateTime.fromSQL(value);
  return dob.isValid ? dob.toFormat("dd LLL yyyy") : "Not added";
}

export default async function Page({ params, searchParams }: ServerPageProps) {
  const { id } = await params;
  const search = await searchParams;
  const idString = Array.isArray(id) ? id[0] : (id ?? "");
  const requestedTab = typeof search?.tab === "string" ? search.tab : "details";
  const activeTab =
    requestedTab === "bookings" ? "bookings" : requestedTab === "favorites" ? "favorites" : "details";

  const result = await getCustomerById(idString, {
    brandName: CUSTOMER_BRANDS.MAGO,
  });

  const bookingsResult = await getCustomerBookings(idString, {
    brandName: CUSTOMER_BRANDS.MAGO,
    limit: 100,
  });

  if (!result.data) notFound();

  const customer = result.data;
  const bookings = bookingsResult.success ?? [];
  const bookingsError = bookingsResult.error ?? null;
  const favoriteIds = Array.from(
    new Set(
      (customer.favorites ?? [])
        .map((favorite) => {
          if (typeof favorite === "string") return favorite;
          if (favorite && typeof favorite === "object") {
            const maybeId = (favorite as { id?: unknown; propertyId?: unknown }).propertyId ?? (favorite as { id?: unknown }).id;
            return typeof maybeId === "string" ? maybeId : "";
          }
          return "";
        })
        .filter(Boolean)
    )
  );
  const favoritePropertiesResult = await getPropertiesByIds(favoriteIds);
  const favoriteProperties = (favoritePropertiesResult.data ?? []).map(mapPropertyData);
  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Unnamed Customer";
  const detailsHref = `/admin/mago-customers/${customer.id}?tab=details`;
  const bookingsHref = `/admin/mago-customers/${customer.id}?tab=bookings`;
  const favoritesHref = `/admin/mago-customers/${customer.id}?tab=favorites`;

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <PageBreadcrumb items={MAGO_BREADCRUMBS.edit} />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {fullName}
                </h1>
                <Badge color="info">Mago</Badge>
                {customer.gender ? <Badge color="gray">{customer.gender}</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">
                Review and update this customer profile using the same guided editor structure as the admin records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "details" ? (
                <>
                  <Button
                    type="submit"
                    form={EDIT_FORM_ID}
                    className="border border-blue-500 bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:border-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-blue-800"
                  >
                    Save Changes
                  </Button>
                  <DeleteCustomerButton id={customer.id} brandName={CUSTOMER_BRANDS.MAGO} />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CustomerDetailTabs
            activeTab={activeTab}
            detailsHref={detailsHref}
            bookingsHref={bookingsHref}
            favoritesHref={favoritesHref}
            bookings={bookings}
            favoriteProperties={favoriteProperties}
            bookingsError={bookingsError}
          >
            <>
              <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-100 px-6 py-7 shadow-sm dark:border-gray-700 dark:from-[#111827] dark:via-[#131c2f] dark:to-[#0f172a] xl:px-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.28em] text-gray-500 dark:text-slate-400">Customer Snapshot</p>
                      <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">{fullName}</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge color="info">Mago Customer</Badge>
                      {customer.gender ? <Badge color="gray">{customer.gender}</Badge> : null}
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                        DOB {formatDateOfBirth(customer.dob)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-300">
                      <span>
                        Customer ID: <span className="font-medium text-gray-900 dark:text-white">{customer.id}</span>
                      </span>
                      <span>
                        Mobile: <span className="font-medium text-gray-900 dark:text-white">{customer.mobileNumber || "Not added"}</span>
                      </span>
                      <span>
                        Email: <span className="font-medium text-gray-900 dark:text-white">{customer.email || "Not added"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="xl:text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Contact Email</p>
                    <p className="mt-2 break-all text-xl font-semibold text-gray-900 dark:text-white">
                      {customer.email || "Not added"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                      Primary communication channel on file for this customer.
                    </p>
                  </div>
                </div>
              </section>

              <CustomerEditor data={customer} brandName={CUSTOMER_BRANDS.MAGO} formId={EDIT_FORM_ID} />
            </>
          </CustomerDetailTabs>
        </div>
      </Card>
    </div>
  );
}
