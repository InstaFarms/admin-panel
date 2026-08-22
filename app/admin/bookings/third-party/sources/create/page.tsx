import { Alert, Breadcrumb, BreadcrumbItem, Button, Card, Label, TextInput } from "flowbite-react";
import { redirect } from "next/navigation";
import { createBookingSourceWithCommission } from "@/actions/bookingSourceActions";

export const dynamic = "force-dynamic";

export default async function ThirdPartySourceCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  async function submit(formData: FormData) {
    "use server";
    const result = await createBookingSourceWithCommission(formData);
    const nextParams = new URLSearchParams();
    if (result.success) nextParams.set("success", result.success);
    if (result.error) nextParams.set("error", result.error);
    redirect(`/admin/bookings/third-party/sources/create?${nextParams.toString()}`);
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Third Party Source
          </h5>
          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/bookings">Bookings</BreadcrumbItem>
            <BreadcrumbItem href="/admin/bookings/third-party">Third Party Bookings</BreadcrumbItem>
            <BreadcrumbItem href="/admin/bookings/third-party/sources">Sources</BreadcrumbItem>
            <BreadcrumbItem href="#">Create</BreadcrumbItem>
          </Breadcrumb>
        </div>

        {params.success ? <Alert color="success">{params.success}</Alert> : null}
        {params.error ? <Alert color="failure">{params.error}</Alert> : null}

        <div className="w-full max-w-2xl mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <form action={submit} className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Third Party Booking Source</Label>
              <TextInput id="name" name="name" required placeholder="Booking.com / Airbnb / MMT" />
            </div>
            <div>
              <Label htmlFor="commissionPercentage">Commission Percentage</Label>
              <TextInput id="commissionPercentage" name="commissionPercentage" type="number" min={0} step="0.01" required />
            </div>
            <Button type="submit">Create Source + Commission</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

