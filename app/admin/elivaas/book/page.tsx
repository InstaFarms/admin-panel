import { Card } from "flowbite-react";
import Link from "next/link";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ServerPageProps } from "@/utils/types";
import { createElivaasBooking } from "@/actions/elivaasActions";
import ElivaasBookingForm from "./ElivaasBookingForm";

export const dynamic = "force-dynamic";

function formatINR(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ElivaasBookPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;

  const propertyId = typeof params.propertyId === "string" ? params.propertyId : "";
  const propertyName = typeof params.propertyName === "string" ? params.propertyName : propertyId;
  const ratePlanCode = typeof params.ratePlanCode === "string" ? params.ratePlanCode : "";
  const ratePlanName = typeof params.ratePlanName === "string" ? params.ratePlanName : ratePlanCode;
  const checkinDate = typeof params.checkinDate === "string" ? params.checkinDate : "";
  const checkoutDate = typeof params.checkoutDate === "string" ? params.checkoutDate : "";
  const adults = typeof params.adults === "string" ? params.adults : "2";
  const children = typeof params.children === "string" ? params.children : "0";
  const numberOfNights = typeof params.numberOfNights === "string" ? params.numberOfNights : "1";
  const netAmountAfterTax = typeof params.netAmountAfterTax === "string" ? params.netAmountAfterTax : "0";
  const netAmountBeforeTax = typeof params.netAmountBeforeTax === "string" ? params.netAmountBeforeTax : "0";
  const gstAmount = typeof params.gstAmount === "string" ? params.gstAmount : "0";
  const securityDeposit = typeof params.securityDeposit === "string" ? params.securityDeposit : "0";
  const netPerNightAmountAfterTax = typeof params.netPerNightAmountAfterTax === "string" ? params.netPerNightAmountAfterTax : "0";
  const errorMessage = typeof params.error === "string" ? params.error : "";

  const backHref = `/admin/elivaas?${new URLSearchParams({
    city: typeof params.city === "string" ? params.city : "",
    checkinDate, checkoutDate, adults, children,
  }).toString()}`;

  if (!propertyId || !ratePlanCode || !checkinDate || !checkoutDate) {
    return (
      <div className="flex w-full flex-col">
        <Card className="py-12 text-center text-gray-500">
          Invalid booking parameters.{" "}
          <Link href="/admin/elivaas" className="text-blue-600 underline">
            Go back to search
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 max-w-2xl mx-auto">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-4">
          <div>
            <h5 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Booking</h5>
            <PageBreadcrumb
              items={[
                { label: "Home", href: "/admin/dashboard" },
                { label: "Elivaas", href: "/admin/elivaas" },
                { label: "Book", href: "#" },
              ]}
            />
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {/* Pricing Summary */}
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-gray-900">
            <h6 className="mb-3 font-semibold text-gray-800 dark:text-white">Booking Summary</h6>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Property" value={propertyName} />
              <Row label="Rate Plan" value={ratePlanName} />
              <Row label="Check-in" value={checkinDate} />
              <Row label="Check-out" value={checkoutDate} />
              <Row label="Guests" value={`${adults} adults, ${children} children`} />
              <Row label="Nights" value={numberOfNights} />
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <Row label="Subtotal (excl. GST)" value={formatINR(netAmountBeforeTax)} />
              <Row label="GST" value={formatINR(gstAmount)} />
              <Row
                label="Total"
                value={formatINR(netAmountAfterTax)}
                bold
              />
              {parseFloat(securityDeposit) > 0 && (
                <Row
                  label="Security Deposit"
                  value={formatINR(securityDeposit)}
                  note="Collected at property"
                />
              )}
              <Row label="Per Night" value={formatINR(netPerNightAmountAfterTax)} />
            </div>
          </div>

          {/* Guest Details Form */}
          <ElivaasBookingForm
            action={createElivaasBooking}
            hiddenFields={{
              propertyId,
              ratePlanCode,
              checkinDate,
              checkoutDate,
              adults,
              children,
            }}
            backHref={backHref}
          />
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  note,
}: {
  label: string;
  value: string;
  bold?: boolean;
  note?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-right text-gray-900 dark:text-white ${bold ? "font-bold text-base" : ""}`}>
        {value}
        {note && <span className="ml-1 text-xs text-gray-400">({note})</span>}
      </span>
    </div>
  );
}
