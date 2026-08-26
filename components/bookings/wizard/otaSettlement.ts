export type AccommodationGstPolicy = {
  boundary: number;
  lower: number;
  higher: number;
};

export const DEFAULT_ACCOMMODATION_GST_POLICY: AccommodationGstPolicy = {
  boundary: 7500,
  lower: 5,
  higher: 18,
};

export const PLATFORM_COMMISSION_GST_RATE = 18;

export type OtaSettlementInput = {
  amount: string | number;
  amountInputType: "INCLUSIVE" | "EXCLUSIVE";
  checkIn?: string | null;
  checkOut?: string | null;
  accommodationGstPolicy?: AccommodationGstPolicy;
  platformCommissionPercentage?: number | null;
  platformCommissionGstRate?: number;
};

export type OtaSettlementCalculation = {
  enteredAmount: number;
  nights: number;
  bookingGstRate: number;
  bookingGstAmount: number;
  totalAmountInclGst: number;
  taxableBookingAmount: number;
  platformCommissionPercentage: number;
  platformCommissionAmount: number;
  platformCommissionGstRate: number;
  platformCommissionGst: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const nonNegativeNumber = (value: string | number | null | undefined) => {
  const normalized = String(value ?? "").replace(/[^0-9.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

const countNights = (checkIn?: string | null, checkOut?: string | null) => {
  if (!checkIn || !checkOut) return 1;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
};

/**
 * Derives the values that are known from the booking amount and property
 * configuration. OTA fee and TDS deliberately stay outside this calculation:
 * those are statement-specific deductions and cannot be inferred safely.
 */
export function calculateOtaSettlement(
  input: OtaSettlementInput,
): OtaSettlementCalculation {
  const enteredAmount = nonNegativeNumber(input.amount);
  const nights = countNights(input.checkIn, input.checkOut);
  const policy =
    input.accommodationGstPolicy ?? DEFAULT_ACCOMMODATION_GST_POLICY;
  const platformCommissionPercentage = Math.max(
    0,
    Number(input.platformCommissionPercentage) || 0,
  );
  const platformCommissionGstRate = Math.max(
    0,
    Number(input.platformCommissionGstRate) || PLATFORM_COMMISSION_GST_RATE,
  );

  // The GST slab is determined from the tariff before GST. For a total copied
  // inclusive of GST, first test it at the lower slab; anything above the
  // configured boundary belongs to the higher slab.
  const perNightAtLowerGst = enteredAmount / nights / (1 + policy.lower / 100);
  const perNightExclusive = enteredAmount / nights;
  const bookingGstRate =
    (input.amountInputType === "INCLUSIVE"
      ? perNightAtLowerGst
      : perNightExclusive) > policy.boundary
      ? policy.higher
      : policy.lower;
  const gstMultiplier = 1 + bookingGstRate / 100;
  const taxableBookingAmount =
    input.amountInputType === "INCLUSIVE"
      ? roundMoney(enteredAmount / gstMultiplier)
      : roundMoney(enteredAmount);
  const bookingGstAmount = roundMoney(
    taxableBookingAmount * (bookingGstRate / 100),
  );
  const totalAmountInclGst = roundMoney(
    taxableBookingAmount + bookingGstAmount,
  );
  const platformCommissionAmount = roundMoney(
    taxableBookingAmount * (platformCommissionPercentage / 100),
  );
  const platformCommissionGst = roundMoney(
    platformCommissionAmount * (platformCommissionGstRate / 100),
  );

  return {
    enteredAmount,
    nights,
    bookingGstRate,
    bookingGstAmount,
    totalAmountInclGst,
    taxableBookingAmount,
    platformCommissionPercentage,
    platformCommissionAmount,
    platformCommissionGstRate,
    platformCommissionGst,
  };
}

export const moneyInput = (value: number) => String(roundMoney(value));
