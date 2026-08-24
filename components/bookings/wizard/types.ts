export type ReservationType = "guest" | "owner" | "block" | "enquiry";

export type SourceKind = "DIRECT" | "ASSISTED" | "OTA" | "CORPORATE" | "TRAVEL_AGENT";

export type PaymentRow = {
  id: string;
  amount: string;
  method: "CASH" | "UPI" | "BANK_TRANSFER" | "PAYMENT_GATEWAY";
  date: string;
  paymentFor: "FULL_PAYMENT" | "ADVANCE" | "BALANCE" | "ADJUSTMENT";
  ref: string;
  /** Who physically received this guest payment. This controls settlement rail. */
  receiverType: "PLATFORM" | "OWNER";
  /** Legacy draft field. Do not use this for financial routing. */
  collectedBy: string;
  pgGateway: string;
  pgId: string;
  pgFee: string;
  bankName: string;
  bankRef: string;
};

export type WizardBrand = { id: string; name: string };
export type WizardCommissionSource = {
  id: string;
  sourceName: string;
  sourceCode: string;
  description: string | null;
};

export type CustomerLite = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string | null;
  resCount?: number | string | null;
  lastStay?: string | null;
};

export type PropertyLite = {
  id: string;
  name: string;
  code?: string;
  area?: string | null;
  city?: string | null;
  propertyType?: string | null;
  baseGuests?: number | null;
  maxGuests?: number | null;
  rate?: number | null;
  /** Per-weekday GST-inclusive base rate, keyed by JS Date.getDay() (0=Sunday..6=Saturday). Individually nullable if that day isn't priced. */
  weeklyRates?: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, number | null>> | null;
  imageUrl?: string | null;
};

export type WizardState = {
  theme: "light" | "dark";
  step: number;
  maxStep: number;
  direction: 1 | -1 | 0;

  resType: ReservationType;
  brandId: string;
  brandName: string;

  // Blocking-only
  blockMode: "" | "temp" | "perm";
  blockDuration: string;
  blockReason: string;
  blockReasonOther: string;
  blockCustId: string | null;
  blockCustName: string;
  blockCustPhone: string;
  blockCustEmail: string;
  blockCustCity: string;
  blockNewCust: boolean;
  /** Required when the selected property is a Resort (room-level blocking). */
  blockRoomId: string | null;
  /** Set once PropertyBlockForm resolves whether the selected property is a Resort. */
  blockIsResort: boolean;

  // Enquiry-only (kept for backend-action compatibility; unreachable from Step 1)
  enqName: string;
  enqPhone: string;
  enqEmail: string;
  enqInterest: string;

  // Shared, short-flow
  propertyId: string | null;
  property: PropertyLite | null;
  checkIn: string | null;
  checkOut: string | null;
  internalNotes: string;

  // Step 1 — booking source (Direct / Owner Referral / Third Party Travel Agent)
  sourceCategory: "DIRECT_BOOKING" | "OWNER_BOOKING" | "THIRD_PARTY_BOOKING";
  commissionBookingSourceId: string;
  sourceKind: SourceKind | null;
  pickedSourceId: string | null;
  agentName: string;
  agentVoucher: string;
  agentCommTerms: string;
  agentSettleTerms: string;

  // Step 1 — purpose
  tripPurpose: string;
  purposeOther: string;
  occasions: string[];
  occasionOther: string;

  // Step 2 — property browse
  propQ: string;
  fArea: string;
  fType: string;
  fCap: string;
  fBudget: string;
  propSort: string;
  propView: "list" | "map";

  // Step 3 — dates + guests
  adults: number;
  children: number;
  infants: number;
  fAdults: number;
  fChildren: number;
  fInfants: number;
  guestNotes: string;

  // Step 4 — guest
  customerId: string | null;
  customer: CustomerLite | null;
  custQ: string;
  newGuestOpen: boolean;
  ngName: string;
  ngPhone: string;
  ngEmail: string;

  // Step 5 — commercials
  quote: any | null;
  quoteLoading: boolean;
  quoteError: string | null;
  baseOverrideStr: string;
  // The authoritative, override- and GST-slab-aware totals computed live by
  // Step7Commercials -- every later step (Payment, Review, Success) and the
  // final booking submission read these instead of the raw, un-overridden
  // s.quote fields.
  quoteFinalTotal: number;
  quoteGstAmount: number;
  quoteGstPercentage: number;
  quoteStayTotal: number;
  taxType: "b2c" | "b2b";
  b2bGstin: string;
  b2bCompany: string;
  b2bCity: string;

  // Step 6 — payment
  payMode: "manual" | "link" | "skip" | "";
  rows: PaymentRow[];
  linkEmail: boolean;
  linkWa: boolean;
  linkMsgOpen: boolean;
  linkNote: string;
  ovEmail: string;
  ovWa: string;
  linkStatus: "idle" | "sent" | "pending" | "confirmed";
  pendingBookingId: string | null;

  // Completed OTA Booking flow (resType "owner")
  icalSync: "" | "yes" | "no";
  icalBooking: string | null;
  icalQuery: string;
  icalDate: string;
  icalShowAll: boolean;
  otaChannel: string;
  ota: {
    channel: string;
    ref: string;
    amount: string;
    commission: string;
    occTax: string;
    tds: string;
    notes: string;
    daywiseBreakup?: any[];
  };

  // Terminal
  bookingId: string | null;
  createdBookingRecordId: string | null;

  savedAt: number | null;
};
