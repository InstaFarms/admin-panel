"use client";

import { Button, Checkbox } from "flowbite-react";
import { useRef, useState } from "react";

interface FaqCsvUploadProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, replaceExisting: boolean) => void;
  faqs: Array<any>;
}

export default function FaqCsvUpload({
  onUpload,
  faqs
}: FaqCsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleUploadClick = () => {
    setShowOptions(!showOptions);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e, replaceExisting);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowOptions(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        size="sm"
        color="green"
        onClick={handleUploadClick}
      >
        Upload FAQs
      </Button>

      {showOptions && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 w-64">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="replace-faqs"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              <label htmlFor="replace-faqs" className="text-sm text-gray-900 dark:text-gray-100">
                Replace existing FAQs
              </label>
            </div>

            {replaceExisting && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ⚠️ This will delete all {faqs.length} existing FAQs
              </p>
            )}

            {!replaceExisting && faqs.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                ℹ️ New FAQs will be added to existing {faqs.length} FAQs
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="xs"
                color="green"
                onClick={handleFileSelect}
              >
                Select File
              </Button>
              <Button
                size="xs"
                color="gray"
                onClick={() => setShowOptions(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

