"use client";

import OthersTabsSection from "@/components/properties/OthersTabsSection";
import type { FaqItem, FaqUpdate } from "@/components/properties/others/types";
import { usePropertyRichTextConfig } from "@/components/properties/usePropertyRichTextConfig";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import type { SectionChange } from "./types";


interface OthersTabContainerProps {
  sectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
  othersBrandSlug: BrandSlug;
}

export default function OthersTabContainer({
  sectionData,
  onSectionChange,
  othersBrandSlug,
}: OthersTabContainerProps) {
  const joditConfig = usePropertyRichTextConfig();
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("");
  const [draggedFaqIndex, setDraggedFaqIndex] = useState<number | null>(null);
  const [dragOverFaqIndex, setDragOverFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    console.log("Admin Stay Details sectionData:", {
      brand: othersBrandSlug,
      bedding_availability: sectionData.bedding_availability,
      activitiesNearbyAttractions: sectionData.activitiesNearbyAttractions,
      experiences: sectionData.experiences,
      nearbyAttractions: sectionData.nearbyAttractions,
      foodOptions: sectionData.foodOptions,
      miscCharges: sectionData.miscCharges,
      fullSectionData: sectionData,
    });
  }, [
    othersBrandSlug,
    sectionData,
  ]);

  const updateFaqArray = (updater: (prev: FaqItem[]) => FaqItem[]) =>
    onSectionChange(
      `${othersBrandSlug}.others.faqs`,
      (prev: FaqItem[] | undefined) => updater(Array.isArray(prev) ? prev : []),
    );

  return (
    <div className="mx-auto max-w-275">
      <OthersTabsSection
        descriptionText={(sectionData.descriptionText as string) || ""}
        setDescriptionText={(value) => onSectionChange(`${othersBrandSlug}.others.descriptionText`, value)}
        bedding_availability={Array.isArray(sectionData.bedding_availability) ? sectionData.bedding_availability as any[] : []}
        setBedding_availability={(value) =>
          onSectionChange(`${othersBrandSlug}.others.bedding_availability`, value)
        }
        experiences={sectionData.experiences ?? sectionData.activitiesNearbyAttractions ?? null}
        setExperiences={(value) =>
          onSectionChange(`${othersBrandSlug}.others.experiences`, value)
        }
        nearbyAttractions={sectionData.nearbyAttractions ?? sectionData.activitiesNearbyAttractions ?? null}
        setNearbyAttractions={(value) =>
          onSectionChange(`${othersBrandSlug}.others.nearbyAttractions`, value)
        }
        foodOptions={sectionData.foodOptions ?? null}
        setFoodOptions={(value) => onSectionChange(`${othersBrandSlug}.others.foodOptions`, value)}
        miscCharges={sectionData.miscCharges ?? null}
        setMiscCharges={(value) => onSectionChange(`${othersBrandSlug}.others.miscCharges`, value)}
        homeRulesText={(sectionData.homeRulesText as string) || ""}
        setHomeRulesText={(value) => onSectionChange(`${othersBrandSlug}.others.homeRulesText`, value)}
        bookingPolicy={(sectionData.bookingPolicy as string) || ""}
        setBookingPolicy={(value) => onSectionChange(`${othersBrandSlug}.others.bookingPolicy`, value)}
        faqs={(Array.isArray(sectionData.faqs) ? sectionData.faqs : []) as FaqItem[]}
        selectedFaqCategory={selectedFaqCategory}
        setSelectedFaqCategory={setSelectedFaqCategory}
        draggedFaqIndex={draggedFaqIndex}
        dragOverFaqIndex={dragOverFaqIndex}
        addFaq={(initialData) =>
          updateFaqArray((prev) => [
            ...prev,
            {
              id: v4(),
              category: initialData?.category ?? "Others",
              question: initialData?.question ?? "",
              answer: initialData?.answer ?? "",
              weight: prev.length,
            },
          ])
        }
        removeFaq={(id) =>
          updateFaqArray((prev) =>
            prev.filter((item) => item.id !== id).map((item, index) => ({ ...item, weight: index })),
          )
        }
        updateFaq={(id, updates: FaqUpdate) =>
          updateFaqArray((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
        }
        handleFaqDragStart={(index) => setDraggedFaqIndex(index)}
        handleFaqDragOver={(index) => {
          if (draggedFaqIndex === null) return;
          setDragOverFaqIndex(index);
        }}
        handleFaqDragLeave={() => setDragOverFaqIndex(null)}
        handleFaqDrop={(dropIndex) => {
          if (draggedFaqIndex === null) return;
          updateFaqArray((prev) => {
            if (draggedFaqIndex < 0 || draggedFaqIndex >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(draggedFaqIndex, 1);
            next.splice(dropIndex, 0, moved);
            return next.map((item, index) => ({ ...item, weight: index }));
          });
          setDraggedFaqIndex(null);
          setDragOverFaqIndex(null);
        }}
        handleFaqDragEnd={() => {
          setDraggedFaqIndex(null);
          setDragOverFaqIndex(null);
        }}
        handleFaqCsvUpload={(e, replaceExisting) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const csv = String(event.target?.result ?? "");
            const rows = csv.split("\n").filter((line) => line.trim().length > 0);
            if (rows.length < 2) {
              toast.error("FAQ CSV has no data rows — expected a header row plus at least one FAQ.");
              return;
            }
            const dataRows = rows.slice(1);
            const badRowNumbers: number[] = [];
            const parsed = dataRows
              .map((line, index) => {
                const cols = line.split(",");
                const item = {
                  id: v4(),
                  category: (cols[0] ?? "Others").replace(/\"/g, "").trim(),
                  question: (cols[1] ?? "").replace(/\"/g, "").trim(),
                  answer: (cols[2] ?? "").replace(/\"/g, "").trim(),
                  weight: index,
                };
                if (!item.question || !item.answer) {
                  // +2: +1 for the header row, +1 to make it 1-indexed for the user.
                  badRowNumbers.push(index + 2);
                }
                return item;
              })
              .filter((item) => item.question && item.answer);

            if (parsed.length === 0) {
              toast.error(
                `FAQ CSV import failed — every row is missing a question and/or answer ` +
                  `(row${badRowNumbers.length === 1 ? "" : "s"} ${badRowNumbers.join(", ")}). Nothing was imported.`
              );
              return;
            }

            if (badRowNumbers.length > 0) {
              toast.error(
                `Skipped ${badRowNumbers.length} malformed row${badRowNumbers.length === 1 ? "" : "s"} ` +
                  `(row${badRowNumbers.length === 1 ? "" : "s"} ${badRowNumbers.join(", ")} — missing question and/or answer). ` +
                  `Imported the other ${parsed.length}.`
              );
            } else {
              toast.success(`Imported ${parsed.length} FAQ${parsed.length === 1 ? "" : "s"} from CSV.`);
            }

            if (replaceExisting) {
              onSectionChange(`${othersBrandSlug}.others.faqs`, parsed);
              return;
            }

            updateFaqArray((prev) => [
              ...prev,
              ...parsed.map((item, idx) => ({ ...item, weight: prev.length + idx })),
            ]);
          };
          reader.readAsText(file);
        }}
        handleFaqCsvExport={() => {
          const faqs = (Array.isArray(sectionData.faqs) ? sectionData.faqs : []) as FaqItem[];
          const filteredFaqs =
            selectedFaqCategory === "all" || !selectedFaqCategory
              ? faqs
              : faqs.filter((faq) => faq.category === selectedFaqCategory);

          const csv = [
            "category,question,answer",
            ...filteredFaqs.map((faq) => `"${faq.category}","${faq.question}","${faq.answer}"`),
          ].join("\n");

          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `property-faqs-${DateTime.now().toFormat("yyyy-MM-dd")}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        }}
        metaTitle={(sectionData.metaTitle as string) || ""}
        setMetaTitle={(value) => onSectionChange(`${othersBrandSlug}.others.metaTitle`, value)}
        metaUrl={(sectionData.metaUrl as string) || ""}
        setMetaUrl={(value) => onSectionChange(`${othersBrandSlug}.others.metaUrl`, value)}
        metaDescription={(sectionData.metaDescription as string) || ""}
        setMetaDescription={(value) => onSectionChange(`${othersBrandSlug}.others.metaDescription`, value)}
        metaKeyword={(sectionData.metaKeyword as string) || ""}
        setMetaKeyword={(value) => onSectionChange(`${othersBrandSlug}.others.metaKeyword`, value)}
        joditConfig={joditConfig}
      />
    </div>
  );
}

