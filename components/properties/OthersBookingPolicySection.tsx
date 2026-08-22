"use client";

import LabelWrapper from "@/components/LabelWrapper";
import { TabItem } from "flowbite-react";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface OthersBookingPolicySectionProps {
  bookingPolicy: string;
  setBookingPolicy: (value: string) => void;
  joditConfig: any;
}

export default function OthersBookingPolicySection({
  bookingPolicy,
  setBookingPolicy,
  joditConfig,
}: OthersBookingPolicySectionProps) {
  return (
    <TabItem title="Booking and Cancellation Policy">
      <div className="mx-auto max-w-[1000px] p-5">
        <LabelWrapper label="Booking and Cancellation Policy">
          <JoditEditor
            key="bookingAndCancellationPolicy-editor"
            value={bookingPolicy}
            onBlur={(content: any) => setBookingPolicy(content)}
            config={joditConfig}
          />
          <input
            type="hidden"
            name="bookingPolicy"
            value={bookingPolicy}
          />
        </LabelWrapper>
      </div>
    </TabItem>
  );
}

