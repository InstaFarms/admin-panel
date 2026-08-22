/**
 * Local stand-in for `@repo/db/schema`, redirected via tsconfig `paths`.
 *
 * Table stand-ins (activities, amenities, bookings, properties, propertyTypes,
 * users, timestamps) are consumed elsewhere only via `typeof X.$inferSelect`
 * in type position - nothing here is ever executed at runtime, so a loosely
 * typed stand-in is sufficient and keeps `Omit<X.$inferSelect, TimestampKeys>`
 * resolving the same way it did against the real drizzle tables.
 *
 * locationSchema/locationNewSchema and bookingTypeEnum/genderEnum ARE read at
 * runtime (locationValidation.ts, constants/locations.ts, server-utils.ts) so
 * those are real values, copied from packages/db/src/schema/location.ts,
 * packages/db/src/schema/property.ts, and packages/db/src/schema/shared.ts.
 */

type InferSelectStub = { $inferSelect: Record<string, any> };

export const activities = {} as InferSelectStub;
export const amenities = {} as InferSelectStub;
export const bookings = {} as InferSelectStub;
export const properties = {} as InferSelectStub;
export const propertyTypes = {} as InferSelectStub;
export const users = {} as InferSelectStub;

export const timestamps = {
  createdAt: undefined as unknown,
  updatedAt: undefined as unknown,
};

const locationMarketTypeOptions = [
  "urban",
  "leisure",
  "nearby_escape",
  "business",
  "pilgrimage",
  "mixed",
] as const;

const locationDisplayModeOptions = [
  "area_first",
  "listing_first",
  "mixed",
] as const;

const locationRoleOptions = [
  "state",
  "city",
  "destination",
  "region",
  "area",
  "locality",
] as const;

const allowedLocationRoleCombinations = [
  ["state"],
  ["state", "destination"],
  ["city"],
  ["city", "destination"],
  ["region"],
  ["region", "destination"],
  ["area"],
  ["area", "destination"],
  ["area", "locality"],
  ["locality"],
  ["locality", "destination"],
] as const;

const locationSchemaValues = {
  locationMarketTypeOptions,
  locationDisplayModeOptions,
  locationRoleOptions,
  allowedLocationRoleCombinations,
};

// The real @repo/db/schema re-exports both names (`locationSchema`,
// `locationNewSchema`) as `export * as X` from the same module.
export const locationSchema = locationSchemaValues;
export const locationNewSchema = locationSchemaValues;

export const bookingTypeEnum = { enumValues: ["Online", "Offline"] as const };
export const genderEnum = { enumValues: ["Male", "Female", "Other"] as const };
