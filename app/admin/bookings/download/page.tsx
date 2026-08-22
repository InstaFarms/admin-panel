import {
    Breadcrumb,
    BreadcrumbItem,
    Card,
  } from "flowbite-react";
  import DownloadBookingsForm from "@/components/bookings/DownloadBookingsForm";
  
  export default async function DownloadBookingsPage() {
    return (
      <div className="flex w-full flex-col">
        <Card className="w-full bg-white">
          <div className="space-between flex w-full flex-row items-center">
            <div className="flex w-full flex-col gap-2">
              <div className="flex flex-row justify-between">
                <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Download Bookings
                </h5>
              </div>
  
              <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
                <BreadcrumbItem href="/">Home</BreadcrumbItem>
                <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                <BreadcrumbItem href="/admin/bookings">Booking Management</BreadcrumbItem>
                <BreadcrumbItem>Download</BreadcrumbItem>
              </Breadcrumb>
            </div>
          </div>
  
          <DownloadBookingsForm />
        </Card>
      </div>
    );
  }