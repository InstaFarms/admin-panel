"use client";

import React from "react";
import { Label } from "flowbite-react";

interface LabelWrapperProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function LabelWrapper({ label, required, children }: LabelWrapperProps) {
  return (
    <div>
      <div className="mb-2 block">
        <Label>
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          )}
        </Label>
      </div>
      {children}
    </div>
  );
}
