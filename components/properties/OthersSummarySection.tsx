"use client";

import LabelWrapper from "@/components/LabelWrapper";
import { TabItem } from "flowbite-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface OthersSummarySectionProps {
  descriptionText: string;
  setDescriptionText: (value: string) => void;
  homeRulesText: string;
  setHomeRulesText: (value: string) => void;
  joditConfig: any;
}

export default function OthersSummarySection({
  descriptionText,
  setDescriptionText,
  homeRulesText,
  setHomeRulesText,
  joditConfig,
}: OthersSummarySectionProps) {
  return [
    <TabItem key="summary" title="Summary">
        <div className="mx-auto max-w-[1000px] p-5">
          <LabelWrapper label="Summary">
            <div className="border rounded-lg overflow-hidden">
              <JoditEditor
                key="summary-editor"
                value={descriptionText}
                onBlur={(content: any) => setDescriptionText(content)}
                config={joditConfig}
              />
            </div>

            {/* Hidden input to store the description value for form submission */}
            <input type="hidden" name="description" value={descriptionText} />
          </LabelWrapper>
        </div>
      </TabItem>,

    <TabItem key="homeRules" title="Home Rules and Truth">
        <div className="mx-auto max-w-[1000px] p-5">
          <LabelWrapper label="Home Rules and Truth">
            <JoditEditor
              key="homeRulesAndTruth-editor"
              value={homeRulesText}
              onBlur={(content: any) => setHomeRulesText(content)}
              config={joditConfig}
            />
            <input
              type="hidden"
              name="homeRulesAndTruth"
              value={JSON.stringify({ content: homeRulesText })}
            />
          </LabelWrapper>
        </div>
      </TabItem>
  ];
}

