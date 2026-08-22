"use client";

interface Step {
  label: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold
                  transition-all duration-200
                  ${isComplete
                    ? "bg-blue-600 text-white"
                    : isActive
                    ? "border-2 border-blue-600 bg-white text-blue-600 dark:bg-gray-800"
                    : "border-2 border-gray-300 bg-white text-gray-400 dark:bg-gray-800 dark:border-gray-600"
                  }
                `}
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  isActive ? "text-blue-600" : isComplete ? "text-gray-700 dark:text-gray-300" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`mx-2 mb-5 h-0.5 w-12 sm:w-20 transition-all duration-200 ${
                  stepNumber < currentStep ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
