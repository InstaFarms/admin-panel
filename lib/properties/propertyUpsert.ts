export type RelationWriteMode = "replace" | "unchanged";

export interface PropertyRelationIntent {
  amenities?: RelationWriteMode;
  activities?: RelationWriteMode;
  safetyHygiene?: RelationWriteMode;
  specialDates?: RelationWriteMode;
  owners?: RelationWriteMode;
  managers?: RelationWriteMode;
  caretakers?: RelationWriteMode;
  supervisors?: RelationWriteMode;
  plans?: RelationWriteMode;
  spaces?: RelationWriteMode;
  gallery?: RelationWriteMode;
}

export interface PropertyUpsertPayload {
  relationIntent?: PropertyRelationIntent;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface PropertyUpsertResultData {
  propertyId: string;
  propertyUpdatedAt?: string | null;
}

export const DEFAULT_PROPERTY_RELATION_INTENT: PropertyRelationIntent = {
  amenities: "replace",
  activities: "replace",
  safetyHygiene: "replace",
  specialDates: "replace",
  owners: "replace",
  managers: "replace",
  caretakers: "replace",
  supervisors: "replace",
  plans: "replace",
  spaces: "replace",
  gallery: "replace",
};
