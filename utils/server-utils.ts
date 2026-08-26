import {
  bookingTypeEnum,
  genderEnum,
} from "@repo/db/schema";
import { DateTime } from "luxon";
import "server-only";
import { v4 } from "uuid";
import {
  _PaymentData,
  _Property,
  Admin,
  cancellationTypeOptions,
  BankDetail,
  CancellationFormData,
  CustomerData,
  Gender,
  paymentModeOptions,
  paymentTypeOptions,
  PropertyFormData,
  PropertyManagementType,
  refundStatusOptions,
  Owner,
  SpecialDateData,
  AuditComplianceStatus,
  transactionTypeOptions,
  User
} from "./types";

export function uniqueStringFilter(data: string[]): string[] {
  const set = new Set<string>();
  const res: string[] = [];
  data.forEach((str) => {
    if (!set.has(str)) {
      set.add(str);
      res.push(str);
    }
  });
  return res;
}

export function parseFilterParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): { searchKey: string; searchValue: string } | null {
  const { searchKey, searchValue } = searchParams;
  if (
    typeof searchKey === "string" &&
    typeof searchValue === "string" &&
    searchKey.length > 0 &&
    searchValue.length > 0
  ) {
    return { searchKey, searchValue };
  }
  return null;
}

export function parseLimitOffset(searchParams: {
  [key: string]: string | string[] | undefined;
}): { limit: number; offset: number } {
  const { page, itemsPerPage } = searchParams;

  let limit = 10;
  let offset = 0;

  if (itemsPerPage) {
    const itemsPerPageNum = Number(itemsPerPage);
    if (!Number.isNaN(itemsPerPageNum)) {
      limit = Math.min(100, itemsPerPageNum);
    }
  }

  if (page) {
    const pageNum = Number(page);
    if (!Number.isNaN(pageNum)) {
      offset = Math.max(0, limit * (pageNum - 1));
    }
  }

  return { limit, offset };
}

export function parseString(str: string | undefined): string | null {
  if (str === undefined || str.length === 0) {
    return null;
  }
  return str;
}

export function parseBoolean(str: string | undefined): boolean {
  if (str?.toLowerCase() === "true") return true;
  return false;
}

export function parseNumber(str: string | undefined): number | null {
  if (str === undefined || str === null) {
    return null;
  }
  // Handle empty strings
  const trimmed = str.trim();
  if (trimmed === "") {
    return null;
  }

  // Remove common problematic characters (backticks, quotes, etc.) that might be accidentally included
  // Keep only digits, decimal points, negative signs, and scientific notation characters
  const sanitized = trimmed.replace(/[`'"]/g, '').trim();

  // If after sanitization it's empty, return null
  if (sanitized === "") {
    return null;
  }

  const num = Number(sanitized);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid Value: "${str}" cannot be converted to a number`);
  }
  return num;
}

export function validateDateStr(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const dt = DateTime.fromSQL(dateStr);
  if (dt.isValid) {
    return dateStr;
  }
  return null;
}

export function validateTimeStr(timeStr: string | undefined): string | null {
  if (!timeStr) return null;
  const time = DateTime.fromSQL(timeStr);
  if (time.isValid) {
    return timeStr;
  }
  return null;
}

export function validatePropertyData(data: _Property): string | null {
  // Checks
  if (!data.propertyName || data.propertyName.length === 0) {
    return "Invalid Property Name.";
  }
  if (data.amenities) {
    const uniqueAmenityTitles = uniqueStringFilter(
      data.amenities.map((x) => x.id),
    );
    if (uniqueAmenityTitles.length !== data.amenities.length) {
      return "Repeated amenities are not allowed.";
    }
  }
  if (data.activities) {
    const uniqueActivityTitles = uniqueStringFilter(
      data.activities.map((x) => x.id),
    );
    if (uniqueActivityTitles.length !== data.activities.length) {
      return "Repeated activities are not allowed.";
    }
  }
  return null;
}

export function parseSpecialDates(formData: FormData): {
  data?: SpecialDateData[];
  error?: string;
} {
  // First, try to parse from JSON string (preferred method)
  const specialDatesJson = formData.get("specialDates")?.toString();
  if (specialDatesJson) {
    try {
      const parsed = JSON.parse(specialDatesJson) as SpecialDateData[];
      // Validate dates are unique
      const seen = new Set<string>();
      for (const sd of parsed) {
        if (seen.has(sd.date)) {
          return { error: "Repeated dates are not allowed." };
        }
        seen.add(sd.date);
      }
      return { data: parsed };
    } catch (error) {
      console.error("Error parsing specialDates JSON:", error);
      // Fall through to individual field parsing
    }
  }

  // Fallback: Parse from individual form fields
  const seen = new Set<string>();

  function isUniqueString(str: string): string | null {
    if (seen.has(str)) {
      return null; // Found a repeated string
    } else {
      seen.add(str);
      return str; // New string
    }
  }

  const res: SpecialDateData[] = [];
  for (const key of formData.keys()) {
    if (key.startsWith("special-date-")) {
      const uuid = key.substring(13);
      const dateStr = formData.get(`special-date-${uuid}`)?.toString();
      if (!dateStr) {
        return { error: "Invalid date." };
      }

      const uniqueString = isUniqueString(dateStr);
      if (!uniqueString) {
        return { error: "Repeated dates are not allowed." };
      }

      const data: SpecialDateData = {
        id: v4(),
        date: dateStr,
        price: parseNumber(formData.get(`special-price-${uuid}`)?.toString()),
        priceWithGST: parseNumber(
          formData.get(`special-priceWithGST-${uuid}`)?.toString(),
        ),
        adultExtraGuestCharge: parseNumber(
          formData.get(`special-adultExtraGuestCharge-${uuid}`)?.toString(),
        ),
        adultExtraGuestChargeWithGST: parseNumber(
          formData.get(`special-adultExtraGuestChargeWithGST-${uuid}`)?.toString(),
        ),
        childExtraGuestCharge: parseNumber(
          formData.get(`special-childExtraGuestCharge-${uuid}`)?.toString(),
        ),
        childExtraGuestChargeWithGST: parseNumber(
          formData.get(`special-childExtraGuestChargeWithGST-${uuid}`)?.toString(),
        ),
        infantExtraGuestCharge: parseNumber(
          formData.get(`special-infantExtraGuestCharge-${uuid}`)?.toString(),
        ),
        infantExtraGuestChargeWithGST: parseNumber(
          formData.get(`special-infantExtraGuestChargeWithGST-${uuid}`)?.toString(),
        ),
        baseGuestCount: parseNumber(
          formData.get(`special-baseGuestCount-${uuid}`)?.toString(),
        ),
        discount: parseNumber(
          formData.get(`special-discount-${uuid}`)?.toString(),
        ),
        maxExtraGuestPrice: parseNumber(
          formData.get(`special-maxExtraGuestPrice-${uuid}`)?.toString(),
        ),
        maxTotal: parseNumber(
          formData.get(`special-maxTotal-${uuid}`)?.toString(),
        ),
        gstSlab: parseNumber(
          formData.get(`special-gstSlab-${uuid}`)?.toString(),
        ),
      };
      res.push(data);
    }
  }
  console.log(JSON.stringify(res));
  return { data: res };
}

export function parseAdminFormData(formData: FormData): Omit<Admin, 'adminCreatedBy' | 'adminUpdatedBy'> {
  const firstName = parseString(formData.get("firstName")?.toString());
  const email = parseString(formData.get("email")?.toString());
  const phoneNumber = parseString(formData.get("phoneNumber")?.toString());

  if (firstName === null) {
    throw new Error("Please enter admin first name.");
  }
  if (email === null) {
    throw new Error("Please enter admin email.");
  }
  if (phoneNumber === null) {
    throw new Error("Please enter admin phone number.");
  }

  return {
    id: v4(),
    firstName,
    lastName: parseString(formData.get("lastName")?.toString()),
    email,
    phoneNumber,

    gender: parseString(formData.get("gender")?.toString()) as Gender | null,
    whatsappNumber: parseString(formData.get("whatsappNumber")?.toString()),
    alternateContact: parseString(formData.get("alternateContact")?.toString()),
    addressDetails: formData.get("addressDetails") ?
      JSON.parse(formData.get("addressDetails")?.toString() || "{}") : {},

    loginAt: parseString(formData.get("loginAt")?.toString()),
    logoutAt: parseString(formData.get("logoutAt")?.toString()),
  };
}

export function parsePropertyFormData(formData: FormData): PropertyFormData {
  const propertyName = parseString(formData.get("propertyName")?.toString());
  const propertyCode = parseString(formData.get("propertyCode")?.toString());

  if (!propertyName) {
    throw new Error("Enter Property name.");
  }
  if (!propertyCode) {
    throw new Error("Enter Property code.");
  }

  const amenitiesIds: string[] = [];
  const activitiesIds: string[] = [];

  for (const key of formData.keys()) {
    if (key.startsWith("amenity-title-")) {
      amenitiesIds.push(key.substring(14));
    } else if (key.startsWith("activity-title-")) {
      activitiesIds.push(key.substring(15));
    }
  }

  // const amenities: AmenityData[] = uniqueStringFilter(amenitiesIds).map(
  //   (id) => {
  //     const title = parseString(
  //       formData.get(`amenity-title-${id}`)?.toString(),
  //     );
  //     const weight = parseNumber(
  //       formData.get(`amenity-weight-${id}`)?.toString(),
  //     );
  //     const isPaid = parseBoolean(
  //       formData.get(`amenity-isPaid-${id}`)?.toString(),
  //     );
  //     const isUSP = parseBoolean(
  //       formData.get(`amenity-isUSP-${id}`)?.toString(),
  //     );
  //     if (!title || title.length === 0) {
  //       throw new Error("Invalid Amenity name.");
  //     }
  //     return { id: v4(), amenity: title, weight, isPaid, isUSP };
  //   },
  // );

  // const activities: ActivityData[] = uniqueStringFilter(activitiesIds).map(
  //   (id) => {
  //     const title = parseString(
  //       formData.get(`activity-title-${id}`)?.toString(),
  //     );
  //     const weight = parseNumber(
  //       formData.get(`activity-weight-${id}`)?.toString(),
  //     );
  //     const isPaid = parseBoolean(
  //       formData.get(`activity-isPaid-${id}`)?.toString(),
  //     );
  //     const isUSP = parseBoolean(
  //       formData.get(`activity-isUSP-${id}`)?.toString(),
  //     );
  //     if (!title || title.length === 0) {
  //       throw new Error("Invalid Activity name.");
  //     }
  //     return { id: v4(), activity: title, weight, isPaid, isUSP };
  //   },
  // );


  return {
    // id: v4(),
    propertyName,
    propertyCode,
    propertyCodeName: parseString(formData.get("propertyCodeName")?.toString()) ?? null,
    description: parseString(formData.get("description")?.toString()) ?? "",
    homeRulesTruths: (() => {
      const raw = formData.get("homeRulesTruths")?.toString() || formData.get("homeRulesAndTruth")?.toString();
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null && "content" in parsed
          ? { content: String(parsed.content ?? "") }
          : { content: String(parsed) };
      } catch {
        return { content: raw };
      }
    })(),

    baseGuestCount: parseNumber(formData.get("baseGuestCount")?.toString()) ?? 0,
    maxGuestCount: parseNumber(formData.get("maxGuestCount")?.toString()) ?? 0,

    mondayPrice: parseNumber(formData.get("mondayPrice")?.toString()) ?? null,
    mondayPriceWithGST: parseNumber(formData.get("mondayPriceWithGST")?.toString()) ?? null,
    mondayAdultExtraGuestCharge: parseNumber(
      formData.get("mondayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    mondayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("mondayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    mondayChildExtraGuestCharge: parseNumber(
      formData.get("mondayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    mondayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("mondayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    mondayInfantExtraGuestCharge: parseNumber(
      formData.get("mondayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    mondayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("mondayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    mondayBaseGuestCount: parseNumber(
      formData.get("mondayBaseGuestCount")?.toString(),
    ) ?? null,
    mondayDiscount: parseNumber(formData.get("mondayDiscount")?.toString()) ?? null,
    mondayGSTslab: parseNumber(formData.get("mondayGSTslab")?.toString()) ?? null,
    mondayMaxExtraGuestPrice: parseNumber(formData.get("mondayMaxExtraGuestPrice")?.toString()) ?? null,
    mondayMaxTotal: parseNumber(formData.get("mondayMaxTotal")?.toString()) ?? null,

    tuesdayPrice: parseNumber(formData.get("tuesdayPrice")?.toString()) ?? null,
    tuesdayPriceWithGST: parseNumber(formData.get("tuesdayPriceWithGST")?.toString()) ?? null,
    tuesdayAdultExtraGuestCharge: parseNumber(
      formData.get("tuesdayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    tuesdayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("tuesdayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    tuesdayChildExtraGuestCharge: parseNumber(
      formData.get("tuesdayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    tuesdayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("tuesdayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    tuesdayInfantExtraGuestCharge: parseNumber(
      formData.get("tuesdayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    tuesdayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("tuesdayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    tuesdayBaseGuestCount: parseNumber(
      formData.get("tuesdayBaseGuestCount")?.toString(),
    ) ?? null,
    tuesdayDiscount: parseNumber(formData.get("tuesdayDiscount")?.toString()) ?? null,
    tuesdayGSTslab: parseNumber(formData.get("tuesdayGSTslab")?.toString()) ?? null,
    tuesdayMaxExtraGuestPrice: parseNumber(formData.get("tuesdayMaxExtraGuestPrice")?.toString()) ?? null,
    tuesdayMaxTotal: parseNumber(formData.get("tuesdayMaxTotal")?.toString()) ?? null,

    wednesdayPrice: parseNumber(formData.get("wednesdayPrice")?.toString()) ?? null,
    wednesdayPriceWithGST: parseNumber(formData.get("wednesdayPriceWithGST")?.toString()) ?? null,
    wednesdayAdultExtraGuestCharge: parseNumber(
      formData.get("wednesdayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    wednesdayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("wednesdayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    wednesdayChildExtraGuestCharge: parseNumber(
      formData.get("wednesdayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    wednesdayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("wednesdayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    wednesdayInfantExtraGuestCharge: parseNumber(
      formData.get("wednesdayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    wednesdayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("wednesdayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    wednesdayBaseGuestCount: parseNumber(
      formData.get("wednesdayBaseGuestCount")?.toString(),
    ) ?? null,
    wednesdayDiscount: parseNumber(
      formData.get("wednesdayDiscount")?.toString(),
    ) ?? null,
    wednesdayGSTslab: parseNumber(formData.get("wednesdayGSTslab")?.toString()) ?? null,
    wednesdayMaxExtraGuestPrice: parseNumber(formData.get("wednesdayMaxExtraGuestPrice")?.toString()) ?? null,
    wednesdayMaxTotal: parseNumber(formData.get("wednesdayMaxTotal")?.toString()) ?? null,

    thursdayPrice: parseNumber(formData.get("thursdayPrice")?.toString()) ?? null,
    thursdayPriceWithGST: parseNumber(formData.get("thursdayPriceWithGST")?.toString()) ?? null,
    thursdayAdultExtraGuestCharge: parseNumber(
      formData.get("thursdayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    thursdayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("thursdayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    thursdayChildExtraGuestCharge: parseNumber(
      formData.get("thursdayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    thursdayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("thursdayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    thursdayInfantExtraGuestCharge: parseNumber(
      formData.get("thursdayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    thursdayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("thursdayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    thursdayBaseGuestCount: parseNumber(
      formData.get("thursdayBaseGuestCount")?.toString(),
    ) ?? null,
    thursdayDiscount: parseNumber(formData.get("thursdayDiscount")?.toString()) ?? null,
    thursdayGSTslab: parseNumber(formData.get("thursdayGSTslab")?.toString()) ?? null,
    thursdayMaxExtraGuestPrice: parseNumber(formData.get("thursdayMaxExtraGuestPrice")?.toString()) ?? null,
    thursdayMaxTotal: parseNumber(formData.get("thursdayMaxTotal")?.toString()) ?? null,

    fridayPrice: parseNumber(formData.get("fridayPrice")?.toString()) ?? null,
    fridayPriceWithGST: parseNumber(formData.get("fridayPriceWithGST")?.toString()) ?? null,
    fridayAdultExtraGuestCharge: parseNumber(
      formData.get("fridayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    fridayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("fridayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    fridayChildExtraGuestCharge: parseNumber(
      formData.get("fridayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    fridayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("fridayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    fridayInfantExtraGuestCharge: parseNumber(
      formData.get("fridayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    fridayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("fridayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    fridayBaseGuestCount: parseNumber(
      formData.get("fridayBaseGuestCount")?.toString(),
    ) ?? null,
    fridayDiscount: parseNumber(formData.get("fridayDiscount")?.toString()) ?? null,
    fridayGSTslab: parseNumber(formData.get("fridayGSTslab")?.toString()) ?? null,
    fridayMaxExtraGuestPrice: parseNumber(formData.get("fridayMaxExtraGuestPrice")?.toString()) ?? null,
    fridayMaxTotal: parseNumber(formData.get("fridayMaxTotal")?.toString()) ?? null,

    saturdayPrice: parseNumber(formData.get("saturdayPrice")?.toString()) ?? null,
    saturdayPriceWithGST: parseNumber(formData.get("saturdayPriceWithGST")?.toString()) ?? null,
    saturdayAdultExtraGuestCharge: parseNumber(
      formData.get("saturdayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    saturdayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("saturdayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    saturdayChildExtraGuestCharge: parseNumber(
      formData.get("saturdayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    saturdayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("saturdayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    saturdayInfantExtraGuestCharge: parseNumber(
      formData.get("saturdayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    saturdayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("saturdayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    saturdayBaseGuestCount: parseNumber(
      formData.get("saturdayBaseGuestCount")?.toString(),
    ) ?? null,
    saturdayDiscount: parseNumber(formData.get("saturdayDiscount")?.toString()) ?? null,
    saturdayGSTslab: parseNumber(formData.get("saturdayGSTslab")?.toString()) ?? null,
    saturdayMaxExtraGuestPrice: parseNumber(formData.get("saturdayMaxExtraGuestPrice")?.toString()) ?? null,
    saturdayMaxTotal: parseNumber(formData.get("saturdayMaxTotal")?.toString()) ?? null,

    sundayPrice: parseNumber(formData.get("sundayPrice")?.toString()) ?? null,
    sundayPriceWithGST: parseNumber(formData.get("sundayPriceWithGST")?.toString()) ?? null,
    sundayAdultExtraGuestCharge: parseNumber(
      formData.get("sundayAdultExtraGuestCharge")?.toString(),
    ) ?? null,
    sundayAdultExtraGuestChargeWithGST: parseNumber(
      formData.get("sundayAdultExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    sundayChildExtraGuestCharge: parseNumber(
      formData.get("sundayChildExtraGuestCharge")?.toString(),
    ) ?? null,
    sundayChildExtraGuestChargeWithGST: parseNumber(
      formData.get("sundayChildExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    sundayInfantExtraGuestCharge: parseNumber(
      formData.get("sundayInfantExtraGuestCharge")?.toString(),
    ) ?? null,
    sundayInfantExtraGuestChargeWithGST: parseNumber(
      formData.get("sundayInfantExtraGuestChargeWithGST")?.toString(),
    ) ?? null,
    sundayBaseGuestCount: parseNumber(
      formData.get("sundayBaseGuestCount")?.toString(),
    ) ?? null,
    sundayDiscount: parseNumber(formData.get("sundayDiscount")?.toString()) ?? null,
    sundayGSTslab: parseNumber(formData.get("sundayGSTslab")?.toString()) ?? null,
    sundayMaxExtraGuestPrice: parseNumber(formData.get("sundayMaxExtraGuestPrice")?.toString()) ?? null,
    sundayMaxTotal: parseNumber(formData.get("sundayMaxTotal")?.toString()) ?? null,

    // Floating guest charges (day-wise)
    mondayFloatingAdultExtraGuestCharge: parseNumber(formData.get("mondayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    mondayFloatingChildExtraGuestCharge: parseNumber(formData.get("mondayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    mondayFloatingInfantExtraGuestCharge: parseNumber(formData.get("mondayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    mondayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("mondayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    mondayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("mondayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    mondayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("mondayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    tuesdayFloatingAdultExtraGuestCharge: parseNumber(formData.get("tuesdayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    tuesdayFloatingChildExtraGuestCharge: parseNumber(formData.get("tuesdayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    tuesdayFloatingInfantExtraGuestCharge: parseNumber(formData.get("tuesdayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    tuesdayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("tuesdayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    tuesdayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("tuesdayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    tuesdayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("tuesdayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    wednesdayFloatingAdultExtraGuestCharge: parseNumber(formData.get("wednesdayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    wednesdayFloatingChildExtraGuestCharge: parseNumber(formData.get("wednesdayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    wednesdayFloatingInfantExtraGuestCharge: parseNumber(formData.get("wednesdayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    wednesdayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("wednesdayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    wednesdayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("wednesdayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    wednesdayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("wednesdayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    thursdayFloatingAdultExtraGuestCharge: parseNumber(formData.get("thursdayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    thursdayFloatingChildExtraGuestCharge: parseNumber(formData.get("thursdayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    thursdayFloatingInfantExtraGuestCharge: parseNumber(formData.get("thursdayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    thursdayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("thursdayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    thursdayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("thursdayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    thursdayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("thursdayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    fridayFloatingAdultExtraGuestCharge: parseNumber(formData.get("fridayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    fridayFloatingChildExtraGuestCharge: parseNumber(formData.get("fridayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    fridayFloatingInfantExtraGuestCharge: parseNumber(formData.get("fridayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    fridayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("fridayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    fridayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("fridayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    fridayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("fridayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    saturdayFloatingAdultExtraGuestCharge: parseNumber(formData.get("saturdayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    saturdayFloatingChildExtraGuestCharge: parseNumber(formData.get("saturdayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    saturdayFloatingInfantExtraGuestCharge: parseNumber(formData.get("saturdayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    saturdayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("saturdayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    saturdayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("saturdayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    saturdayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("saturdayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    sundayFloatingAdultExtraGuestCharge: parseNumber(formData.get("sundayFloatingAdultExtraGuestCharge")?.toString()) ?? null,
    sundayFloatingChildExtraGuestCharge: parseNumber(formData.get("sundayFloatingChildExtraGuestCharge")?.toString()) ?? null,
    sundayFloatingInfantExtraGuestCharge: parseNumber(formData.get("sundayFloatingInfantExtraGuestCharge")?.toString()) ?? null,
    sundayFloatingAdultExtraGuestChargeWithGST: parseNumber(formData.get("sundayFloatingAdultExtraGuestChargeWithGST")?.toString()) ?? null,
    sundayFloatingChildExtraGuestChargeWithGST: parseNumber(formData.get("sundayFloatingChildExtraGuestChargeWithGST")?.toString()) ?? null,
    sundayFloatingInfantExtraGuestChargeWithGST: parseNumber(formData.get("sundayFloatingInfantExtraGuestChargeWithGST")?.toString()) ?? null,

    isDisabled: parseBoolean(formData.get("isDisabled")?.toString()) ?? null,

    bedroomCount: parseNumber(formData.get("bedroomCount")?.toString()) ?? 0,
    bathroomCount: parseNumber(formData.get("bathroomCount")?.toString()) ?? 0,
    doubleBedCount: parseNumber(formData.get("doubleBedCount")?.toString()) ?? 0,
    singleBedCount: parseNumber(formData.get("singleBedCount")?.toString()) ?? 0,
    mattressCount: parseNumber(formData.get("mattressCount")?.toString()) ?? 0,

    bookingType: parseString(formData.get("bookingType")?.toString()) ?? null,
    checkinTime: validateTimeStr(formData.get("checkinTime")?.toString()) ?? null,
    checkoutTime: validateTimeStr(formData.get("checkoutTime")?.toString()) ?? null,

    latitude: parseString(formData.get("latitude")?.toString()) ?? null,
    longitude: parseString(formData.get("longitude")?.toString()) ?? null,
    mapLink: parseString(formData.get("mapLink")?.toString()) ?? null,
    // Accept empty string as null to allow clearing
    googlePlaceId: (() => {
      const v = formData.get("googlePlaceId")?.toString();
      return v && v.trim().length > 0 ? v : null;
    })(),
    googlePlaceRating: (() => {
      const v = formData.get("googlePlaceRating")?.toString();
      return v && v.trim().length > 0 ? v : null;
    })(),
    googlePlaceUserRatingCount: (() => {
      const v = formData.get("googlePlaceUserRatingCount")?.toString();
      if (!v || v.trim().length === 0) return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error("Invalid Google user rating count");
      return n;
    })(),
    nearbyPlaces: (() => {
      const raw = formData.get("nearbyPlaces")?.toString();
      if (!raw || raw.trim().length === 0) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    googlePlaceReviews: (() => {
      const raw = formData.get("googlePlaceReviews")?.toString();
      if (!raw || raw.trim().length === 0) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),

    address: parseString(formData.get("address")?.toString()) ?? null,
    landmark: parseString(formData.get("landmark")?.toString()) ?? null,
    village: parseString(formData.get("village")?.toString()) ?? null,
    areaId: parseString(formData.get("areaId")?.toString()) ?? null,
    secondaryAreaId1: parseString(formData.get("secondaryAreaId1")?.toString()) ?? null,
    secondaryAreaId2: parseString(formData.get("secondaryAreaId2")?.toString()) ?? null,
    secondaryAreaId3: parseString(formData.get("secondaryAreaId3")?.toString()) ?? null,
    secondaryAreaId4: parseString(formData.get("secondaryAreaId4")?.toString()) ?? null,
    cityId: parseString(formData.get("cityId")?.toString()) ?? null,
    stateId: parseString(formData.get("stateId")?.toString()) ?? null,
    pincode: parseString(formData.get("pincode")?.toString()) ?? null,

    propertyTypeId: parseString(formData.get("propertyTypeId")?.toString()) ?? null,
    // activities: activities,
    // amenities: amenities,

    allowEnquiry: parseBoolean(formData.get("allowEnquiry")?.toString()) ?? false,
    allowOnlineBooking: parseBoolean(formData.get("allowOnlineBooking")?.toString()) ?? false,
    allowCallBooking: parseBoolean(formData.get("allowCallBooking")?.toString()) ?? false,
    commissionPercentage: parseNumber(formData.get("commissionPercentage")?.toString()) ?? 0,
    securityDeposit: parseNumber(formData.get("securityDeposit")?.toString()) ?? 0,
    cookingAccessFee: parseNumber(formData.get("cookingAccessFee")?.toString()) ?? 0,
    weight: parseString(formData.get("weight")?.toString()) ?? "0",

    requiresConfirmation: parseBoolean(formData.get("requiresConfirmation")?.toString()),
    advancePaymentEnabled: parseBoolean(formData.get("advancePaymentEnabled")?.toString()),
    advancePaymentAmount: parseNumber(formData.get("advancePaymentAmount")?.toString()) ?? null,
    advancePaymentPercentage: parseNumber(formData.get("advancePaymentPercentage")?.toString()) ?? null,

    enableFloatingGuests: parseBoolean(formData.get("enableFloatingGuests")?.toString()),

    slug: parseString(formData.get("slug")?.toString()) ?? null,
    showOnInstafarms: parseBoolean(formData.get("showOnInstafarms")?.toString()) ?? true,
    isPresentOnMago: parseBoolean(formData.get("isPresentOnMago")?.toString()) ?? false,
    bookingPolicy: parseString(formData.get("bookingPolicy")?.toString()) ?? "",
    faqs: [], // Add default value
    meta: {}, // Add default value - must be object (Record<string, any>), not array
    sections: null,

    // Audit system fields
    propertyManagementType:
      (parseString(
        formData.get("propertyManagementType")?.toString(),
      ) as PropertyManagementType | null) ?? null,
    auditEnabled: parseBoolean(formData.get("auditEnabled")?.toString()),
    maxAuditGapDays: parseNumber(formData.get("maxAuditGapDays")?.toString()) ?? null,
    auditComplianceStatus:
      (parseString(
        formData.get("auditComplianceStatus")?.toString(),
      ) as AuditComplianceStatus | null) ?? null,
  };
}

export function parseUserFormData(formData: FormData): Omit<User, 'adminCreatedBy' | 'adminUpdatedBy' | 'createdBy' | 'updatedBy' | 'isDisabled' | 'isPaid' | 'role'> {
  const firstName = parseString(formData.get("firstName")?.toString());
  const email = parseString(formData.get("email")?.toString());
  const mobileNumber = parseString(formData.get("mobileNumber")?.toString());

  if (!firstName) {
    throw new Error("Name missing.");
  }
  if (!email) {
    throw new Error("Email missing.");
  }
  if (!mobileNumber) {
    throw new Error("Mobile Number missing.");
  }

  const settlementTimingRaw = parseString(
    formData.get("settlementTiming")?.toString(),
  );
  const settlementTiming: User["settlementTiming"] =
    settlementTimingRaw === "checkin" || settlementTimingRaw === "checkout"
      ? settlementTimingRaw
      : "checkout";
  const settlementTime =
    parseString(formData.get("settlementTime")?.toString()) ?? "22:00:00";
  const settlementEnabledRaw = formData.get("settlementEnabled")?.toString();
  const settlementEnabled =
    settlementEnabledRaw === undefined
      ? true
      : parseBoolean(settlementEnabledRaw);

  return {
    id: v4(),
    firstName,
    lastName: parseString(formData.get("lastName")?.toString()),
    mobileNumber,
    whatsappNumber: parseString(formData.get("whatsappNumber")?.toString()),
    email: email.toLowerCase(),
    gender: (() => {
      const genderValue = parseString(formData.get("gender")?.toString());
      return (genderValue === "Male" || genderValue === "Female") ? genderValue : null;
    })(),
    alternateContact: parseString(formData.get("alternateContact")?.toString()),
    bankAccounts: [],
    addressDetails: parseString(formData.get("addressDetails")?.toString()) ?? null,
    settlementTiming,
    settlementTime,
    settlementEnabled,
  };
}

export function parseCancellationFormData(
  formData: FormData,
): CancellationFormData {
  const refundAmount = parseNumber(formData.get("refundAmount")?.toString());
  const refundStatus = refundStatusOptions.find(
    (x) => x === formData.get("refundStatus")?.toString(),
  );
  const cancellationType = cancellationTypeOptions.find(
    (x) => x === formData.get("cancellationType")?.toString(),
  );
  const referencePersonId = parseString(
    formData.get("cancellationReferencePersonId")?.toString(),
  );
  const refundMethodChoiceRaw = parseString(
    formData.get("refundMethodChoice")?.toString(),
  );
  const refundMethodChoice =
    refundMethodChoiceRaw === "RAZORPAY" || refundMethodChoiceRaw === "CASH"
      ? refundMethodChoiceRaw
      : null;

  if (refundAmount === null) {
    throw new Error("Invalid Refund Amount");
  }
  if (!refundStatus) {
    throw new Error("Invalid Refund Status");
  }
  if (!cancellationType) {
    throw new Error("Invalid Cancellation type.");
  }
  if (!refundMethodChoice) {
    throw new Error("Invalid refund method choice.");
  }
  // referencePersonId is now optional for simplified cancel flow

  return {
    refundAmount,
    refundStatus,
    cancellationType,
    referencePersonId: referencePersonId || null,
    refundMethodChoice,
  };
}

export function parsePaymentFormData(
  formData: FormData,
): Omit<_PaymentData, "bookingId">[] {
  const ids: string[] = [];
  for (const key of formData.keys()) {
    if (key.startsWith("payment-amount-")) {
      ids.push(key.substring(15));
    }
  }

  const data = ids.map((id) => {
    const amount = parseNumber(
      formData.get(`payment-amount-${id}`)?.toString(),
    );
    const paymentDate = parseString(formData.get(`payment-${id}`)?.toString());
    const paymentMethodRaw = parseString(formData.get(`payment-paymentMethod-${id}`)?.toString());
    const paymentInstrumentRaw = parseString(formData.get(`payment-paymentInstrument-${id}`)?.toString());
    const paymentForRaw = parseString(formData.get(`payment-paymentFor-${id}`)?.toString());
    const receiverTypeRaw = parseString(formData.get(`payment-receiverType-${id}`)?.toString());
    const paymentReference = parseString(formData.get(`payment-paymentReference-${id}`)?.toString());
    const paymentGateway = parseString(formData.get(`payment-paymentGateway-${id}`)?.toString());
    const gatewayPaymentId = parseString(formData.get(`payment-gatewayPaymentId-${id}`)?.toString());
    const gatewayFee = parseNumber(formData.get(`payment-gatewayFee-${id}`)?.toString()) ?? 0;
    if (amount === null) {
      throw new Error("Invalid Amount.");
    }
    if (!paymentDate || !DateTime.fromSQL(paymentDate).isValid) {
      throw new Error("Invalid payment date.");
    }
    if (!paymentMethodRaw) {
      throw new Error("Select payment method.");
    }
    if (!paymentInstrumentRaw) {
      throw new Error("Select payment instrument.");
    }
    if (!paymentForRaw) {
      throw new Error("Select payment for.");
    }
    if (receiverTypeRaw && receiverTypeRaw !== "PLATFORM" && receiverTypeRaw !== "OWNER") {
      throw new Error("Select who collected the payment.");
    }

    const transactionType = "Credit";
    const paymentMode = paymentMethodRaw === "CASH" ? "Cash" : "Online";
    const paymentType = paymentForRaw === "ADJUSTMENT" ? "Security Deposit" : "Rent";

    return {
      id,
      paymentDate,
      transactionType: transactionType,
      amount,
      referencePersonId: null,
      paymentType,
      paymentMode,
      receiverType: receiverTypeRaw === "OWNER" ? "OWNER" : "PLATFORM",
      paymentMethod: paymentMethodRaw as _PaymentData["paymentMethod"],
      paymentInstrument: paymentInstrumentRaw as _PaymentData["paymentInstrument"],
      paymentFor: paymentForRaw as _PaymentData["paymentFor"],
      paymentReference,
      paymentGateway: (paymentGateway || null) as _PaymentData["paymentGateway"],
      gatewayFee,
      gatewayPaymentId,
      bankName: parseString(formData.get(`bankName-${id}`)?.toString()),
      bankAccountHolderName: parseString(
        formData.get(`bankAccountHolderName-${id}`)?.toString(),
      ),
      bankAccountNumber: parseString(
        formData.get(`bankAccountNumber-${id}`)?.toString(),
      ),
      bankIfsc: parseString(formData.get(`bankIfsc-${id}`)?.toString()),
      bankNickname: parseString(formData.get(`bankNickname-${id}`)?.toString()),
    };
  });

  return data as Omit<_PaymentData, "bookingId">[];
}

export function parseBankFormData(formData: FormData): BankDetail[] {
  const ids: string[] = [];
  for (const key of formData.keys()) {
    if (key.startsWith("bankName-")) {
      ids.push(key.substring(9));
    }
  }
  return ids.map((id) => ({
    id,
    bankName: parseString(formData.get(`bankName-${id}`)?.toString()),
    bankAccountHolderName: parseString(
      formData.get(`bankAccountHolderName-${id}`)?.toString(),
    ),
    bankAccountNumber: parseString(
      formData.get(`bankAccountNumber-${id}`)?.toString(),
    ),
    bankIfsc: parseString(formData.get(`bankIfsc-${id}`)?.toString()),
    bankNickname: parseString(formData.get(`bankNickname-${id}`)?.toString()),
  }));
}

export function parseBookingFormData(formData: FormData) {
  const getNumberFromAny = (...keys: string[]) => {
    for (const key of keys) {
      const rawValue = formData.get(key)?.toString();
      if (rawValue === undefined) {
        continue;
      }
      const parsedValue = parseNumber(rawValue);
      if (parsedValue !== null && parsedValue !== undefined) {
        return parsedValue;
      }
    }
    return null;
  };

  const propertyId = parseString(formData.get("propertyId")?.toString());
  const bookingTypeStr = parseString(formData.get("bookingType")?.toString());
  const bookingType = bookingTypeStr
    ? bookingTypeEnum.enumValues.find((x) => x === bookingTypeStr)
    : undefined;
  const customerId = parseString(formData.get("customerId")?.toString());
  const adultCount = parseNumber(formData.get("adultCount")?.toString());
  const childrenCount = parseNumber(formData.get("childrenCount")?.toString());
  const infantCount = parseNumber(formData.get("infantCount")?.toString());
  const checkinDate = validateDateStr(formData.get("checkinDate")?.toString());
  const checkoutDate = validateDateStr(
    formData.get("checkoutDate")?.toString(),
  );

  // Validations
  // Note: bookingType is optional for updates (when form might not include it)
  // Only validate if a bookingType value was provided but is invalid
  if (bookingTypeStr && !bookingType) {
    throw new Error(`Invalid Booking type: "${bookingTypeStr}". Must be one of: ${bookingTypeEnum.enumValues.join(", ")}`);
  }
  // customerId is optional - admin can create bookings without selecting a customer
  // For updates, these fields might be optional (only validate if provided)
  // For creates, they are required
  // We'll validate only if values are provided but invalid
  if (adultCount !== null && adultCount !== undefined && adultCount < 0) {
    throw new Error("Adult count cannot be negative");
  }
  if (childrenCount !== null && childrenCount !== undefined && childrenCount < 0) {
    throw new Error("Enter number of children (must be 0 or greater)");
  }
  if (infantCount !== null && infantCount !== undefined && infantCount < 0) {
    throw new Error("Enter number of infants (must be 0 or greater)");
  }
  // Dates are optional for updates (might be disabled/read-only)
  // Only validate if provided but invalid
  if (checkinDate === null && formData.get("checkinDate")?.toString()) {
    throw new Error("Invalid checkin date");
  }
  if (checkoutDate === null && formData.get("checkoutDate")?.toString()) {
    throw new Error("Invalid checkout date");
  }
  // Only validate date range if both dates are provided
  if (checkinDate && checkoutDate) {
    const checkinDt = DateTime.fromSQL(checkinDate);
    const checkoutDt = DateTime.fromSQL(checkoutDate);
    if (checkoutDt.diff(checkinDt, "days").days < 1) {
      throw new Error("Check out date should be later than check in date");
    }
  }

  // Parse daywiseBreakup JSON if provided
  let daywiseBreakup = null;
  const daywiseBreakupStr = formData.get("daywiseBreakup")?.toString();
  if (daywiseBreakupStr) {
    try {
      daywiseBreakup = JSON.parse(daywiseBreakupStr);
    } catch (e) {
      console.error("Error parsing daywiseBreakup:", e);
    }
  }

  // Build return object - use defaults for required fields when not provided (for updates)
  return {
    id: v4(),
    // Use a default value if bookingType is not provided (for updates)
    bookingType: (bookingType || "Offline") as "Online" | "Offline",
    propertyId: propertyId || "",
    entityId: parseString(formData.get("entityId")?.toString()) ?? null,
    customerId: customerId?.trim() || null,
    bookingSource: parseString(formData.get("bookingSource")?.toString()),
    // Use defaults for counts if not provided (for updates)
    adultCount: adultCount ?? 0,
    childrenCount: childrenCount ?? 0,
    infantCount: infantCount ?? 0,
    floatingAdultCount: parseNumber(formData.get("floatingAdultCount")?.toString()) ?? 0,
    floatingChildCount: parseNumber(formData.get("floatingChildCount")?.toString()) ?? 0,
    floatingInfantCount: parseNumber(formData.get("floatingInfantCount")?.toString()) ?? 0,
    // Use empty string if dates not provided (for updates)
    checkinDate: (checkinDate || "") as string,
    checkoutDate: (checkoutDate || "") as string,
    durationNights: parseNumber(formData.get("durationNights")?.toString()) ?? null,
    bookingRemarks: parseString(formData.get("bookingRemarks")?.toString()),
    specialRequests: parseString(formData.get("specialRequests")?.toString()),
    pdfBookingLink: parseString(formData.get("pdfBookingLink")?.toString()),

    // Commercial data
    rentalCharge: getNumberFromAny("rentalCharge", "baseRentalAmountWithGst") ?? 0,
    baseRentalAmountWithGst: getNumberFromAny("rentalCharge", "baseRentalAmountWithGst") ?? 0,
    extraGuestCharge: getNumberFromAny(
      "extraGuestCharge",
      "extraAdultGuestChargeWithGst"
    ) ?? 0,
    extraAdultGuestChargeWithGst: getNumberFromAny("extraAdultGuestChargeWithGst") ?? 0,
    extraChildGuestChargeWithGst: parseNumber(formData.get("extraChildGuestChargeWithGst")?.toString()) ?? 0,
    floatingGuestCharge: getNumberFromAny("floatingGuestCharge") ?? 0,
    bookingAmountWithGstBeforeDiscounts: getNumberFromAny("bookingAmountWithGstBeforeDiscounts") ?? 0,
    totalDiscountAmount: getNumberFromAny("totalDiscount", "totalDiscountAmount") ?? 0,
    totalDiscountPercentage: parseNumber(formData.get("totalDiscountPercentage")?.toString()) ?? null,

    // Payment details
    isAdvancePayment: parseBoolean(formData.get("isAdvancePayment")?.toString()) ?? false,
    bookingAmountPaidWithGst: parseNumber(formData.get("bookingAmountPaidWithGst")?.toString()) ?? null,
    fullBookingAmountWithGst: parseNumber(formData.get("fullBookingAmountWithGst")?.toString()) ?? null,
    remainingAmountToBePaidWithGst: parseNumber(formData.get("remainingAmountToBePaidWithGst")?.toString()) ?? null,
    paymentGatewayCharge: getNumberFromAny("paymentGatewayCharge") ?? 0,
    daywiseBreakup,

    // All Discounts
    ownerDiscount: getNumberFromAny("ownerDiscount", "ownerDiscountValue"),
    ownerDiscountValue: getNumberFromAny("ownerDiscount", "ownerDiscountValue"),
    ownerDiscountPercentage: parseNumber(formData.get("ownerDiscountPercentage")?.toString()) ?? null,
    multipleNightsDiscount: getNumberFromAny("multipleNightsDiscount", "multipleNightsDiscountValue"),
    multipleNightsDiscountValue: getNumberFromAny("multipleNightsDiscount", "multipleNightsDiscountValue"),
    multipleNightsDiscountPercentage: parseNumber(formData.get("multipleNightsDiscountPercentage")?.toString()) ?? null,
    lastMinuteDiscount: getNumberFromAny("lastMinuteDiscount", "lastMinuteDiscountValue"),
    lastMinuteDiscountValue: getNumberFromAny("lastMinuteDiscount", "lastMinuteDiscountValue"),
    lastMinuteDiscountPercentage: parseNumber(formData.get("lastMinuteDiscountPercentage")?.toString()) ?? null,
    lastMinuteDiscountThresholdDays: parseNumber(formData.get("lastMinuteDiscountThresholdDays")?.toString()) ?? null,
    couponDiscount: getNumberFromAny("couponDiscount", "couponDiscountValue"),
    couponDiscountValue: getNumberFromAny("couponDiscount", "couponDiscountValue"),
    couponDiscountType: parseString(formData.get("couponDiscountType")?.toString()),
    couponDiscountCode: parseString(formData.get("couponDiscountCode")?.toString()),
    couponId: parseString(formData.get("couponId")?.toString()),

    // Amount Distribution
    gstAmount: getNumberFromAny("gstAmount", "totalGstCollected"),
    totalDiscount: getNumberFromAny("totalDiscount", "totalDiscountAmount"),
    otaCommission: getNumberFromAny("otaCommission", "instafarmsCommission"),
    netOwnerRevenue: getNumberFromAny("netOwnerRevenue", "ownerRevenue"),
    instafarmsCommission: getNumberFromAny("otaCommission", "instafarmsCommission"),
    ownerRevenue: getNumberFromAny("netOwnerRevenue", "ownerRevenue"),
    tds: parseNumber(formData.get("tds")?.toString()) ?? null,
    totalGstCollected: getNumberFromAny("gstAmount", "totalGstCollected"),
    amountPayableToOwnerAfterTDS: getNumberFromAny("amountPayableToOwnerAfterTDS"),
    bookingAmountWithDiscountBeforeGst: getNumberFromAny("bookingAmountWithDiscountBeforeGst") ?? null,

    status: parseString(formData.get("status")?.toString()) ?? "pending",
    // Add missing fields with defaults (for type compatibility)
    ownerSettlementStatus: parseString(formData.get("ownerSettlementStatus")?.toString()) ?? null,
    ownerSettledAt: parseString(formData.get("ownerSettledAt")?.toString()) ?? null,
    settlementBlocked: parseBoolean(formData.get("settlementBlocked")?.toString()) ?? false,
    settlementBlockedBy: parseString(formData.get("settlementBlockedBy")?.toString()) ?? null,
    settlementBlockedReason: parseString(formData.get("settlementBlockedReason")?.toString()) ?? null,
    settlementBlockedAt: parseString(formData.get("settlementBlockedAt")?.toString()) ?? null,
    settlementUnblockedAt: parseString(formData.get("settlementUnblockedAt")?.toString()) ?? null,
    settlementUnblockedBy: parseString(formData.get("settlementUnblockedBy")?.toString()) ?? null,
    settlementUnblockedReason: parseString(formData.get("settlementUnblockedReason")?.toString()) ?? null,
    settlementNotes: parseString(formData.get("settlementNotes")?.toString()) ?? null,
    settlementAmount: parseNumber(formData.get("settlementAmount")?.toString()) ?? null,
    settlementTransactionId: parseString(formData.get("settlementTransactionId")?.toString()) ?? null,
    settlementPaymentDate: parseString(formData.get("settlementPaymentDate")?.toString()) ?? null,
    settlementPaymentMode: parseString(formData.get("settlementPaymentMode")?.toString()) ?? null,
  };
}

export function parseCustomerFormData(formData: FormData): CustomerData {
  const firstName = parseString(formData.get("firstName")?.toString());
  const mobileNumber = parseString(formData.get("mobileNumber")?.toString());
  const dob = parseString(formData.get("dob")?.toString());
  const gender = genderEnum.enumValues.find(
    (x) => x === parseString(formData.get("gender")?.toString()),
  );
  let email = parseString(formData.get("email")?.toString());

  if (!firstName) {
    throw new Error("Name missing.");
  }
  if (!gender) {
    throw new Error("Gender missing.");
  }
  if (!mobileNumber) {
    throw new Error("Mobile Number missing.");
  }
  if (email) {
    email = email.toLowerCase();
  }

  return {
    id: v4(),
    firstName,
    lastName: parseString(formData.get("lastName")?.toString()),
    mobileNumber,
    dob: dob || null,
    email,
    gender,
  };
}

export function parseOwnerFormData(formData: FormData): Owner {
  const propertyId = parseString(formData.get("propertyId")?.toString());
  const ownerId = parseString(formData.get("ownerId")?.toString());

  if (!propertyId || propertyId.length === 0) {
    throw new Error("Invalid Property.");
  }
  if (!ownerId || ownerId.length == 0) {
    throw new Error("Invalid User.");
  }

  return { propertyId, ownerId };
}
