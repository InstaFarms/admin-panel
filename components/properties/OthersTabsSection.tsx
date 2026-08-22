"use client";

import { Button, TabItem, Tabs, TextInput, Textarea } from "flowbite-react";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";

import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";
import AddFaqComposer from "@/components/properties/others/AddFaqComposer";
import FaqCard from "@/components/properties/others/FaqCard";
import FaqControlBar from "@/components/properties/others/FaqControlBar";
import RichTextPanel from "@/components/properties/others/RichTextPanel";
import {
  DEFAULT_FAQ_CATEGORIES,
  DEFAULT_VISIBLE_FAQ_COUNT,
  type FaqDraft,
  type FaqItem,
  type FaqUpdate,
  type JoditConfig,
} from "@/components/properties/others/types";

interface BeddingAvailabilityDraftItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface ContentSectionDraftItem {
  id: string;
  label: string;
  description: string;
  amount: string;
}

interface ContentSectionDraft {
  title: string;
  subtitle: string;
  items: ContentSectionDraftItem[];
}

const BEDDING_ICON_OPTIONS = [
  { value: "bed", label: "Bed" },
  { value: "living", label: "Living" },
  { value: "mattress", label: "Mattress" },
  { value: "bath", label: "Bath" },
  { value: "occupancy", label: "Occupancy" },
] as const;

const createEmptyBeddingAvailabilityItem = (): BeddingAvailabilityDraftItem => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `bedding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  description: "",
  icon: "bed",
});

const createDraftId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyContentSectionItem = (): ContentSectionDraftItem => ({
  id: createDraftId("section-item"),
  label: "",
  description: "",
  amount: "",
});

const createEmptyContentSectionDraft = (): ContentSectionDraft => ({
  title: "",
  subtitle: "",
  items: [],
});

const isBeddingItemComplete = (item: BeddingAvailabilityDraftItem) =>
  Boolean(item.title.trim() && item.description.trim() && item.icon.trim());

const getStructuredItemMissingFields = ({
  item,
  supportsDescription,
  supportsAmount,
  requiresDescription,
  requiresAmount,
}: {
  item: ContentSectionDraftItem;
  supportsDescription: boolean;
  supportsAmount: boolean;
  requiresDescription: boolean;
  requiresAmount: boolean;
}) => {
  const missingFields: string[] = [];
  if (!item.label.trim()) missingFields.push("label");
  if (supportsDescription && requiresDescription && !item.description.trim()) {
    missingFields.push("description");
  }
  if (supportsAmount && requiresAmount && !item.amount.trim()) {
    missingFields.push("amount");
  }
  return missingFields;
};

const isStructuredItemComplete = ({
  item,
  supportsDescription,
  supportsAmount,
  requiresDescription,
  requiresAmount,
}: {
  item: ContentSectionDraftItem;
  supportsDescription: boolean;
  supportsAmount: boolean;
  requiresDescription: boolean;
  requiresAmount: boolean;
}) =>
  getStructuredItemMissingFields({
    item,
    supportsDescription,
    supportsAmount,
    requiresDescription,
    requiresAmount,
  }).length === 0;

const normalizeBeddingArray = (value: unknown): BeddingAvailabilityDraftItem[] => {
  const arr = Array.isArray(value) ? value : [];
  return arr.map((item, index) => ({
      id:
        typeof item?.id === "string" && item.id.trim()
          ? item.id.trim()
          : `bedding-${index + 1}`,
      title: typeof item?.title === "string" ? item.title : "",
      description: typeof item?.description === "string" ? item.description : "",
      icon: typeof item?.icon === "string" && item.icon.trim() ? item.icon.trim() : "bed",
    }));
};

const normalizeContentSectionInput = (value: unknown): ContentSectionDraft => {
  if (!value) return createEmptyContentSectionDraft();

  // If it's a JSON string, parse it first
  let obj: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return createEmptyContentSectionDraft();
    try { obj = JSON.parse(trimmed); } catch { return createEmptyContentSectionDraft(); }
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return createEmptyContentSectionDraft();
  const parsed = obj as Record<string, unknown>;

  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    subtitle: typeof parsed.subtitle === "string" ? parsed.subtitle : "",
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item, index) => ({
          id:
            typeof item?.id === "string" && item.id.trim()
              ? item.id.trim()
              : `section-item-${index + 1}`,
          label: typeof item?.label === "string" ? item.label : "",
          description: typeof item?.description === "string" ? item.description : "",
          amount: item?.amount == null || item?.amount === "" ? "" : String(item.amount),
        }))
      : [],
  };
};

interface OthersTabsSectionProps {
  descriptionText: string;
  setDescriptionText: (value: string) => void;
  bedding_availability: BeddingAvailabilityDraftItem[];
  setBedding_availability: (value: BeddingAvailabilityDraftItem[]) => void;
  experiences: unknown;
  setExperiences: (value: ContentSectionDraft) => void;
  nearbyAttractions: unknown;
  setNearbyAttractions: (value: ContentSectionDraft) => void;
  foodOptions: unknown;
  setFoodOptions: (value: ContentSectionDraft) => void;
  miscCharges: unknown;
  setMiscCharges: (value: ContentSectionDraft) => void;
  homeRulesText: string;
  setHomeRulesText: (value: string) => void;
  bookingPolicy: string;
  setBookingPolicy: (value: string) => void;
  faqs: FaqItem[];
  selectedFaqCategory: string;
  setSelectedFaqCategory: (category: string) => void;
  draggedFaqIndex: number | null;
  dragOverFaqIndex: number | null;
  addFaq: (initialData?: Partial<FaqDraft>) => void;
  removeFaq: (id: string) => void;
  updateFaq: (id: string, updates: FaqUpdate) => void;
  handleFaqDragStart: (index: number) => void;
  handleFaqDragOver: (index: number) => void;
  handleFaqDragLeave: () => void;
  handleFaqDrop: (index: number) => void;
  handleFaqDragEnd: () => void;
  handleFaqCsvUpload: (e: ChangeEvent<HTMLInputElement>, replaceExisting: boolean) => void;
  handleFaqCsvExport: () => void;
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaUrl: string;
  setMetaUrl: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  metaKeyword: string;
  setMetaKeyword: (value: string) => void;
  joditConfig: JoditConfig;
}

export default function OthersTabsSection(props: OthersTabsSectionProps) {
  const {
    descriptionText,
    setDescriptionText,
    bedding_availability,
    setBedding_availability,
    experiences,
    setExperiences,
    nearbyAttractions,
    setNearbyAttractions,
    foodOptions,
    setFoodOptions,
    miscCharges,
    setMiscCharges,
    homeRulesText,
    setHomeRulesText,
    bookingPolicy,
    setBookingPolicy,
    faqs,
    selectedFaqCategory,
    setSelectedFaqCategory,
    draggedFaqIndex,
    dragOverFaqIndex,
    addFaq,
    removeFaq,
    updateFaq,
    handleFaqDragStart,
    handleFaqDragOver,
    handleFaqDragLeave,
    handleFaqDrop,
    handleFaqDragEnd,
    handleFaqCsvUpload,
    handleFaqCsvExport,
    metaTitle,
    setMetaTitle,
    metaUrl,
    setMetaUrl,
    metaDescription,
    setMetaDescription,
    metaKeyword,
    setMetaKeyword,
    joditConfig,
  } = props;

  const [faqSearchQuery, setFaqSearchQuery] = useState("");
  const [visibleFaqCount, setVisibleFaqCount] = useState(DEFAULT_VISIBLE_FAQ_COUNT);
  const [expandedFaqMap, setExpandedFaqMap] = useState<Record<string, boolean>>({});
  const [showAddFaqDialog, setShowAddFaqDialog] = useState(false);
  const [newFaqDraft, setNewFaqDraft] = useState<FaqDraft>({
    category: "",
    question: "",
    answer: "",
  });
  const [activeStayDetailsTab, setActiveStayDetailsTab] = useState<
    "bedding" | "experiences" | "nearby" | "food" | "charges"
  >("bedding");
  const faqListRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef(0);
  const [beddingItems, setBeddingItems] = useState<BeddingAvailabilityDraftItem[]>(
    () => normalizeBeddingArray(bedding_availability),
  );
  const [experiencesDraft, setExperiencesDraft] = useState<ContentSectionDraft>(
    () => normalizeContentSectionInput(experiences),
  );
  const [nearbyAttractionsDraft, setNearbyAttractionsDraft] = useState<ContentSectionDraft>(
    () => normalizeContentSectionInput(nearbyAttractions),
  );
  const [foodOptionsDraft, setFoodOptionsDraft] = useState<ContentSectionDraft>(
    () => normalizeContentSectionInput(foodOptions),
  );
  const [miscChargesDraft, setMiscChargesDraft] = useState<ContentSectionDraft>(
    () => normalizeContentSectionInput(miscCharges),
  );

  useEffect(() => {
    setBeddingItems(normalizeBeddingArray(bedding_availability));
  }, [bedding_availability]);

  useEffect(() => {
    setExperiencesDraft(normalizeContentSectionInput(experiences));
  }, [experiences]);

  useEffect(() => {
    setNearbyAttractionsDraft(normalizeContentSectionInput(nearbyAttractions));
  }, [nearbyAttractions]);

  useEffect(() => {
    setFoodOptionsDraft(normalizeContentSectionInput(foodOptions));
  }, [foodOptions]);

  useEffect(() => {
    setMiscChargesDraft(normalizeContentSectionInput(miscCharges));
  }, [miscCharges]);

  const faqCategories = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_FAQ_CATEGORIES,
          ...faqs
            .map((faq) => (typeof faq?.category === "string" ? faq.category.trim() : ""))
            .filter((category) => category.length > 0),
        ]),
      ),
    [faqs],
  );

  const indexedFaqs = useMemo(
    () => faqs.map((faq, globalIndex) => ({ faq, globalIndex })),
    [faqs],
  );

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = faqSearchQuery.trim().toLowerCase();
    return indexedFaqs.filter(({ faq }) => {
      const matchesCategory = !selectedFaqCategory || faq.category === selectedFaqCategory;
      const question = String(faq?.question || "").toLowerCase();
      const answer = String(faq?.answer || "").toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        question.includes(normalizedSearch) ||
        answer.includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [indexedFaqs, selectedFaqCategory, faqSearchQuery]);

  const visibleFaqs = filteredFaqs.slice(0, visibleFaqCount);
  const hasMoreFaqs = filteredFaqs.length > visibleFaqCount;
  const serializedExperiences = JSON.stringify(experiencesDraft);
  const serializedNearbyAttractions = JSON.stringify(nearbyAttractionsDraft);
  const serializedFoodOptions = JSON.stringify(foodOptionsDraft);
  const serializedMiscCharges = JSON.stringify(miscChargesDraft);
  const serializedBeddingAvailability = JSON.stringify(beddingItems);
  const serializedFaqs = JSON.stringify(faqs);
  const serializedMeta = JSON.stringify({
    metaTitle,
    metaUrl,
    metaDescription,
    metaKeyword,
  });

  useEffect(() => {
    setVisibleFaqCount(DEFAULT_VISIBLE_FAQ_COUNT);
  }, [faqSearchQuery, selectedFaqCategory]);

  const getFaqKey = (faqId: string | undefined, globalIndex: number) =>
    faqId ?? `faq-${globalIndex}`;

  const resetNewFaqDraft = () => {
    setNewFaqDraft({ category: "", question: "", answer: "" });
  };

  const openAddFaqDialog = () => {
    setShowAddFaqDialog(true);
    setNewFaqDraft({
      category: selectedFaqCategory && selectedFaqCategory !== "all" ? selectedFaqCategory : "",
      question: "",
      answer: "",
    });
  };

  const closeAddFaqDialog = () => {
    setShowAddFaqDialog(false);
    resetNewFaqDraft();
  };

  const submitAddFaqDialog = () => {
    const question = newFaqDraft.question.trim();
    const answer = newFaqDraft.answer.trim();
    if (!question || !answer) return;

    addFaq({
      category: newFaqDraft.category.trim(),
      question,
      answer,
    });
    closeAddFaqDialog();
  };

  const clearFaqFilters = () => {
    setSelectedFaqCategory("");
    setFaqSearchQuery("");
  };

  const toggleFaqExpand = (faqKey: string) => {
    setExpandedFaqMap((prev) => ({ ...prev, [faqKey]: !prev[faqKey] }));
  };

  const stopAutoScroll = () => {
    autoScrollSpeedRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const startAutoScrollIfNeeded = () => {
    if (autoScrollRafRef.current !== null) return;
    const tick = () => {
      if (autoScrollSpeedRef.current === 0) {
        autoScrollRafRef.current = null;
        return;
      }
      window.scrollBy({ top: autoScrollSpeedRef.current, behavior: "auto" });
      autoScrollRafRef.current = requestAnimationFrame(tick);
    };
    autoScrollRafRef.current = requestAnimationFrame(tick);
  };

  const handleFaqListDragOverCapture = (e: DragEvent<HTMLDivElement>) => {
    if (draggedFaqIndex === null) {
      stopAutoScroll();
      return;
    }

    const topThreshold = 120;
    const bottomThreshold = 140;
    const maxSpeed = 18;
    const y = e.clientY;
    const viewportHeight = window.innerHeight;

    let nextSpeed = 0;
    if (y < topThreshold) {
      const intensity = (topThreshold - y) / topThreshold;
      nextSpeed = -Math.max(4, Math.round(maxSpeed * intensity));
    } else if (y > viewportHeight - bottomThreshold) {
      const intensity = (y - (viewportHeight - bottomThreshold)) / bottomThreshold;
      nextSpeed = Math.max(4, Math.round(maxSpeed * intensity));
    }

    autoScrollSpeedRef.current = nextSpeed;
    if (nextSpeed === 0) {
      stopAutoScroll();
      return;
    }

    startAutoScrollIfNeeded();
  };

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, []);

  useEffect(() => {
    if (draggedFaqIndex === null) {
      stopAutoScroll();
    }
  }, [draggedFaqIndex]);

  const syncBeddingItems = (updater: (prev: BeddingAvailabilityDraftItem[]) => BeddingAvailabilityDraftItem[]) => {
    const next = updater(beddingItems);
    setBeddingItems(next);
    setBedding_availability(next);
  };

  const syncContentSectionDraft = (
    current: ContentSectionDraft,
    setDraft: (value: ContentSectionDraft) => void,
    setValue: (value: ContentSectionDraft) => void,
    updater: (prev: ContentSectionDraft) => ContentSectionDraft,
  ) => {
    const next = updater(current);
    setDraft(next);
    setValue(next);
  };

  const renderStructuredSectionEditor = ({
    title,
    description,
    draft,
    setDraft,
    setValue,
    supportsSubtitle = false,
    supportsAmount = false,
    supportsDescription = true,
    requiresDescription = supportsDescription,
    requiresAmount = supportsAmount,
    itemDescriptionLabel = "Description",
  }: {
    title: string;
    description: string;
    draft: ContentSectionDraft;
    setDraft: (value: ContentSectionDraft) => void;
    setValue: (value: ContentSectionDraft) => void;
    supportsSubtitle?: boolean;
    supportsAmount?: boolean;
    supportsDescription?: boolean;
    requiresDescription?: boolean;
    requiresAmount?: boolean;
    itemDescriptionLabel?: string;
  }) => (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <SectionHeading title={title} description={description} />

      <div className="space-y-4">
        <LabelWrapper label="Section Title">
          <TextInput
            value={draft.title}
            onChange={(event) =>
              syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                ...prev,
                title: event.target.value,
              }))
            }
            placeholder={title}
            className="dark:[&_input]:border-gray-700 dark:[&_input]:bg-gray-800 dark:[&_input]:text-gray-100"
          />
        </LabelWrapper>

        {supportsSubtitle ? (
          <LabelWrapper label="Subtitle">
            <Textarea
              value={draft.subtitle}
              onChange={(event) =>
                syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                  ...prev,
                  subtitle: event.target.value,
                }))
              }
              placeholder="Optional supporting text"
              rows={3}
              className="text-base leading-6 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </LabelWrapper>
        ) : null}
      </div>

      <div className="space-y-4">
        {draft.items.length > 0 ? (
          draft.items.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 dark:bg-gray-900/60 ${
                isStructuredItemComplete({
                  item,
                  supportsDescription,
                  supportsAmount,
                  requiresDescription,
                  requiresAmount,
                })
                  ? "border-slate-200 bg-slate-50 dark:border-gray-700"
                  : "border-rose-300 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/20"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                  Item {index + 1}
                </p>
                <Button
                  color="light"
                  size="xs"
                  onClick={() =>
                    syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                      ...prev,
                      items: prev.items.filter((current) => current.id !== item.id),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>

              <div className={`grid gap-4 ${supportsAmount ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                <LabelWrapper label="Label">
                  <TextInput
                    required
                    value={item.label}
                    onChange={(event) =>
                      syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                        ...prev,
                        items: prev.items.map((current) =>
                          current.id === item.id
                            ? { ...current, label: event.target.value }
                            : current,
                        ),
                      }))
                    }
                    placeholder="Label"
                    className="dark:[&_input]:border-gray-700 dark:[&_input]:bg-gray-800 dark:[&_input]:text-gray-100"
                  />
                </LabelWrapper>

                {supportsDescription ? (
                  <LabelWrapper label={itemDescriptionLabel}>
                    <TextInput
                      required={requiresDescription}
                      value={item.description}
                      onChange={(event) =>
                        syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                          ...prev,
                          items: prev.items.map((current) =>
                            current.id === item.id
                              ? { ...current, description: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      placeholder={itemDescriptionLabel}
                      className="dark:[&_input]:border-gray-700 dark:[&_input]:bg-gray-800 dark:[&_input]:text-gray-100"
                    />
                  </LabelWrapper>
                ) : null}

                {supportsAmount ? (
                  <LabelWrapper label="Amount">
                    <TextInput
                      type="number"
                      required={requiresAmount}
                      value={item.amount}
                      onChange={(event) =>
                        syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
                          ...prev,
                          items: prev.items.map((current) =>
                            current.id === item.id
                              ? { ...current, amount: event.target.value }
                              : current,
                          ),
                        }))
                      }
                      placeholder="500"
                      className="dark:[&_input]:border-gray-700 dark:[&_input]:bg-gray-800 dark:[&_input]:text-gray-100"
                    />
                  </LabelWrapper>
                ) : null}
              </div>

              {!isStructuredItemComplete({
                item,
                supportsDescription,
                supportsAmount,
                requiresDescription,
                requiresAmount,
              }) ? (
                <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">
                  Complete all required fields:{" "}
                  {getStructuredItemMissingFields({
                    item,
                    supportsDescription,
                    supportsAmount,
                    requiresDescription,
                    requiresAmount,
                  }).join(", ")}.
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            No items added yet.
          </div>
        )}

        <Button
          color="blue"
          onClick={() =>
            syncContentSectionDraft(draft, setDraft, setValue, (prev) => ({
              ...prev,
              items: [...prev.items, createEmptyContentSectionItem()],
            }))
          }
        >
          Add Item
        </Button>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
        <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-gray-100">
          View Raw JSON
        </summary>
        <div className="mt-4">
          <LabelWrapper label={`${title} JSON`}>
            <Textarea
              value={JSON.stringify(draft, null, 2)}
              readOnly
              rows={10}
              className="font-mono text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </LabelWrapper>
        </div>
      </details>
    </div>
  );

  return (
    <Tabs variant="underline">
      <TabItem title="Summary">
        <RichTextPanel
          title="Summary"
          description="Main long-form property overview shown to users."
          label="Summary"
          value={descriptionText}
          onChange={setDescriptionText}
          hiddenName="description"
          hiddenValue={descriptionText}
          joditConfig={joditConfig}
        />
      </TabItem>

      <TabItem title="Stay Details">
        <div className="space-y-6">
          <input type="hidden" name="bedding_availability" value={serializedBeddingAvailability} />
          <input type="hidden" name="experiences" value={serializedExperiences} />
          <input type="hidden" name="nearbyAttractions" value={serializedNearbyAttractions} />
          <input type="hidden" name="foodOptions" value={serializedFoodOptions} />
          <input type="hidden" name="miscCharges" value={serializedMiscCharges} />
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900/50">
            {[
              { id: "bedding", label: "Bedding Availability" },
              { id: "experiences", label: "Experiences" },
              { id: "nearby", label: "Nearby Attractions" },
              { id: "food", label: "Food Options" },
              { id: "charges", label: "Misc Charges" },
            ].map((tab) => {
              const isActive = activeStayDetailsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveStayDetailsTab(
                      tab.id as "bedding" | "experiences" | "nearby" | "food" | "charges",
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeStayDetailsTab === "bedding" ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <SectionHeading
                title="Bedding Availability"
                description="Manage the bedding cards shown on the public page with a structured editor. Changes are still saved as the same JSON array in the background."
              />

              <div className="space-y-4">
                {beddingItems.length > 0 ? (
                  beddingItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 dark:bg-gray-900/60 ${
                        isBeddingItemComplete(item)
                          ? "border-slate-200 bg-slate-50 dark:border-gray-700"
                          : "border-rose-300 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/20"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                          Card {index + 1}
                        </p>
                        <Button
                          color="light"
                          size="xs"
                          onClick={() =>
                            syncBeddingItems((prev) => prev.filter((current) => current.id !== item.id))
                          }
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <LabelWrapper label="Title">
                          <TextInput
                            required
                            value={item.title}
                            onChange={(event) =>
                              syncBeddingItems((prev) =>
                                prev.map((current) =>
                                  current.id === item.id
                                    ? { ...current, title: event.target.value }
                                    : current,
                                ),
                              )
                            }
                            placeholder="2 Bedrooms"
                            className="dark:[&_input]:border-gray-700 dark:[&_input]:bg-gray-800 dark:[&_input]:text-gray-100"
                          />
                        </LabelWrapper>

                        <LabelWrapper label="Icon">
                          <select
                            required
                            value={item.icon}
                            onChange={(event) =>
                              syncBeddingItems((prev) =>
                                prev.map((current) =>
                                  current.id === item.id
                                    ? { ...current, icon: event.target.value }
                                    : current,
                                ),
                              )
                            }
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-cyan-500 focus:ring-cyan-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                          >
                            {BEDDING_ICON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </LabelWrapper>
                      </div>

                      <div className="mt-4">
                        <LabelWrapper label="Description">
                          <Textarea
                            required
                            value={item.description}
                            onChange={(event) =>
                              syncBeddingItems((prev) =>
                                prev.map((current) =>
                                  current.id === item.id
                                    ? { ...current, description: event.target.value }
                                    : current,
                                ),
                              )
                            }
                            rows={3}
                            placeholder="2 king beds with attached washrooms"
                            className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                          />
                        </LabelWrapper>
                      </div>

                      {!isBeddingItemComplete(item) ? (
                        <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">
                          Complete all three fields: title, icon, and description.
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                    No bedding cards added yet.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    color="blue"
                    onClick={() =>
                      syncBeddingItems((prev) => [...prev, createEmptyBeddingAvailabilityItem()])
                    }
                  >
                    Add Bedding Card
                  </Button>
                </div>

                <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-gray-100">
                    View Raw JSON
                  </summary>
                  <div className="mt-4">
                    <LabelWrapper label="Bedding Availability JSON">
                      <Textarea
                        value={JSON.stringify(beddingItems, null, 2)}
                        readOnly
                        rows={10}
                        className="font-mono text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                      />
                    </LabelWrapper>
                  </div>
                </details>
              </div>
            </div>
          ) : null}

          {activeStayDetailsTab === "experiences"
            ? renderStructuredSectionEditor({
                title: "Experiences",
                description:
                  "Manage the Experiences at Property section with title, subtitle, and repeatable list items.",
                draft: experiencesDraft,
                setDraft: setExperiencesDraft,
                setValue: setExperiences,
                supportsDescription: false,
              })
            : null}

          {activeStayDetailsTab === "nearby"
            ? renderStructuredSectionEditor({
                title: "Nearby Attractions",
                description:
                  "Manage nearby attractions with optional title/subtitle and item-level distance or supporting text.",
                draft: nearbyAttractionsDraft,
                setDraft: setNearbyAttractionsDraft,
                setValue: setNearbyAttractions,
                itemDescriptionLabel: "Distance / Description",
              })
            : null}

          {activeStayDetailsTab === "food"
            ? renderStructuredSectionEditor({
                title: "Food Options",
                description:
                  "Manage the Food & Dining section. Use subtitle for the descriptive paragraph and items for the checklist.",
                draft: foodOptionsDraft,
                setDraft: setFoodOptionsDraft,
                setValue: setFoodOptions,
                supportsSubtitle: true,
                supportsDescription: false,
              })
            : null}

          {activeStayDetailsTab === "charges"
            ? renderStructuredSectionEditor({
                title: "Misc Charges",
                description:
                  "Manage the Charges section with item labels, optional notes, and numeric amounts where needed.",
                draft: miscChargesDraft,
                setDraft: setMiscChargesDraft,
                setValue: setMiscCharges,
                supportsAmount: true,
                requiresDescription: false,
                requiresAmount: false,
                itemDescriptionLabel: "Note / Description",
              })
            : null}
        </div>
      </TabItem>

      <TabItem title="Home Rules and Truth">
        <RichTextPanel
          title="Home Rules and Truth"
          description="Rules, expectations, and transparency details for guests."
          label="Home Rules and Truth"
          value={homeRulesText}
          onChange={setHomeRulesText}
          hiddenName="homeRulesAndTruth"
          hiddenValue={JSON.stringify({ content: homeRulesText })}
          joditConfig={joditConfig}
        />
      </TabItem>

      <TabItem title="Booking and Cancellation Policy">
        <RichTextPanel
          title="Booking and Cancellation Policy"
          description="Policy text used during booking and cancellation flows."
          label="Booking and Cancellation Policy"
          value={bookingPolicy}
          onChange={setBookingPolicy}
          hiddenName="bookingPolicy"
          hiddenValue={bookingPolicy}
          joditConfig={joditConfig}
        />
      </TabItem>

      <TabItem title="FAQs">
        <div className="space-y-4">
          <input type="hidden" name="faqs" value={serializedFaqs} />
          <SectionHeading
            title="FAQs"
            description="Manage frequently asked questions with categories and drag-to-reorder."
          />

          <FaqControlBar
            faqs={faqs}
            filteredFaqCount={filteredFaqs.length}
            selectedFaqCategory={selectedFaqCategory}
            setSelectedFaqCategory={setSelectedFaqCategory}
            faqSearchQuery={faqSearchQuery}
            setFaqSearchQuery={setFaqSearchQuery}
            faqCategories={faqCategories}
            onAddFaqClick={openAddFaqDialog}
            onClearFilters={clearFaqFilters}
            handleFaqCsvUpload={handleFaqCsvUpload}
            handleFaqCsvExport={handleFaqCsvExport}
          />

          <AddFaqComposer
            isOpen={showAddFaqDialog}
            draft={newFaqDraft}
            faqCategories={faqCategories}
            onChange={setNewFaqDraft}
            onClose={closeAddFaqDialog}
            onSubmit={submitAddFaqDialog}
          />

          {faqs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No FAQs added yet</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add one manually or upload FAQs via CSV.
              </p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              No FAQs match current filters.
            </div>
          ) : (
            <div
              ref={faqListRef}
              className="space-y-3"
              onDragOverCapture={handleFaqListDragOverCapture}
              onDropCapture={stopAutoScroll}
              onDragEndCapture={stopAutoScroll}
              onDragLeaveCapture={(e) => {
                const nextTarget = e.relatedTarget as Node | null;
                if (!nextTarget || !faqListRef.current?.contains(nextTarget)) {
                  stopAutoScroll();
                }
              }}
            >
              {visibleFaqs.map(({ faq, globalIndex }, visibleIndex) => {
                const faqKey = getFaqKey(faq.id, globalIndex);
                const isExpanded = expandedFaqMap[faqKey] ?? false;

                return (
                  <FaqCard
                    key={faqKey}
                    faq={faq}
                    faqIndexLabel={visibleIndex + 1}
                    faqCategories={faqCategories}
                    isExpanded={isExpanded}
                    isDragged={draggedFaqIndex === globalIndex}
                    isDragOver={dragOverFaqIndex === globalIndex}
                    onToggleExpand={() => toggleFaqExpand(faqKey)}
                    onRemove={() => {
                      if (!faq.id) return;
                      if (window.confirm("Remove this FAQ?")) {
                        removeFaq(faq.id);
                      }
                    }}
                    onUpdate={(updates) => updateFaq(faq.id, updates)}
                    onDragStart={() => handleFaqDragStart(globalIndex)}
                    onDragOver={() => handleFaqDragOver(globalIndex)}
                    onDragLeave={handleFaqDragLeave}
                    onDrop={() => handleFaqDrop(globalIndex)}
                    onDragEnd={handleFaqDragEnd}
                  />
                );
              })}
            </div>
          )}

          {filteredFaqs.length > DEFAULT_VISIBLE_FAQ_COUNT ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              {hasMoreFaqs ? (
                <Button
                  type="button"
                  color="gray"
                  onClick={() =>
                    setVisibleFaqCount((prev) =>
                      Math.min(prev + DEFAULT_VISIBLE_FAQ_COUNT, filteredFaqs.length),
                    )
                  }
                >
                  See More ({Math.max(filteredFaqs.length - visibleFaqCount, 0)} remaining)
                </Button>
              ) : (
                <Button
                  type="button"
                  color="gray"
                  onClick={() => setVisibleFaqCount(DEFAULT_VISIBLE_FAQ_COUNT)}
                >
                  Show Less
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </TabItem>

      <TabItem title="Metadata">
        <div className="space-y-4">
          <input type="hidden" name="meta" value={serializedMeta} />
          <SectionHeading
            title="Metadata"
            description="Search metadata fields used for SEO and indexing."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LabelWrapper label="Meta Title">
              <TextInput
                name="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Enter meta title"
              />
            </LabelWrapper>

            <LabelWrapper label="Meta URL">
              <TextInput
                name="metaUrl"
                value={metaUrl}
                onChange={(e) => setMetaUrl(e.target.value)}
                placeholder="Enter meta URL"
              />
            </LabelWrapper>

            <div className="md:col-span-2">
              <LabelWrapper label="Meta Description">
                <Textarea
                  name="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Enter meta description"
                  rows={4}
                />
              </LabelWrapper>
            </div>

            <div className="md:col-span-2">
              <LabelWrapper label="Meta Keywords">
                <Textarea
                  name="metaKeyword"
                  value={metaKeyword}
                  onChange={(e) => setMetaKeyword(e.target.value)}
                  placeholder="Enter meta keywords (comma separated)"
                  rows={3}
                />
              </LabelWrapper>
            </div>
          </div>
        </div>
      </TabItem>
    </Tabs>
  );
}
