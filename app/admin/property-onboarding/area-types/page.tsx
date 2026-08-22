import OnboardingMasterManager from "@/components/property-onboarding/OnboardingMasterManager";
export default function Page() {
  return (
    <OnboardingMasterManager
      kind="area-types"
      title="Onboarding Area Types"
      description="Configure count questions, level/location rules, relationships, evidence, and app availability."
    />
  );
}
