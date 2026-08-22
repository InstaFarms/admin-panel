"use client";

import { Label, TextInput, Select } from "flowbite-react";

interface PropertyTypeOption {
  id: string;
  name: string;
}

interface Step2IdentityProps {
  propertyName: string;
  propertyCode: string;
  propertyTypeId: string;
  heading: string;
  propertyTypes: PropertyTypeOption[];
  onPropertyNameChange: (value: string) => void;
  onPropertyCodeChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onHeadingChange: (value: string) => void;
  errors: { propertyName?: string; propertyCode?: string };
}

export default function Step2Identity({
  propertyName,
  propertyCode,
  propertyTypeId,
  heading,
  propertyTypes,
  onPropertyNameChange,
  onPropertyCodeChange,
  onPropertyTypeChange,
  onHeadingChange,
  errors,
}: Step2IdentityProps) {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Identity</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Give your property a name and a unique code to identify it in the system.
        </p>
      </div>

      <div className="space-y-5">
        {/* Property Name */}
        <div>
          <div className="mb-2 block">
            <Label htmlFor="propertyName">
              Property Name <span className="text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="propertyName"
            type="text"
            placeholder="e.g. Sunshine Villa"
            value={propertyName}
            onChange={(e) => onPropertyNameChange(e.target.value)}
            color={errors.propertyName ? "failure" : undefined}
            sizing="lg"
          />
          {errors.propertyName ? (
            <p className="mt-1 text-sm text-red-500">{errors.propertyName}</p>
          ) : null}
        </div>

        {/* Property Code */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="propertyCode">
              Property Code <span className="text-red-500">*</span>
            </Label>
            <span className="text-xs text-gray-400">Auto-generated · editable</span>
          </div>
          <TextInput
            id="propertyCode"
            type="text"
            placeholder="e.g. SUNSHINE-VILLA"
            value={propertyCode}
            onChange={(e) => onPropertyCodeChange(e.target.value.toUpperCase())}
            color={errors.propertyCode ? "failure" : undefined}
            sizing="lg"
            className="font-mono"
          />
          {errors.propertyCode ? (
            <p className="mt-1 text-sm text-red-500">{errors.propertyCode}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Must be unique across all properties.</p>
          )}
        </div>

        {/* Property Type */}
        <div>
          <div className="mb-2 block">
            <Label htmlFor="propertyTypeId">Property Type</Label>
          </div>
          <Select
            id="propertyTypeId"
            value={propertyTypeId}
            onChange={(e) => onPropertyTypeChange(e.target.value)}
          >
            <option value="">— Select type (optional) —</option>
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Heading */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="heading">Heading</Label>
            <span className="text-xs text-gray-400">Defaults to property name if left blank</span>
          </div>
          <TextInput
            id="heading"
            type="text"
            placeholder="e.g. Sunshine Villa — A Weekend Escape"
            value={heading}
            onChange={(e) => onHeadingChange(e.target.value)}
            sizing="lg"
          />
        </div>
      </div>
    </div>
  );
}
