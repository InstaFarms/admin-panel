export const DEFAULT_VISIBLE_FAQ_COUNT = 6;

export const DEFAULT_FAQ_CATEGORIES = [
  "General",
  "Booking",
  "Amenities",
  "Policies",
  "Location",
  "Others",
] as const;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  weight: number;
};

export type FaqDraft = {
  category: string;
  question: string;
  answer: string;
};

export type JoditConfig = Record<string, unknown>;

export type FaqUpdate = Partial<Pick<FaqItem, "question" | "answer" | "category" | "weight">>;
