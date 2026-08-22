import OnboardingMasterManager from "@/components/property-onboarding/OnboardingMasterManager";
export default function Page() {
  return (
    <OnboardingMasterManager
      kind="locations"
      title="Location Contexts"
      description="Manage controlled outdoor and contextual locations used during property structure setup."
    />
  );
}
