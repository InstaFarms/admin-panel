"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";

import {
  checkPropertyInvoiceExpenseReadiness,
  generatePropertyInvoice,
  getPropertyInvoiceHistory,
} from "@/actions/propertyInvoiceActions";
import type {
  MonthEndTerms,
  PropertyInvoice,
} from "@/actions/propertyInvoiceActions";
import SectionHeading from "@/components/properties/SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionPanel,
  AccordionTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";

import { JarvisLoader } from "@/components/JarvisLogo";

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatMonth(value: string) {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "Current month";
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusColor(status: PropertyInvoice["status"]) {
  if (status === "PAID") return "success";
  if (status === "ISSUED") return "info";
  if (status === "CANCELLED") return "failure";
  return "gray";
}

const amountRows = [
  ["Booking Revenue", "totalBookingRevenue"],
  ["Positive Adjustments", "totalPositiveAdjustments"],
  ["Negative Adjustments", "totalNegativeAdjustments"],
  ["Notional Revenue", "totalNotionalRevenue"],
  ["Commission", "totalCommission"],
  ["Commission GST", "totalCommissionGst"],
  ["TDS", "totalTds"],
  ["Expenses", "totalExpenses"],
  ["Milestone Adjustment", "milestoneAdjustmentAmount"],
  ["Owner Block Rent (excl GST)", "totalOwnerBlockRentExclGst"],
  ["Owner Block Rent GST", "totalOwnerBlockRentGst"],
  ["Owner Net Payable", "ownerNetPayable"],
  ["Platform Net Earning", "platformNetEarning"],
] as const;

const monthEndTermRows = [
  ["Status", "status", "text"],
  ["Revenue With GST", "revenueWithGst", "money"],
  ["Revenue Without GST", "revenueWithoutGst", "money"],
  ["Commission Base", "commissionableBaseTotal", "money"],
  ["Commission Charged", "commissionCharged", "money"],
  ["Commission GST Charged", "commissionGstCharged", "money"],
  ["Commission Adjustment", "commissionAdjustment", "money"],
  ["Commission GST Adjustment", "commissionGstAdjustment", "money"],
  ["Owner Credit Amount", "ownerCreditAmount", "money"],
  ["Provisional Commission Rate", "provisionalCommissionRate", "percent"],
  ["Final Commission Rate", "finalCommissionRate", "percent"],
  ["Provisional Milestone", "provisionalMilestoneNumber", "text"],
  ["Final Milestone", "finalMilestoneNumber", "text"],
  ["Closed At", "closedAt", "date"],
] as const;

function getCurrentMonthInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function PropertyInvoiceSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [isGenerating, startGenerateTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInputValue);
  const [invoices, setInvoices] = useState<PropertyInvoice[]>([]);
  const [monthEndTerms, setMonthEndTerms] = useState<MonthEndTerms[]>([]);

  async function loadInvoiceHistory(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const data = await getPropertyInvoiceHistory(propertyId);
      setInvoices(data.invoices);
      setMonthEndTerms(data.monthEndTerms);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load property invoice",
      );
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoiceHistory();
  }, [propertyId]);

  const generateInvoiceForMonth = (targetMonth: string) => {
    if (!targetMonth) {
      toast.error("Please select month and year");
      return;
    }

    startGenerateTransition(async () => {
      try {
        setSelectedMonth(targetMonth);
        const readiness = await checkPropertyInvoiceExpenseReadiness(
          propertyId,
          targetMonth,
        );
        if (!readiness.ready) {
          const missing = readiness.missingCategories
            .map((category) => category.name)
            .join(", ");
          toast.error(
            missing
              ? `Please fill expenses for: ${missing}`
              : "Please fill all expenses before generating invoice",
          );
          return;
        }

        const result = await generatePropertyInvoice(
          propertyId,
          targetMonth,
        );
        await loadInvoiceHistory({ silent: true });
        if (result?.invoice?.month) {
          setSelectedMonth(result.invoice.month.slice(0, 7));
        }
        toast.success("Invoice generated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to generate invoice",
        );
      }
    });
  };

  const handleGenerateCurrentMonthInvoice = () => {
    generateInvoiceForMonth(getCurrentMonthInputValue());
  };

  const handleGenerateSelectedMonthInvoice = () => {
    generateInvoiceForMonth(selectedMonth);
  };

  const renderMonthEndTermValue = (
    value: MonthEndTerms[(typeof monthEndTermRows)[number][1]],
    format: (typeof monthEndTermRows)[number][2],
  ) => {
    if (value == null || value === "") return "N/A";
    if (format === "money") return formatMoney(value as number | string);
    if (format === "percent") return `${Number(value).toFixed(2)}%`;
    if (format === "date") return formatDate(value as string);
    return String(value);
  };

  const renderInvoiceDetails = (invoice: PropertyInvoice) => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Invoice Number
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {invoice.invoiceNumber}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Month</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {formatMonth(invoice.month)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
          <Badge color={statusColor(invoice.status)} className="mt-2 w-fit">
            {invoice.status}
          </Badge>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Owner</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {invoice.ownerName || invoice.ownerEmail || invoice.ownerId}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Owner Net Payable
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">
            {formatMoney(invoice.ownerNetPayable)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Platform Net Earning
          </p>
          <p className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-100">
            {formatMoney(invoice.platformNetEarning)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Owner Block Rent
          </p>
          <p className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-100">
            {formatMoney(
              Number(invoice.totalOwnerBlockRentExclGst ?? 0) +
                Number(invoice.totalOwnerBlockRentGst ?? 0),
            )}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            {Number(invoice.totalOwnerBlockRentNights ?? 0)} nights ·{" "}
            {formatMoney(invoice.totalOwnerBlockRentExclGst)} excl GST ·{" "}
            {formatMoney(invoice.totalOwnerBlockRentGst)} GST
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Issued / Due / Paid
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {formatDate(invoice.issuedAt)} / {formatDate(invoice.dueDate)} /{" "}
            {formatDate(invoice.paidAt)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHead>
            <TableRow>
              <TableHeadCell>Component</TableHeadCell>
              <TableHeadCell>Amount</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {amountRows.map(([label, key]) => (
              <TableRow
                key={key}
                className="bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <TableCell className="font-medium text-slate-900 dark:text-white">
                  {label}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatMoney(invoice[key])}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderMonthEndTermsDetails = (terms: MonthEndTerms) => (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHead>
          <TableRow>
            <TableHeadCell>Term</TableHeadCell>
            <TableHeadCell>Value</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {monthEndTermRows.map(([label, key, valueFormat]) => (
            <TableRow
              key={key}
              className="bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <TableCell className="font-medium text-slate-900 dark:text-white">
                {label}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {renderMonthEndTermValue(terms[key], valueFormat)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <SectionHeading
          title="Invoice"
          description="View or generate the property invoice for the selected month."
          className="mb-0"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Button
            type="button"
            onClick={handleGenerateCurrentMonthInvoice}
            disabled={loading || isGenerating}
          >
            Generate Invoice
          </Button>
          <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Month</span>
            <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
              <TextInput
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="min-w-[170px] [&_input]:rounded-none [&_input]:border-0 [&_input]:focus:ring-0"
              />
              <Button
                type="button"
                onClick={handleGenerateSelectedMonthInvoice}
                disabled={loading || isGenerating || !selectedMonth}
                className="rounded-none"
              >
                {isGenerating ? "Generating..." : "Generate For Month"}
              </Button>
            </div>
          </label>
        </div>
      </div>

      <Accordion collapseAll={false}>
        <AccordionPanel>
          <AccordionTitle>Invoice</AccordionTitle>
          <AccordionContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <JarvisLoader size="md" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No invoices generated for this property.
                </p>
              </div>
            ) : (
              <Accordion collapseAll>
                {invoices.map((invoice) => (
                  <AccordionPanel key={invoice.id}>
                    <AccordionTitle>
                      <div className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
                        <span>{formatMonth(invoice.month)}</span>
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                          {invoice.invoiceNumber} ·{" "}
                          {formatMoney(invoice.ownerNetPayable)}
                        </span>
                      </div>
                    </AccordionTitle>
                    <AccordionContent>
                      {renderInvoiceDetails(invoice)}
                    </AccordionContent>
                  </AccordionPanel>
                ))}
              </Accordion>
            )}
          </AccordionContent>
        </AccordionPanel>

        <AccordionPanel>
          <AccordionTitle>Month End Terms</AccordionTitle>
          <AccordionContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <JarvisLoader size="md" />
              </div>
            ) : monthEndTerms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No month-end terms found for this property.
                </p>
              </div>
            ) : (
              <Accordion collapseAll>
                {monthEndTerms.map((terms) => (
                  <AccordionPanel key={terms.id}>
                    <AccordionTitle>
                      <div className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
                        <span>{formatMonth(terms.month)}</span>
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                          Commission {formatMoney(terms.commissionCharged)} ·
                          Owner credit {formatMoney(terms.ownerCreditAmount)}
                        </span>
                      </div>
                    </AccordionTitle>
                    <AccordionContent>
                      {renderMonthEndTermsDetails(terms)}
                    </AccordionContent>
                  </AccordionPanel>
                ))}
              </Accordion>
            )}
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </section>
  );
}
