"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "flowbite-react";
import toast from "react-hot-toast";

import WizardStepIndicator from "./WizardStepIndicator";
import Step1Brands from "./Step1Brands";
import Step2Identity from "./Step2Identity";
import Step3Details from "./Step3Details";
import Step4Review from "./Step4Review";

interface BrandOption {
  id: string;
  name: string;
}

interface PropertyTypeOption {
  id: string;
  name: string;
}

interface CreatePropertyWizardProps {
  brands: BrandOption[];
  propertyTypes: PropertyTypeOption[];
  onClose?: () => void;
}

const STEPS = [
  { label: "Brands" },
  { label: "Identity" },
  { label: "Details" },
  { label: "Review" },
];

function isQuickCreateBrand(name: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  return normalizedName.includes("instafarms") || normalizedName.includes("mago");
}

function derivePropertyCode(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
}

function inferPrimaryBrandId(
  selectedBrandIds: string[],
  brands: BrandOption[]
): string | undefined {
  // Prefer Instafarms as primary since API creates under INSTAFARMS_ADMIN context
  const instafarms = brands.find(
    (b) => b.name.toLowerCase().includes("instafarms") || b.name.toLowerCase() === "instafarms"
  );
  if (instafarms && selectedBrandIds.includes(instafarms.id)) {
    return instafarms.id;
  }
  // Fall back to first selected brand
  return selectedBrandIds[0];
}

export default function CreatePropertyWizard({ brands, propertyTypes, onClose }: CreatePropertyWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2
  const [propertyName, setPropertyName] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [heading, setHeading] = useState("");
  const [step2Errors, setStep2Errors] = useState<{ propertyName?: string; propertyCode?: string }>({});

  // Step 3
  const [bedroomCount, setBedroomCount] = useState(0);
  const [bathroomCount, setBathroomCount] = useState(0);
  const [doubleBedCount, setDoubleBedCount] = useState(0);
  const [singleBedCount, setSingleBedCount] = useState(0);
  const [mattressCount, setMattressCount] = useState(0);
  const [baseGuestCount, setBaseGuestCount] = useState(0);
  const [maxGuestCount, setMaxGuestCount] = useState(0);
  const [resortRoomNames, setResortRoomNames] = useState<string[]>([]);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  // Step 4
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isResort =
    propertyTypes.find((propertyType) => propertyType.id === propertyTypeId)?.name
      .trim()
      .toLowerCase() === "resort";

  // Property name → auto-derive code
  const handlePropertyNameChange = (value: string) => {
    setPropertyName(value);
    if (!codeManuallyEdited) {
      setPropertyCode(derivePropertyCode(value));
    }
  };

  const handlePropertyCodeChange = (value: string) => {
    setPropertyCode(value);
    setCodeManuallyEdited(true);
  };

  const handlePropertyTypeChange = (value: string) => {
    setPropertyTypeId(value);
    const selectedType = propertyTypes.find((propertyType) => propertyType.id === value);
    if (selectedType?.name.trim().toLowerCase() === "resort" && resortRoomNames.length === 0) {
      setResortRoomNames(["Room 1"]);
    }
  };

  const handleResortRoomCountChange = (count: number) => {
    setResortRoomNames((current) => {
      if (count <= current.length) return current.slice(0, count);
      return [
        ...current,
        ...Array.from({ length: count - current.length }, (_, index) => `Room ${current.length + index + 1}`),
      ];
    });
  };

  const handleResortRoomNameChange = (index: number, value: string) => {
    setResortRoomNames((current) => current.map((name, currentIndex) => currentIndex === index ? value : name));
  };

  const quickCreateSources = [
    {
      id: "INSTAFARMS_EXCLUSIVE",
      name: "InstaFarms Exclusive",
      description: "Manage solely on InstaFarms."
    },
    {
      id: "MAGO",
      name: "Mago",
      description: "Manage through Mago. Automatically synced to InstaFarms."
    },
    {
      id: "ELIVAAS",
      name: "Elivaas",
      description: "Sourced from Elivaas. Automatically synced to InstaFarms."
    }
  ];

  const validateStep1 = (): boolean => {
    if (selectedBrandIds.length === 0) {
      setStep1Error("Please select at least one brand.");
      return false;
    }
    setStep1Error(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    const errors: { propertyName?: string; propertyCode?: string } = {};
    if (!propertyName.trim()) {
      errors.propertyName = "Property name is required.";
    }
    if (!propertyCode.trim()) {
      errors.propertyCode = "Property code is required.";
    } else if (!/^[A-Z0-9][A-Z0-9-]*$/.test(propertyCode)) {
      errors.propertyCode = "Use only uppercase letters, numbers, and hyphens (e.g. SUNSHINE-VILLA).";
    }
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    if (!isResort) {
      setStep3Error(null);
      return true;
    }

    const normalizedNames = resortRoomNames.map((name) => name.trim());
    if (normalizedNames.length === 0) {
      setStep3Error("Add at least one room for this resort.");
      return false;
    }
    if (normalizedNames.some((name) => !name)) {
      setStep3Error("Give every room a name before continuing.");
      return false;
    }
    if (new Set(normalizedNames.map((name) => name.toLowerCase())).size !== normalizedNames.length) {
      setStep3Error("Each room needs a unique name.");
      return false;
    }

    setStep3Error(null);
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const primaryBrandId = inferPrimaryBrandId(selectedBrandIds, brands);
      const additionalBrandIds = selectedBrandIds.filter((id) => id !== primaryBrandId);

      const selectedBrandName = quickCreateSources.find(b => b.id === selectedBrandIds[0])?.name?.toLowerCase() || "";
      let propertySource = "INSTAFARMS_EXCLUSIVE";
      if (selectedBrandName.includes("mago")) propertySource = "MAGO";
      else if (selectedBrandName.includes("elivaas")) propertySource = "ELIVAAS";

      const res = await fetch("/api/wizard/properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyName: propertyName.trim(),
          propertyCode: propertyCode.trim(),
          heading: heading.trim() || propertyName.trim(),
          ...(propertyTypeId ? { propertyTypeId } : {}),
          isResort,
          ...(isResort ? { resortRoomNames: resortRoomNames.map((name) => name.trim()) } : {}),
          ...(!isResort
            ? {
                ...(bedroomCount > 0 ? { bedroomCount } : {}),
                ...(bathroomCount > 0 ? { bathroomCount } : {}),
                ...(doubleBedCount > 0 ? { doubleBedCount } : {}),
                ...(singleBedCount > 0 ? { singleBedCount } : {}),
                ...(mattressCount > 0 ? { mattressCount } : {}),
                ...(baseGuestCount > 0 ? { baseGuestCount } : {}),
                ...(maxGuestCount > 0 ? { maxGuestCount } : {}),
              }
            : {}),
          primaryBrandId,
          additionalBrandIds,
          propertySource,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Failed to create property.");
        return;
      }

      const { propertyId, cloneErrors, roomCreationErrors } = json as {
        propertyId: string;
        cloneErrors?: string[];
        roomCreationErrors?: string[];
      };

      if (cloneErrors?.length) {
        cloneErrors.forEach((msg: string) => toast.error(msg, { duration: 5000 }));
      }
      if (roomCreationErrors?.length) {
        roomCreationErrors.forEach((msg: string) => toast.error(`Room was not created: ${msg}`, { duration: 5000 }));
      }

      toast.success("Property created successfully!");
      onClose?.();
      if (isResort) {
        router.push(`/admin/properties/${propertyId}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Step card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {step === 1 && (
          <Step1Brands
            sources={quickCreateSources}
            disabledSourceIds={[]}
            selectedSourceId={selectedBrandIds[0] || null}
            onChange={(id) => setSelectedBrandIds([id])}
            error={step1Error}
          />
        )}
        {step === 2 && (
          <Step2Identity
            propertyName={propertyName}
            propertyCode={propertyCode}
            propertyTypeId={propertyTypeId}
            heading={heading}
            propertyTypes={propertyTypes}
            onPropertyNameChange={handlePropertyNameChange}
            onPropertyCodeChange={handlePropertyCodeChange}
            onPropertyTypeChange={handlePropertyTypeChange}
            onHeadingChange={setHeading}
            errors={step2Errors}
          />
        )}
        {step === 3 && (
          <Step3Details
            isResort={isResort}
            resortRoomNames={resortRoomNames}
            onResortRoomCountChange={handleResortRoomCountChange}
            onResortRoomNameChange={handleResortRoomNameChange}
            error={step3Error}
            bedroomCount={bedroomCount}
            bathroomCount={bathroomCount}
            doubleBedCount={doubleBedCount}
            singleBedCount={singleBedCount}
            mattressCount={mattressCount}
            baseGuestCount={baseGuestCount}
            maxGuestCount={maxGuestCount}
            onBedroomChange={setBedroomCount}
            onBathroomChange={setBathroomCount}
            onDoubleBedChange={setDoubleBedCount}
            onSingleBedChange={setSingleBedCount}
            onMattressChange={setMattressCount}
            onBaseGuestChange={setBaseGuestCount}
            onMaxGuestChange={setMaxGuestCount}
          />
        )}
        {step === 4 && (
          <Step4Review
            brands={quickCreateSources}
            propertyTypes={propertyTypes}
            selectedBrandIds={selectedBrandIds}
            propertyName={propertyName}
            propertyCode={propertyCode}
            propertyTypeId={propertyTypeId}
            heading={heading}
            isResort={isResort}
            resortRoomNames={resortRoomNames}
            bedroomCount={bedroomCount}
            bathroomCount={bathroomCount}
            doubleBedCount={doubleBedCount}
            singleBedCount={singleBedCount}
            mattressCount={mattressCount}
            baseGuestCount={baseGuestCount}
            maxGuestCount={maxGuestCount}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            color="light"
            onClick={goBack}
            disabled={step === 1}
            className={step === 1 ? "invisible" : ""}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>

          <span className="text-sm text-gray-400">
            Step {step} of {STEPS.length}
          </span>

          <Button color="blue" onClick={goNext}>
            {step === 3 ? "Review" : "Next"}
            <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-4 flex justify-start">
          <Button color="light" onClick={goBack} disabled={isSubmitting}>
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
