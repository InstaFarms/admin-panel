import type {
  activities,
  amenities,
  bookings,
  properties,
  propertyTypes,
  timestamps,
  users,
} from "@repo/db/schema";

// areas, cities, states tables were removed from the schema (replaced by unified locations).
// Types are defined as plain interfaces to avoid breaking existing code.
type _AreasRow = {
  id: string; area: string; cityId: string | null; stateId: string | null;
  icon: string | null; weight: string; featured: boolean; slug: string | null;
  faqs: any; meta: any; areaInfo: any;
  adminCreatedBy: string; adminUpdatedBy: string;
  createdAt: string; updatedAt: string;
};
type _CitiesRow = {
  id: string; city: string; cityTag: string | null; stateId: string;
  weight: string; featured: boolean; cityInfo: any;
  adminCreatedBy: string; adminUpdatedBy: string;
  createdAt: string; updatedAt: string;
};
type _StatesRow = {
  id: string; state: string; stateSlug: string | null;
  adminCreatedBy: string; adminUpdatedBy: string;
  createdAt: string; updatedAt: string;
};
import type { AdminPanelRole, AdminPermissionKey } from "@repo/db/types";

type PropertyBrandContentSection = {
  items: PropertyBrandContentSectionItem[];
  title?: string;
  subtitle?: string;
};

type PropertyBrandContentSectionItem = {
  label: string;
  description?: string;
  amount?: number | null;
};
export const roleOptions = ["Owner", "Manager", "Caretaker"] as const;
export const webhookStatusOptions = ["PENDING", "PROCESSED"] as const;
export const genderOptions = ["Male", "Female", "Other"] as const; // Added "Other"
export const refundStatusOptions = ["Pending", "Completed", "Failed"] as const;
export const cancellationTypeOptions = ["Online", "Offline"] as const;
export const bookingTypeOptions = ["Online", "Offline"] as const;
export const transactionTypeOptions = ["Credit", "Debit"] as const;
export const paymentTypeOptions = ["Security Deposit", "Rent"] as const;
export const paymentModeOptions = ["Cash", "Online"] as const;
export const bookingPaymentMethodOptions = ["CASH", "BANK_TRANSFER", "UPI", "PG"] as const;
export const bookingPaymentInstrumentOptions = ["UPI", "NET_BANKING", "OTHERS"] as const;
export const bookingPaymentForOptions = [
  "FULL_PAYMENT",
  "ADVANCE_PAYMENT",
  "BALANCE_PAYMENT",
  "ADJUSTMENT",
] as const;
export const bookingPaymentGatewayOptions = ["RAZORPAY", "CASHFREE", "OTHERS"] as const;

export interface Admin {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  gender?: Gender | null;
  whatsappNumber?: string | null;
  alternateContact?: string | null;
  addressDetails?: Record<string, unknown> | null;
  loginAt?: string | null;
  logoutAt?: string | null;
  panelRole?: AdminPanelRole;
  adminCreatedBy?: string | null;
  adminUpdatedBy?: string | null;
  adminCreatedByName?: string | null;
  adminUpdatedByName?: string | null;
  role?: string; // Add this
  status?: string; // Add this
  department?: string; // Add this
  notes?: string; // Add this
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermissionGrant {
  role: AdminPanelRole;
  canView: boolean;
  canEdit: boolean;
}

export interface AdminPermissionMatrixEntry {
  id: string;
  key: AdminPermissionKey;
  label: string;
  isActive: boolean;
  grants: RolePermissionGrant[];
}

export interface AdminPermissionMatrix {
  roles: AdminPanelRole[];
  permissions: AdminPermissionMatrixEntry[];
}

export interface MyAdminPermission {
  permissionKey: AdminPermissionKey;
  canView: boolean;
  canEdit: boolean;
}

export interface ServerActionResult<T = any> {
  success?: string;
  error?: string;
  status?: number;
  data?: T;
}

export interface ServerSearchResult<T> {
  data?: T;
  error?: string;
  status?: number;
}

export interface ServerPageProps {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export type TimestampKeys = keyof typeof timestamps;


export type Activity = Omit<typeof activities.$inferSelect, TimestampKeys>;

export type Amenity = Omit<typeof amenities.$inferSelect, TimestampKeys>;

export type _Area = Omit<_AreasRow, TimestampKeys>;

export type Area = _Area & {
  [key: string]: any;
  icon?: string | null;
  weight?: string | number | null;
  stateId: string | null;
  city: {
    id: string;
    city: string;
  } | null;
  state: {
    id: string;
    state: string;
  } | null;
};

export type _City = Omit<_CitiesRow, TimestampKeys>;

// Updated City type to match the query structure
export type City = _City & {
  state: {
    id: string;
    state: string;
  } | null;
};

export type PropertyManagementType = "MAGO_MANAGED" | "LISTING_ONLY";
export type AuditComplianceStatus = "COMPLIANT" | "NOT_APPLICABLE" | "BREACHED";

export interface AuditArea {
  id: string;
  propertyId: string;
  entityId: string | null;
  areaCategoryId: string;
  categoryName: string;
  areaName: string;
  weight: number;
  isSystemArea: boolean;
  isActive: boolean;
}

export interface InventoryChecklistItem {
  id: string;
  masterId: string;
  name: string;
  expectedQuantity: number;
  requiredThreshold: number;
  criticalThreshold: number;
  photoRequirementType: string;
  weight: number;
}

export interface SuppliesChecklistItem extends InventoryChecklistItem { }

export interface MaintenanceChecklistItem {
  id: string;
  masterId: string;
  name: string;
  photoRequirementType: string;
  weight: number;
}

export type _PropertyBase = Omit<typeof properties.$inferSelect, TimestampKeys> & {
  description: string | null;
  securityDeposit: number;
  longitude: string | null;
  homeRulesTruths: any;
  propertyManagementType: PropertyManagementType | null;
  auditEnabled: boolean;
  maxAuditGapDays: number | null;
  auditComplianceStatus: AuditComplianceStatus | null;
};

export type _PropertyDB = _PropertyBase;

export type Property = _PropertyDB & {
  areaId?: string | null;
  secondaryAreaId1?: string | null;
  secondaryAreaId2?: string | null;
  secondaryAreaId3?: string | null;
  secondaryAreaId4?: string | null;
  area: {
    id: string;
    area: string;
  } | null;
  city: {
    id: string;
    city: string;
  } | null;
  state: {
    id: string;
    state: string;
  } | null;
  amenities?: AmenityData[];
  activities?: ActivityData[];
  galleries?: GalleryData[];
  safetyHygiene?: SafetyHygiene[];
};

/** ProposalBuilder / sortable list shape: property with display fields (id, propertyName, propertyCode, area, city, gallery) */
export type SortableProperty = Pick<Property, "id"> & {
  propertyName?: string;
  propertyCode?: string;
  area?: string;
  city?: string;
  gallery?: Array<{ url?: string }>;
  [key: string]: unknown;
};

export type PropertyFormData = Omit<
  _PropertyBase,
  | "heading"
  | "adminCreatedBy"
  | "adminUpdatedBy"
  | "createdBy"
  | "updatedBy"
  | "isPaid"
  | "isDeleted"
  | "isVerified"
  | "propertyDescription"
  | "isAuditConfigLocked"
  | "id"
> & {
  /**
   * Brand-specific property fields (now stored in `propertiesDataSpecificToBrands`)
   * but still parsed/sent from admin property forms.
   */
  allowCallBooking?: boolean | null;
  allowEnquiry?: boolean | null;
  allowOnlineBooking?: boolean | null;
  bookingType?: string | null;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  bookingPolicy?: string | null;
  requiresConfirmation?: boolean | null;
  advancePaymentEnabled?: boolean | null;
  advancePaymentAmount?: number | null;
  advancePaymentPercentage?: number | null;
  enableFloatingGuests?: boolean | null;
  commissionPercentage?: number | null;
  securityDeposit?: number | null;
  cookingAccessFee?: number | null;
  bonFireFee?: number | null;
  barbequeFee?: number | null;
  cleaningFee?: number | null;
  lateCheckoutCharges?: number | null;
  bedding_availability?: Array<{ id?: string; title: string; description: string; icon?: string; }> | string | null;
  activitiesNearbyAttractions?: string | null;
  experiences?: PropertyBrandContentSection | string | null;
  nearbyAttractions?: PropertyBrandContentSection | string | null;
  foodOptions?: PropertyBrandContentSection | string | null;
  miscCharges?: PropertyBrandContentSection | string | null;
  showOnInstafarms?: boolean | null;
  showOnListing?: boolean | null;
  slug?: string | null;
  faqs?: any;
  meta?: Record<string, any>;
  sections?: any;

  /** Address tab: landmark (may be stored in address_details by API) */
  landmark?: string | null;
  /**
   * Allow extended form payload fields (day-wise pricing, floating guest fields,
   * and other admin-form-only keys) without excess property errors.
   */
  [key: string]: unknown;
};

export type PropertyCreateData = Omit<
  _PropertyBase,
  | "adminCreatedBy"
  | "adminUpdatedBy"
  | "createdBy"
  | "updatedBy"
  | "id"
> & {
  propertyCodeName: string | null;
  allowOnlineBooking: boolean;
  commissionPercentage: number;
  faqs: any[];
  meta: Record<string, any>;

  // Add relationship fields to match PropertyService interface
  amenities?: Array<{ id: string }>;
  activities?: Array<{ id: string }>;
  safetyHygiene?: Array<{ id: string }>;
  specialDates?: Array<{
    id?: string;
    date: string;
    price?: number;
    adultExtraGuestCharge?: number;
    childExtraGuestCharge?: number;
    infantExtraGuestCharge?: number;
    baseGuestCount?: number;
    discount?: number;
  }>;
  owner?: { id: string };
  manager?: { id: string };
  caretaker?: { id: string };
  discountPlan?: { id: string };
  shortTermCancellationPlan?: { id: string };
  longTermCancellationPlan?: { id: string };
  gallery?: Array<{
    id?: string;
    url: string;
    name?: string;
    order?: number;
    altText?: string;
    cover?: number;
    waterMarked?: boolean;
    tag?: string;
  }>;
  bookedDates?: string[];
  spaces?: Array<{
    id: string;
    name: string;
    photo: string;
    title: string;
    description: string;
  }>;
};

// Update PropertyUpdateData to match UpdatePropertyInput interface
export type PropertyUpdateData = Partial<PropertyCreateData>;

export interface PropertyServiceResult {
  id: string;
  propertyName: string | null;
  propertyCode: string | null;
  heading: string | null;
  allowCallBooking: boolean | null;
  allowEnquiry: boolean | null;
  allowOnlineBooking: boolean | null;
  commissionPercentage: number | null;
  securityDeposit: number | null;
  cookingAccessFee?: number | null;
  bonFireFee?: number | null;
  barbequeFee?: number | null;
  cleaningFee?: number | null;
  lateCheckoutCharges?: number | null;

  requiresConfirmation: boolean | null;
  advancePaymentEnabled: boolean | null;
  advancePaymentAmount: number | null;
  advancePaymentPercentage: number | null;

  // Pricing fields
  weekdayPrice: number | null;
  weekdayAdultExtraGuestCharge: number | null;
  weekdayChildExtraGuestCharge: number | null;
  weekdayInfantExtraGuestCharge: number | null;
  weekdayBaseGuestCount: number | null;
  weekdayDiscount: number | null;

  weekendPrice: number | null;
  weekendAdultExtraGuestCharge: number | null;
  weekendChildExtraGuestCharge: number | null;
  weekendInfantExtraGuestCharge: number | null;
  weekendBaseGuestCount: number | null;
  weekendDiscount: number | null;

  // Day-wise pricing
  daywisePrice: boolean | null;
  mondayPrice: number | null;
  mondayAdultExtraGuestCharge: number | null;
  mondayChildExtraGuestCharge: number | null;
  mondayInfantExtraGuestCharge: number | null;
  mondayBaseGuestCount: number | null;
  mondayDiscount: number | null;
  mondayMaxExtraGuestPrice: number | null;
  mondayMaxTotal: number | null;

  tuesdayPrice: number | null;
  tuesdayAdultExtraGuestCharge: number | null;
  tuesdayChildExtraGuestCharge: number | null;
  tuesdayInfantExtraGuestCharge: number | null;
  tuesdayBaseGuestCount: number | null;
  tuesdayDiscount: number | null;
  tuesdayMaxExtraGuestPrice: number | null;
  tuesdayMaxTotal: number | null;

  wednesdayPrice: number | null;
  wednesdayAdultExtraGuestCharge: number | null;
  wednesdayChildExtraGuestCharge: number | null;
  wednesdayInfantExtraGuestCharge: number | null;
  wednesdayBaseGuestCount: number | null;
  wednesdayDiscount: number | null;
  wednesdayMaxExtraGuestPrice: number | null;
  wednesdayMaxTotal: number | null;

  thursdayPrice: number | null;
  thursdayAdultExtraGuestCharge: number | null;
  thursdayChildExtraGuestCharge: number | null;
  thursdayInfantExtraGuestCharge: number | null;
  thursdayBaseGuestCount: number | null;
  thursdayDiscount: number | null;
  thursdayMaxExtraGuestPrice: number | null;
  thursdayMaxTotal: number | null;

  fridayPrice: number | null;
  fridayAdultExtraGuestCharge: number | null;
  fridayChildExtraGuestCharge: number | null;
  fridayInfantExtraGuestCharge: number | null;
  fridayBaseGuestCount: number | null;
  fridayDiscount: number | null;
  fridayMaxExtraGuestPrice: number | null;
  fridayMaxTotal: number | null;

  saturdayPrice: number | null;
  saturdayAdultExtraGuestCharge: number | null;
  saturdayChildExtraGuestCharge: number | null;
  saturdayInfantExtraGuestCharge: number | null;
  saturdayBaseGuestCount: number | null;
  saturdayDiscount: number | null;
  saturdayMaxExtraGuestPrice: number | null;
  saturdayMaxTotal: number | null;

  sundayPrice: number | null;
  sundayAdultExtraGuestCharge: number | null;
  sundayChildExtraGuestCharge: number | null;
  sundayInfantExtraGuestCharge: number | null;
  sundayBaseGuestCount: number | null;
  sundayDiscount: number | null;
  sundayMaxExtraGuestPrice: number | null;
  sundayMaxTotal: number | null;

  // Property details
  bedroomCount: number | null;
  bathroomCount: number | null;
  doubleBedCount: number | null;
  singleBedCount: number | null;
  mattressCount: number | null;
  baseGuestCount: number | null;
  maxGuestCount: number | null;
  bookingType: string | null;
  checkinTime: string | null;
  checkoutTime: string | null;

  // Location
  latitude: string | null;
  longitude: string | null;
  mapLink: string | null;
  address: string | null;
  landmark: string | null;
  areaId: string | null;
  cityId: string | null;
  stateId: string | null;
  pincode: string | null;
  propertyTypeId: string | null;
  slug: string | null;
  showOnInstafarms: boolean | null;
  weight: number | null;
  isDisabled: boolean | null;

  faqs: any;
  meta: Record<string, any>;
  bedding_availability?: Array<{ id?: string; title: string; description: string; icon?: string; }> | string | null;
  activitiesNearbyAttractions?: string | null;
  experiences?: PropertyBrandContentSection | string | null;
  nearbyAttractions?: PropertyBrandContentSection | string | null;
  foodOptions?: PropertyBrandContentSection | string | null;
  miscCharges?: PropertyBrandContentSection | string | null;

  // Additional fields that might be returned by PropertyService
  description?: string | null;
  propertyCodeName?: string | null;
  isPaid?: boolean | null;
  isDeleted?: boolean | null;
  isVerified?: boolean | null;
  propertyDescription?: string | null;
  homeRulesTruths?: any;

  // Audit system fields
  propertyManagementType?: PropertyManagementType | null;
  auditEnabled?: boolean | null;
  maxAuditGapDays?: number | null;
  auditComplianceStatus?: AuditComplianceStatus | null;
}

// Helper type for form data parsing
export interface ParsedRelationshipData {
  amenities: Array<{ id: string; name: string }>;
  activities: Array<{ id: string; name: string }>;
  safetyHygiene: Array<{ id: string }>;
  galleries: GalleryData[];
  owners: Array<{ id: string }>;
  managers: Array<{ id: string }>;
  caretakers: Array<{ id: string }>;
  discountPlans: Array<{ id: string }>;
  cancellationPlans: Array<{ id: string }>;
}

export type _Property = PropertyCreateData & {
  amenities?: AmenityData[];
  activities?: ActivityData[];
};

export type PropertyType = typeof propertyTypes.$inferSelect;

export type State = Omit<_StatesRow, TimestampKeys>;

export type UserRole = (typeof roleOptions)[number];

export type User = Omit<typeof users.$inferSelect, TimestampKeys>;

export type Gender = (typeof genderOptions)[number]; // Now includes "Other"
export type RefundStatus = (typeof refundStatusOptions)[number];
export type CancellationType = (typeof cancellationTypeOptions)[number];
export type BookingType = (typeof bookingTypeOptions)[number];

export type _BookingData = Omit<typeof bookings.$inferSelect, TimestampKeys>;

export type BookingData = _BookingData & {
  property: {
    id: string | null;
    propertyName: string | null;
    propertyCode: string | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
    doubleBedCount: number | null;
    singleBedCount: number | null;
    mattressCount: number | null;
    baseGuestCount: number | null;
    maxGuestCount: number | null;
    checkinTime: string | null;
    checkoutTime: string | null;
  } | null;
  cancellation: _CancellationData | null;
  customer: CustomerData | null;
  bookingCreator: User | null;
  bookingType?: string | null;
  bookingSource?: string | null;
  paymentStatus?: string | null;
  durationNights?: number | string | null;
  adultCount?: number | string | null;
  childrenCount?: number | string | null;
  infantCount?: number | string | null;
  baseRentalAmountWithGst?: number | string | null;
  totalDiscountAmount?: number | string | null;
  bookingAmountPaidWithGst?: number | string | null;
  fullBookingAmountWithGst?: number | string | null;
  remainingAmountToBePaidWithGst?: number | string | null;
  ownerRevenue?: number | string | null;
  bookingRemarks?: string | null;
  specialRequests?: string | null;
  remarks?: string | null;
  notes?: string | null;
};

export type TransactionType = (typeof transactionTypeOptions)[number];
export type PaymentType = (typeof paymentTypeOptions)[number];
export type PaymentMode = (typeof paymentModeOptions)[number];
export type BookingPaymentMethod = (typeof bookingPaymentMethodOptions)[number];
export type BookingPaymentInstrument = (typeof bookingPaymentInstrumentOptions)[number];
export type BookingPaymentFor = (typeof bookingPaymentForOptions)[number];
export type BookingPaymentGateway = (typeof bookingPaymentGatewayOptions)[number];

export interface _PaymentData extends Omit<BankDetail, "id"> {
  id: string;
  bookingId: string;
  transactionType: TransactionType;
  amount: number;
  paymentDate: string;
  referencePersonId: string | null;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  /** Defaults to PLATFORM for legacy records that predate the selector. */
  receiverType?: "PLATFORM" | "OWNER";
  paymentMethod: BookingPaymentMethod;
  paymentInstrument: BookingPaymentInstrument;
  paymentFor: BookingPaymentFor;
  paymentReference: string | null;
  paymentGateway: BookingPaymentGateway | null;
  gatewayFee: number | null;
  gatewayPaymentId: string | null;
}

export interface PaymentData extends _PaymentData {
  referencePerson: User | null;
}

export interface _CancellationData {
  id: string;
  bookingId: string;
  refundAmount: number;
  refundStatus: RefundStatus;
  cancellationType: CancellationType;
  referencePersonId: string | null;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string | null;
  adminUpdatedBy: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CancellationData extends _CancellationData {
  referencePerson: User;
}

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  dob: string | null;
  mobileNumber: string;
  gender: Gender;
  favorites?: unknown[] | null;
}

export interface CustomerBookingListItem {
  id: string;
  bookingId: string | null;
  customerId: string | null;
  bookingExecutionType: string | null;
  status: string | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  adultCount: number | null;
  childrenCount: number | null;
  infantCount: number | null;
  fullBookingAmountWithGst: number | null;
  createdAt: string | null;
  property: {
    id: string | null;
    propertyName: string | null;
    propertyCode: string | null;
  } | null;
  brand?: {
    id: string | null;
    name: string | null;
  } | null;
}

export interface AmenityData {
  id: string;
  name: string;
  weight: number | null;
  isPaid: boolean;
  isUSP: boolean;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
}

export interface ActivityData {
  id: string;
  name: string;
  weight: number | null;
  isPaid: boolean;
  isUSP: boolean;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
}

export interface PropertyTypeData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
}

export interface Owner {
  propertyId: string;
  ownerId: string;
}

export interface Manager {
  propertyId: string;
  managerId: string;
}

export interface Caretaker {
  propertyId: string;
  caretakerId: string;
}

export interface SpecialDateData {
  id: string;
  date: string;
  price: number | null;
  priceWithGST: number | null;
  adultExtraGuestCharge: number | null;
  adultExtraGuestChargeWithGST: number | null;
  childExtraGuestCharge: number | null;
  childExtraGuestChargeWithGST: number | null;
  infantExtraGuestCharge: number | null;
  infantExtraGuestChargeWithGST: number | null;
  floatingAdultExtraGuestCharge: number | null;
  floatingAdultExtraGuestChargeWithGST: number | null;
  floatingChildExtraGuestCharge: number | null;
  floatingChildExtraGuestChargeWithGST: number | null;
  floatingInfantExtraGuestCharge: number | null;
  floatingInfantExtraGuestChargeWithGST: number | null;
  baseGuestCount: number | null;
  discount: number | null;
  maxExtraGuestPrice: number | null;
  maxTotal: number | null;
  gstSlab: number | null;
}

export interface BlockedDate {
  id: string;
  blockedDate: string;
}

export interface BankDetail {
  id: string;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankAccountHolderName: string | null;
  bankIfsc: string | null;
  bankNickname: string | null;
}

export interface DateInfo {
  price: number | null;
  status: DateState;
  blockingSource?: string;
  icalLinkName?: string;
}

export enum DateState {
  IDLE = "IDLE",
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
  HIDDEN = "HIDDEN",
  LOADING = "LOADING",
}

export type NewBookingData = Omit<_BookingData, "customerId"> & {
  customer: CustomerData | null;
  customerId: string | null;
  payments: _PaymentData[];
};

export interface DefaultPricingData {
  mondayPrice?: number | null;
  mondayBaseGuestCount?: number | null;
  mondayAdultExtraGuestCharge?: number | null;
  mondayChildExtraGuestCharge?: number | null;
  mondayInfantExtraGuestCharge?: number | null;
  mondayDiscount?: number | null;
  mondayGSTslab?: number | null;
  mondayMaxExtraGuestPrice?: number | null;
  mondayMaxTotal?: number | null;
  tuesdayPrice?: number | null;
  tuesdayBaseGuestCount?: number | null;
  tuesdayAdultExtraGuestCharge?: number | null;
  tuesdayChildExtraGuestCharge?: number | null;
  tuesdayInfantExtraGuestCharge?: number | null;
  tuesdayDiscount?: number | null;
  tuesdayGSTslab?: number | null;
  tuesdayMaxExtraGuestPrice?: number | null;
  tuesdayMaxTotal?: number | null;
  wednesdayPrice?: number | null;
  wednesdayBaseGuestCount?: number | null;
  wednesdayAdultExtraGuestCharge?: number | null;
  wednesdayChildExtraGuestCharge?: number | null;
  wednesdayInfantExtraGuestCharge?: number | null;
  wednesdayDiscount?: number | null;
  wednesdayGSTslab?: number | null;
  wednesdayMaxExtraGuestPrice?: number | null;
  wednesdayMaxTotal?: number | null;
  thursdayPrice?: number | null;
  thursdayBaseGuestCount?: number | null;
  thursdayAdultExtraGuestCharge?: number | null;
  thursdayChildExtraGuestCharge?: number | null;
  thursdayInfantExtraGuestCharge?: number | null;
  thursdayDiscount?: number | null;
  thursdayGSTslab?: number | null;
  thursdayMaxExtraGuestPrice?: number | null;
  thursdayMaxTotal?: number | null;
  fridayPrice?: number | null;
  fridayBaseGuestCount?: number | null;
  fridayAdultExtraGuestCharge?: number | null;
  fridayChildExtraGuestCharge?: number | null;
  fridayInfantExtraGuestCharge?: number | null;
  fridayDiscount?: number | null;
  fridayGSTslab?: number | null;
  fridayMaxExtraGuestPrice?: number | null;
  fridayMaxTotal?: number | null;
  saturdayPrice?: number | null;
  saturdayBaseGuestCount?: number | null;
  saturdayAdultExtraGuestCharge?: number | null;
  saturdayChildExtraGuestCharge?: number | null;
  saturdayInfantExtraGuestCharge?: number | null;
  saturdayDiscount?: number | null;
  saturdayGSTslab?: number | null;
  saturdayMaxExtraGuestPrice?: number | null;
  saturdayMaxTotal?: number | null;
  sundayPrice?: number | null;
  sundayBaseGuestCount?: number | null;
  sundayAdultExtraGuestCharge?: number | null;
  sundayChildExtraGuestCharge?: number | null;
  sundayInfantExtraGuestCharge?: number | null;
  sundayDiscount?: number | null;
  sundayGSTslab?: number | null;
  sundayMaxExtraGuestPrice?: number | null;
  sundayMaxTotal?: number | null;
  daywisePrice?: string | null;
}

export type PropertyDataWithRole = Property & { role: UserRole };

export type RawAreaData = {
  areas: {
    id: string;
    area: string;
    icon: string | null;
    cityId: string | null;
    stateId: string | null;
    adminCreatedBy: string;
    adminUpdatedBy: string;
    weight: string;
    featured: boolean;
    slug: string | null;
    faqs: any;
    meta: any;
    areaInfo: any;
  };
  cities: {
    id: string;
    city: string;
    cityInfo: any;
  } | null;
  states: {
    id: string;
    state: string;
  } | null;
};

export const transformRawAreaToArea = (rawData: RawAreaData): Area => ({
  id: rawData.areas.id,
  area: rawData.areas.area,
  icon: rawData.areas.icon,
  cityId: rawData.areas.cityId,
  stateId: rawData.areas.stateId,
  adminCreatedBy: rawData.areas.adminCreatedBy,
  adminUpdatedBy: rawData.areas.adminUpdatedBy,
  weight: rawData.areas.weight,
  featured: rawData.areas.featured,
  slug: rawData.areas.slug,
  faqs: rawData.areas.faqs,
  meta: rawData.areas.meta,
  areaInfo: rawData.areas.areaInfo,
  city: rawData.cities ? {
    id: rawData.cities.id,
    city: rawData.cities.city,
  } : null,
  state: rawData.states ? {
    id: rawData.states.id,
    state: rawData.states.state,
  } : null,
});

// Add types for the query results based on field structures
export type CityQueryResult = {
  id: string;
  city: string;
  cityTag: string | null;
  stateId: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
  weight: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  state: {
    id: string;
    state: string;
  } | null;
};

export type AreaQueryResult = {
  areas: {
    id: string;
    area: string;
    cityId: string;
    stateId: string;
    adminCreatedBy: string;
    adminUpdatedBy: string;
    weight: string;
    featured: boolean;
  };
  cities: {
    id: string;
    city: string;
  } | null;
  states: {
    id: string;
    state: string;
  } | null;
};

export type StateFieldSelection = {
  id: string;
  state: string;
};

export type CityFieldSelection = {
  id: string;
  city: string;
  cityTag?: string | null;
  stateId: string;
};

export type AreaFieldSelection = {
  id: string;
  area: string;
  cityId: string | null;
  city: {
    id: string;
    city: string;
  } | null;
  state: {
    id: string;
    state: string;
  } | null;
};

export interface SafetyHygiene {
  id: string;
  name: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
  safetyHygieneId?: string
}

export interface GalleryData {
  id: string;
  photoUrl: string;         // Main display URL (instafarm watermarked if hasWatermark) or video URL
  rawUrl?: string | null;   // Original URL
  listingUrl?: string | null; // watermarkedUrlByMago
  /** Maps to DB originalUrl (rawUrl from upload) */
  originalUrl?: string | null;
  /** Maps to DB thumbnailUrl (coverPhotos) */
  thumbnailUrl?: string | null;
  /** Maps to DB gridUrl (coverPhotos) */
  gridUrl?: string | null;
  /** Maps to DB blurHash (coverPhotos) */
  blurHash?: string | null;
  /** Maps to DB watermarkedUrlByInstafarms (photoUrl from upload) */
  watermarkedUrlByInstafarms?: string | null;
  /** Maps to DB watermarkedUrlByMago */
  watermarkedUrlByMago?: string | null;
  /** Maps to DB watermarkedUrlByAgentPortal */
  watermarkedUrlByAgentPortal?: string | null;
  altText?: string | null;
  /** Maps to DB instafarmsAltText */
  instafarmsAltText?: string | null;
  /** Maps to DB magoAltText */
  magoAltText?: string | null;
  /** Maps to DB agentPortalAltText */
  agentPortalAltText?: string | null;
  caption?: string | null;
  fileName?: string | null;
  /** Maps to DB photos.name */
  name?: string | null;
  /** File size in bytes (for display in KB/MB). */
  fileSize?: number | null;
  /** Image format for display (e.g. JPG, PNG, WEBP). */
  format?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  isFeatured?: boolean | null;
  isCover?: boolean | null;
  sortOrder?: number | null;
  key: string;              // Can be: outdoors, indoors, bed-bath, amenities, cover, videos, etc.
  mediaType?: 'image' | 'video'; // Type of media
  firebasePath?: string;
  rawFirebasePath?: string | null;
  listingFirebasePath?: string | null;
  hasWatermark?: boolean;
  createdAt?: string;
  updatedAt?: string;
  adminCreatedBy?: string | null;
  adminUpdatedBy?: string | null;
  selectedFile?: File;
  previewUrl?: string;
  propertyId?: string;
  propertyName?: string;
}

export interface SafetyHygieneData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  adminCreatedBy: string;
  adminUpdatedBy: string;
  safetyHygieneId?: string
}

export interface Coupon {
  id: string;
  brandId: string;
  name: string;
  code: string;
  discountPercentage: string | null;
  flatDiscount: number | null;
  maxDiscountAmount: number;
  minOrderValue: number;
  newUsersOnly: boolean;
  applicableDays: string[] | null;
  isActive: boolean;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  entityIds?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  adminCreatedBy: string | null;
  adminUpdatedBy: string | null;
  adminCreatedByName?: string | null;
  adminUpdatedByName?: string | null;
}

export type DiscountPlan = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DiscountPlanValue = {
  id: string;
  discountPlanId: string;
  minDays: number;
  discountPercentage: string | null;
  flatDiscount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscountPlanWithValues = DiscountPlan & {
  values: DiscountPlanValue[];
};

export type LastMinuteDiscountPlan = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LastMinuteDiscountPlanValue = {
  id: string;
  lastMinuteDiscountPlanId: string;
  thresholdDays: number;
  discountPercentage: string | null;
  flatDiscount: number | null;
  maxDiscountAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type LastMinuteDiscountPlanWithValues = LastMinuteDiscountPlan & {
  values: LastMinuteDiscountPlanValue[];
  propertyIds?: string[];
};

export type CancellationPlan = {
  id: string;
  name: string;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type CancellationPercentage = {
  id: string;
  cancellationPlanId: string;
  percentage: string;
  refund?: string | number | null;
  days: number;
  lessThan: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type CancellationPlanWithPercentages = CancellationPlan & {
  percentages: CancellationPercentage[];
};

export interface CMS {
  id: string;
  title: string;
  heading: string;
  subHeading?: string | null;
  content: string;
  photo?: string | null;
  isActive?: boolean | null;
  meta?: {
    metaTitle: string;
    metaDescription: string;
    metaUrl: string;
    metaImage: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Carousel {
  id: string;
  heading: string;
  subHeading?: string | null;
  weight?: number | null;
  slug?: string | null;
  property?: string | null;
  desktopBannerUrl?: string | null;
  mobileBannerUrl?: string | null;
  type?: "WEB" | "APP";
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string | null;
  heading?: string | null;
  slug?: string | null;
  weight: number;
  hpc?: number | null;
  logo?: string | null;
  altText?: string | null;
  isActive: boolean;
  meta?: {
    metaTitle?: string;
    metaDescription?: string;
    metaUrl?: string;
    metaImage?: string;
  } | null;
  faqs?: Array<{
    question: string;
    answer: string;
    isActive: boolean;
    weight: number;
  }> | null;
  info?: Array<{
    title: string;
    content: string;
    sectionType?: string;
    isPublished: boolean;
  }> | null;
  entities?: { id: string }[];
  properties?: { id: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionProperty {
  collectionId: string;
  propertyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CancelledBookingQueryResult = BookingData & {
  refundStatus: RefundStatus | null;
  refundAmount: number | null;
  cancellationType: CancellationType | null;
};

export type CancellationFormData = {
  refundAmount: number;
  refundStatus: RefundStatus;
  cancellationType: CancellationType;
  referencePersonId: string | null;
  refundMethodChoice: "RAZORPAY" | "CASH";
};

export type AreaWithLocation = {
  id: string;
  area: string;
  cityId: string | null;
  city: {
    id: string;
    city: string;
  } | null;
  state: {
    id: string;
    state: string;
  } | null;
};

export interface UserCreateData {
  firstName: string | null;
  lastName?: string | null;
  mobileNumber: string | null;
  whatsappNumber?: string | null;
  email: string | null;
}

export interface UserUpdateData {
  firstName?: string | null;
  lastName?: string | null;
  mobileNumber?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
}

export type UserSearchKey = "Name" | "Email" | "Mobile";

// Add this after the Property type definition
export type Entity = Property & {
  // Entity-specific fields
  entityName?: string;
  entityCode?: string;
  entityType?: "STANDALONE" | "CLUBBED" | "SPLIT";
  requiresConfirmation?: boolean;
  advancePaymentEnabled?: boolean;
  advancePaymentAmount?: number;
  advancePaymentPercentage?: number;
  enableRoomWisePricing?: boolean;
  enableFloatingGuests?: boolean;
  totalRoomsAvailable?: number;
  isActive?: boolean;
  showOnListing?: boolean;
  propertyId?: string;
};

// Update SpaceEntity type to match both property and entity usage
export interface SpaceEntityData {
  id: string;
  entityId?: string; // For entities
  propertyId?: string; // For properties
  photo: string | null;
  name: string;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  stateId?: string;
  cityId?: string;
  areaId?: string;
  propertyCode?: string;
  channel?: string;
  // Backward compatibility for older callers. Prefer propertyCode.
  entityCode?: string;
}

export interface TrendChartData {
  date: string;
  bookings: number;
  movingAverage: number;
  isWeekend: boolean;
}

export interface GBVTrendChartData {
  date: string;
  dailyGBV: number;
  movingAverage: number;
  isWeekend: boolean;
}

export interface WeeklyABVData {
  weekStart: string;
  weekEnd: string;
  bookings: number;
  totalGBV: number;
  abv: number | null;
}

export interface DatePreset {
  label: string;
  value: number;
  unit: "days" | "weeks";
}

export interface DashboardStateOption {
  id: string;
  state: string;
}

export interface DashboardCityOption {
  id: string;
  city: string;
  stateId: string;
}
