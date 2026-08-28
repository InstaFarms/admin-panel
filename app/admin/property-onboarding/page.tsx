"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, Progress, Spinner } from "flowbite-react";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { getOnboardingReadiness } from "@/actions/propertyOnboardingActions";

const sections = [
  [
    "Submission Review",
    "/admin/property-onboarding/submissions",
    "Review new-property intakes, existing-property updates, and frozen evidence.",
  ],
  [
    "Building Levels",
    "/admin/property-onboarding/building-levels",
    "Define levels and the default entrance.",
  ],
  [
    "Location Contexts",
    "/admin/property-onboarding/location-contexts",
    "Define controlled outdoor locations.",
  ],
  [
    "Area Types",
    "/admin/property-onboarding/area-types",
    "Configure structural questions and relationships.",
  ],
  [
    "Onboarding Templates",
    "/admin/property-onboarding/templates",
    "Build centrally controlled item baselines.",
  ],
];
export default function PropertyOnboardingPage() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    getOnboardingReadiness().then((r: any) => r.success && setData(r.data));
  }, []);
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Property Onboarding Configuration
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin-owned structure and baseline rules used by Supervisor and Host
          onboarding.
        </p>
      </div>
      <Card>
        {!data ? (
          <Spinner />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Configuration readiness</h2>
              <Badge color={data.ready ? "success" : "warning"}>
                {data.completionPercent}% ready
              </Badge>
            </div>
            <Progress
              progress={data.completionPercent}
              color={data.ready ? "green" : "yellow"}
            />
            <div className="grid gap-2 md:grid-cols-2">
              {data.checks.map((c: any) => (
                <div
                  key={c.code}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  {c.ready ? (
                    <HiCheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <HiExclamationCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm">{c.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([name, href, description]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-blue-500">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {name}
              </h2>
              <p className="text-sm text-gray-500">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
