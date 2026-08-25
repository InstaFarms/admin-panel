"use client";

import LabelWrapper from "@/components/LabelWrapper";
import DayWiseVariablesSection from "@/components/properties/DayWiseVariablesSection";
import SpecialDatesSection from "@/components/properties/SpecialDatesSection";
import SectionHeading from "@/components/properties/SectionHeading";
import ToggleField from "@/components/properties/ToggleField";
import { SpecialDateData } from "@/utils/types";
import { Select, TabItem, Tabs, TextInput } from "flowbite-react";
import type { ReactNode } from "react";

interface CommercialSectionProps {
  commercialBrandLabel?: string;
  gstPolicy?: { boundary: number; lower: number; higher: number };
  commercial: Record<string, unknown>;
  setCommercialField: (field: string, value: unknown) => void;
  specialDateData: SpecialDateData[];
  updateSpecialDate: (data: SpecialDateData) => boolean | void;
  addSpecialDate: () => void;
  removeSpecialDate: (id: string) => void;
  createNewSpecialDate: () => SpecialDateData;
  setSpecialDateData: (data: SpecialDateData[]) => void;
  maxGuestCount?: number | null;
  commissionPercentage?: number | null;
  setCommissionPercentage?: (value: number | null) => void;
  isFixedLeaseModel?: boolean;
  cookingAccessFee: number;
  setCookingAccessFee: (value: number) => void;
  bonFireFee: number;
  setBonFireFee: (value: number) => void;
  barbequeFee: number;
  setBarbequeFee: (value: number) => void;
  cleaningFee: number;
  setCleaningFee: (value: number) => void;
  lateCheckoutCharges: number;
  setLateCheckoutCharges: (value: number) => void;
  minBookingNights: number;
  setMinBookingNights: (value: number) => void;
  securityDeposit?: number | null;
  setSecurityDeposit?: (value: number | null) => void;
  advancePaymentEnabled: boolean;
  setAdvancePaymentEnabled: (value: boolean) => void;
  advancePaymentPercentage: string;
  handleAdvancePercentageChange: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  agreementMilestonePanel?: ReactNode;
  expensesPanel?: ReactNode;
  invoicePanel?: ReactNode;
  sourceCommissionsPanel?: ReactNode;
  notionalRevenueConfigPanel?: ReactNode;
  minBookingRulesPanel?: ReactNode;
}

const parseNonNegativeNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return null;
  return Math.max(0, num);
};

export default function CommercialSection({
  commercialBrandLabel,
  gstPolicy,
  commercial,
  setCommercialField,
  specialDateData,
  updateSpecialDate,
  addSpecialDate,
  removeSpecialDate,
  createNewSpecialDate,
  setSpecialDateData,
  maxGuestCount,
  commissionPercentage,
  setCommissionPercentage,
  isFixedLeaseModel,
  cookingAccessFee,
  setCookingAccessFee,
  bonFireFee,
  setBonFireFee,
  barbequeFee,
  setBarbequeFee,
  cleaningFee,
  setCleaningFee,
  lateCheckoutCharges,
  setLateCheckoutCharges,
  minBookingNights,
  setMinBookingNights,
  securityDeposit,
  setSecurityDeposit,
  advancePaymentEnabled,
  setAdvancePaymentEnabled,
  advancePaymentPercentage,
  handleAdvancePercentageChange,
  agreementMilestonePanel,
  expensesPanel,
  invoicePanel,
  sourceCommissionsPanel,
  notionalRevenueConfigPanel,
  minBookingRulesPanel,
}: CommercialSectionProps) {
  const commissionLabelPrefix = (commercialBrandLabel ?? "Instafarms").trim();
  const numericAdvancePercentage = Number(advancePaymentPercentage);
  const normalizedAdvancePercentage = Number.isFinite(numericAdvancePercentage)
    ? Math.min(100, Math.max(0, numericAdvancePercentage))
    : 0;
  const parseTiming = (raw: unknown, fallback: "checkin" | "checkout") =>
    (typeof raw === "string" && (raw === "checkin" || raw === "checkout")
      ? raw
      : fallback) as "checkin" | "checkout";
  const parseOffset = (raw: unknown, fallback: number) => {
    if (typeof raw === "number" && Number.isFinite(raw))
      return Math.max(0, Math.trunc(raw));
    if (typeof raw === "string") {
      const parsed = Number(raw);
      return Number.isFinite(parsed)
        ? Math.max(0, Math.trunc(parsed))
        : fallback;
    }
    return fallback;
  };
  const parseTime = (raw: unknown, fallback: string) =>
    typeof raw === "string" && raw.trim().length > 0 ? raw : fallback;

  const normalWalletReleaseTiming = parseTiming(
    commercial.normalWalletReleaseTiming ?? commercial.walletReleaseTiming,
    "checkin",
  );
  const normalWalletReleaseOffsetDays = parseOffset(
    commercial.normalWalletReleaseOffsetDays ??
      commercial.walletReleaseOffsetDays,
    1,
  );
  const normalWalletReleaseTime = parseTime(
    commercial.normalWalletReleaseTime ?? commercial.walletReleaseTime,
    "07:00:00",
  );

  const icalWalletReleaseTiming = parseTiming(
    commercial.icalWalletReleaseTiming,
    "checkin",
  );
  const icalWalletReleaseOffsetDays = parseOffset(
    commercial.icalWalletReleaseOffsetDays,
    3,
  );
  const icalWalletReleaseTime = parseTime(
    commercial.icalWalletReleaseTime,
    "07:00:00",
  );
  const bookingSourceCommissions =
    commercial.bookingSourceCommissions &&
    typeof commercial.bookingSourceCommissions === "object" &&
    !Array.isArray(commercial.bookingSourceCommissions)
      ? (commercial.bookingSourceCommissions as Record<string, unknown>)
      : {};
  const getCommissionBySource = (
    key: "online" | "offline" | "ical",
  ): number | null => {
    const value = bookingSourceCommissions[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const setCommissionBySource = (
    key: "online" | "offline" | "ical",
    next: number | null,
  ) => {
    setCommercialField("bookingSourceCommissions", {
      ...bookingSourceCommissions,
      [key]: next,
    });
  };

  const sectionCardClass =
    "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  const renderNumericField = ({
    label,
    id,
    value,
    onChange,
    unit,
    placeholder,
    min,
    max,
    hint,
    disabled,
    disabledReason,
  }: {
    label: string;
    id: string;
    value: number | null | undefined;
    onChange: (next: number | null) => void;
    unit: "%" | "INR";
    placeholder: string;
    min?: number;
    max?: number;
    hint?: string;
    disabled?: boolean;
    disabledReason?: string;
  }) => (
    <LabelWrapper label={label}>
      <div className="space-y-2">
        <div className="relative">
          <TextInput
            type="number"
            inputMode="decimal"
            id={id}
            name={id}
            min={min}
            max={max}
            step="0.01"
            value={value?.toString() || ""}
            onChange={(e) => onChange(parseNonNegativeNumber(e.target.value))}
            placeholder={placeholder}
            disabled={disabled}
            className="[&_input]:pr-16"
          />
          <span className="pointer-events-none absolute top-1/2 right-1 inline-flex h-8 min-w-10 -translate-y-1/2 items-center justify-center rounded-md border border-gray-300 bg-gray-100 px-2 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
            {unit}
          </span>
        </div>
        {disabled && disabledReason ? (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {disabledReason}
          </p>
        ) : hint ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        ) : null}
      </div>
    </LabelWrapper>
  );

  const renderWalletReleaseCard = ({
    title,
    description,
    timing,
    offsetDays,
    releaseTime,
    timingField,
    offsetField,
    timeField,
    offsetFallback,
  }: {
    title: string;
    description: string;
    timing: "checkin" | "checkout";
    offsetDays: number;
    releaseTime: string;
    timingField: string;
    offsetField: string;
    timeField: string;
    offsetFallback: number;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Releases {offsetDays} day{offsetDays === 1 ? "" : "s"} after{" "}
          {timing === "checkin" ? "check-in" : "check-out"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <LabelWrapper label="Release Base">
          <Select
            value={timing}
            onChange={(e) => setCommercialField(timingField, e.target.value)}
          >
            <option value="checkin">Check-in</option>
            <option value="checkout">Check-out</option>
          </Select>
        </LabelWrapper>
        <LabelWrapper label="Offset Days">
          <TextInput
            type="number"
            min={0}
            step={1}
            value={String(offsetDays)}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              setCommercialField(
                offsetField,
                Number.isFinite(parsed)
                  ? Math.max(0, Math.trunc(parsed))
                  : offsetFallback,
              );
            }}
            placeholder={String(offsetFallback)}
          />
        </LabelWrapper>
        <LabelWrapper label="Release Time">
          <TextInput
            type="time"
            step={1}
            value={releaseTime}
            onChange={(e) => setCommercialField(timeField, e.target.value)}
          />
        </LabelWrapper>
      </div>
    </div>
  );

  return (
    <Tabs>
      <TabItem title="General">
        <div className="w-full space-y-6">
          <section className={sectionCardClass}>
            <SectionHeading
              title="Commercial Settings"
              description="Manage the commercial defaults used for pricing, owner settlements, and payment collection."
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <SectionHeading
                  title="Core charges"
                  description="Define the default commercial values that apply to each confirmed booking."
                  className="mb-5"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {renderNumericField({
                    label: `${commissionLabelPrefix} Commission Percentage`,
                    id: "commissionPercentage",
                    value: commissionPercentage,
                    onChange: (next) => setCommissionPercentage?.(next),
                    unit: "%",
                    placeholder: "Enter commission",
                    min: 0,
                    max: 100,
                    hint: "Platform share from the booking amount.",
                    disabled: isFixedLeaseModel,
                    disabledReason:
                      "Not used on Fixed Lease — the platform keeps the full booking value per stay, and the owner is paid a flat monthly rent instead (set on the Agreement & Milestone tab).",
                  })}

                  {renderNumericField({
                    label: "Security Deposit",
                    id: "securityDeposit",
                    value: securityDeposit,
                    onChange: (next) => setSecurityDeposit?.(next),
                    unit: "INR",
                    placeholder: "Enter deposit",
                    min: 0,
                    hint: "Refundable amount collected at check-in.",
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <SectionHeading
                  title="Payment collection"
                  description="Control whether guests can pay partially and how much should be collected upfront."
                  className="mb-5"
                />

                <div className="space-y-4">
                  <ToggleField
                    label="Advance Payment Enabled"
                    checked={advancePaymentEnabled}
                    onChange={setAdvancePaymentEnabled}
                    description="Allow the booking flow to accept partial payment at confirmation."
                  />

                  <div
                    className={`rounded-xl border p-4 transition ${
                      advancePaymentEnabled
                        ? "border-emerald-200 bg-white dark:border-emerald-800 dark:bg-slate-950/50"
                        : "border-dashed border-slate-300 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Advance percentage
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Choose the portion of the total booking amount to
                          collect upfront.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {advancePaymentEnabled
                          ? "Editable"
                          : "Turn on advance payment to edit"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="relative">
                        <TextInput
                          type="number"
                          id="advancePaymentPercentage"
                          name="advancePaymentPercentage"
                          min={0}
                          max={100}
                          step="0.01"
                          value={advancePaymentPercentage}
                          onChange={handleAdvancePercentageChange}
                          placeholder="Enter percentage"
                          disabled={!advancePaymentEnabled}
                          className="[&_input]:pr-14"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-1 inline-flex h-8 min-w-9 -translate-y-1/2 items-center justify-center rounded-md border border-gray-300 bg-gray-100 px-2 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                          %
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: `${advancePaymentEnabled ? normalizedAdvancePercentage : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>0%</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {advancePaymentEnabled
                              ? normalizedAdvancePercentage.toFixed(2)
                              : "0.00"}
                            %
                          </span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <SectionHeading
                  title="Miscellaneous Charges"
                  description="Track extra service charges collected outside the base booking price."
                  className="mb-5"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {renderNumericField({
                    label: "Cooking Access Fee",
                    id: "cookingAccessFee",
                    value: cookingAccessFee,
                    onChange: (next) => setCookingAccessFee(next ?? 0),
                    unit: "INR",
                    placeholder: "Enter fee",
                    min: 0,
                    hint: "One-time fee for kitchen access.",
                  })}
                  {renderNumericField({
                    label: "Bon Fire Fee",
                    id: "bonFireFee",
                    value: bonFireFee,
                    onChange: (next) => setBonFireFee(next ?? 0),
                    unit: "INR",
                    placeholder: "Enter fee",
                    min: 0,
                    hint: "Charge for bonfire setup or usage.",
                  })}
                  {renderNumericField({
                    label: "Barbeque Fee",
                    id: "barbequeFee",
                    value: barbequeFee,
                    onChange: (next) => setBarbequeFee(next ?? 0),
                    unit: "INR",
                    placeholder: "Enter fee",
                    min: 0,
                    hint: "Applicable when guests request barbeque access.",
                  })}
                  {renderNumericField({
                    label: "Cleaning Fee",
                    id: "cleaningFee",
                    value: cleaningFee,
                    onChange: (next) => setCleaningFee(next ?? 0),
                    unit: "INR",
                    placeholder: "Enter fee",
                    min: 0,
                    hint: "Use for cleanup or turnaround charges.",
                  })}
                  {renderNumericField({
                    label: "Late Checkout Charges",
                    id: "lateCheckoutCharges",
                    value: lateCheckoutCharges,
                    onChange: (next) => setLateCheckoutCharges(next ?? 0),
                    unit: "INR",
                    placeholder: "Enter fee",
                    min: 0,
                    hint: "Collected when guests check out beyond the standard time.",
                  })}
                  <LabelWrapper label="Min Booking Nights (Universal)">
                    <div className="space-y-2">
                      <div className="relative">
                        <TextInput
                          type="number"
                          id="minBookingNights"
                          name="minBookingNights"
                          min={1}
                          step={1}
                          value={minBookingNights?.toString() ?? "1"}
                          onChange={(e) => {
                            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setMinBookingNights(v);
                          }}
                          placeholder="1"
                          className="[&_input]:pr-20"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-1 inline-flex h-8 min-w-16 -translate-y-1/2 items-center justify-center rounded-md border border-gray-300 bg-gray-100 px-2 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                          nights
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Default minimum. Use the &quot;Peak Rules&quot; tab for date-specific overrides.
                      </p>
                    </div>
                  </LabelWrapper>
                </div>
              </div>



              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/60">
                <SectionHeading
                  title="Owner wallet release"
                  description="Decide when pending owner credits become available for withdrawal."
                  className="mb-5"
                />

                <div className="space-y-4">
                  {renderWalletReleaseCard({
                    title: "Normal bookings",
                    description:
                      "Applies to direct and standard booking flows. Default: check-in + 1 day at 07:00.",
                    timing: normalWalletReleaseTiming,
                    offsetDays: normalWalletReleaseOffsetDays,
                    releaseTime: normalWalletReleaseTime,
                    timingField: "normalWalletReleaseTiming",
                    offsetField: "normalWalletReleaseOffsetDays",
                    timeField: "normalWalletReleaseTime",
                    offsetFallback: 1,
                  })}

                  {renderWalletReleaseCard({
                    title: "iCal bookings",
                    description:
                      "Use a separate release schedule for imported or synced reservations.",
                    timing: icalWalletReleaseTiming,
                    offsetDays: icalWalletReleaseOffsetDays,
                    releaseTime: icalWalletReleaseTime,
                    timingField: "icalWalletReleaseTiming",
                    offsetField: "icalWalletReleaseOffsetDays",
                    timeField: "icalWalletReleaseTime",
                    offsetFallback: 3,
                  })}
                </div>

                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Ledger credits stay pending until the selected booking
                  milestone, offset, and release time are reached.
                </p>
              </div>
            </div>
          </section>
        </div>
      </TabItem>

      <TabItem title="Day wise Variables">
        <DayWiseVariablesSection
          commercial={commercial}
          setCommercialField={setCommercialField}
          maxGuestCount={maxGuestCount}
          gstPolicy={gstPolicy}
        />
      </TabItem>

      <TabItem title="Special Dates">
        <SpecialDatesSection
          specialDateData={specialDateData}
          updateSpecialDate={updateSpecialDate}
          addSpecialDate={addSpecialDate}
          removeSpecialDate={removeSpecialDate}
          createNewSpecialDate={createNewSpecialDate}
          setSpecialDateData={setSpecialDateData}
          maxGuestCount={maxGuestCount}
          gstPolicy={gstPolicy}
        />
      </TabItem>
      {minBookingRulesPanel ? (
        <TabItem title="Peak Rules">
          {minBookingRulesPanel}
        </TabItem>
      ) : null}
      {agreementMilestonePanel ? (
        <TabItem title="Agreement & Milestone">
          {agreementMilestonePanel}
        </TabItem>
      ) : null}
      {expensesPanel ? (
        <TabItem title="Expense Tabs">{expensesPanel}</TabItem>
      ) : null}
      {sourceCommissionsPanel ? (
        <TabItem title="SourceCommissions">{sourceCommissionsPanel}</TabItem>
      ) : null}
      {notionalRevenueConfigPanel ? (
        <TabItem title="Notional Revenue Config">
          {notionalRevenueConfigPanel}
        </TabItem>
      ) : null}
      {invoicePanel ? <TabItem title="Invoice">{invoicePanel}</TabItem> : null}
    </Tabs>
  );
}
