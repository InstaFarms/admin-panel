"use client";

import { Button, Select, TabItem, Textarea, TextInput } from "flowbite-react";
import { HiMenu } from "react-icons/hi";
import FaqCsvUpload from "@/components/common/FaqCsvUpload";

interface FaqData {
  id: string;
  question: string;
  answer: string;
  category: string;
  weight: number;
}

interface OthersFaqsSectionProps {
  faqs: FaqData[];
  selectedFaqCategory: string;
  setSelectedFaqCategory: (value: string) => void;
  draggedFaqIndex: number | null;
  dragOverFaqIndex: number | null;
  addFaq: () => void;
  removeFaq: (id: string) => void;
  updateFaq: (id: string, field: 'question' | 'answer' | 'category', value: string) => void;
  handleFaqDragStart: (e: React.DragEvent, index: number) => void;
  handleFaqDragOver: (e: React.DragEvent, index: number) => void;
  handleFaqDragLeave: (e: React.DragEvent, index: number) => void;
  handleFaqDrop: (e: React.DragEvent, dropIndex: number) => void;
  handleFaqDragEnd: (e: React.DragEvent) => void;
  handleFaqCsvUpload: (e: React.ChangeEvent<HTMLInputElement>, replaceExisting: boolean) => void;
  handleFaqCsvExport: () => void;
}

export default function OthersFaqsSection({
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
}: OthersFaqsSectionProps) {
  return (
    <TabItem title="FAQs">
      <div className="mx-auto max-w-[1000px] p-5 space-y-4">
        {/* Controls Row - Fixed at top */}
        <div className="flex gap-3 items-center justify-between bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
          <div className="flex gap-3 items-center">
            <Select
              value={selectedFaqCategory}
              onChange={(e) => setSelectedFaqCategory(e.target.value)}
              className="w-48"
            >
              <option value="all">All Categories</option>
              <option value="Rooms">Rooms</option>
              <option value="Amenities">Amenities</option>
              <option value="Food & Kitchen">Food & Kitchen</option>
              <option value="Location">Location</option>
              <option value="Commercials">Commercials</option>
              <option value="Others">Others</option>
            </Select>

            <FaqCsvUpload
              onUpload={handleFaqCsvUpload}
              faqs={faqs}
            />

            <Button
              size="sm"
              color="blue"
              onClick={handleFaqCsvExport}
              disabled={faqs.length === 0}
            >
              Export FAQs to CSV
            </Button>
          </div>

          <span className="text-sm text-gray-600">
            Showing: {selectedFaqCategory === "all" ? "All" : selectedFaqCategory} FAQs
            ({selectedFaqCategory === "all" ? faqs.length : faqs.filter(f => f.category === selectedFaqCategory).length})
          </span>
        </div>

        {/* Hidden input for form submission */}
        <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />

        {/* Scrollable FAQs Container */}
        <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          {(() => {
            const filteredFaqs = selectedFaqCategory === "all"
              ? faqs
              : faqs.filter(f => f.category === selectedFaqCategory);

            if (filteredFaqs.length === 0) {
              return (
                <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 m-4">
                  <div className="text-4xl mb-4">❓</div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">
                    No FAQs added yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Upload a CSV file or add FAQs manually
                  </p>
                  <Button onClick={addFaq} color="green">
                    + Add FAQ
                  </Button>
                </div>
              );
            }

            return (
              <div className="p-4 space-y-4">
                {faqs.map((faq, globalIndex) => {
                  // Skip if filtered and doesn't match
                  if (selectedFaqCategory !== "all" && faq.category !== selectedFaqCategory) {
                    return null;
                  }

                  return (
                    <div key={faq.id} className="relative">
                      {/* Drop Zone Indicator */}
                      {draggedFaqIndex !== null && dragOverFaqIndex === globalIndex && draggedFaqIndex !== globalIndex && (
                        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-10 animate-pulse">
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Drop here
                          </div>
                        </div>
                      )}

                      <div
                        draggable
                        onDragStart={(e) => handleFaqDragStart(e, globalIndex)}
                        onDragOver={(e) => handleFaqDragOver(e, globalIndex)}
                        onDragLeave={(e) => handleFaqDragLeave(e, globalIndex)}
                        onDrop={(e) => handleFaqDrop(e, globalIndex)}
                        onDragEnd={handleFaqDragEnd}
                        className={`flex gap-4 p-4 rounded-lg border transition-all bg-white dark:bg-gray-800 ${draggedFaqIndex === globalIndex
                          ? 'bg-gray-100 dark:bg-gray-700 border-dashed border-gray-400 opacity-50'
                          : dragOverFaqIndex === globalIndex && draggedFaqIndex !== null
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300'
                            : 'border-gray-200 dark:border-gray-600'
                          }`}
                      >
                        {/* Drag Handle */}
                        <div className="flex items-start pt-2" title="Drag to reorder">
                          <HiMenu className="text-gray-400 text-2xl cursor-move hover:text-gray-600" />
                        </div>

                        {/* FAQ Content */}
                        <div className="flex-1 space-y-3" draggable={false}>
                          <div className="flex gap-2">
                            <Select
                              value={faq.category}
                              onChange={(e) => updateFaq(faq.id, 'category', e.target.value)}
                              className="w-48"
                              draggable={false}
                            >
                              <option value="Rooms">Rooms</option>
                              <option value="Amenities">Amenities</option>
                              <option value="Food & Kitchen">Food & Kitchen</option>
                              <option value="Location">Location</option>
                              <option value="Commercials">Commercials</option>
                              <option value="Others">Others</option>
                            </Select>
                            <span className="text-xs text-gray-500 pt-3">Weight: {faq.weight}</span>
                          </div>

                          <TextInput
                            placeholder="Question"
                            value={faq.question}
                            onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                            draggable={false}
                          />

                          <Textarea
                            placeholder="Answer"
                            value={faq.answer}
                            onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                            rows={4}
                            draggable={false}
                          />

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              color="red"
                              onClick={() => removeFaq(faq.id)}
                              draggable={false}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add FAQ Button */}
                <div className="flex justify-center pt-4 pb-4">
                  <Button onClick={addFaq} color="green">
                    + Add FAQ
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </TabItem>
  );
}

