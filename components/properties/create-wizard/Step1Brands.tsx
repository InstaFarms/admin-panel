"use client";

interface SourceOption {
  id: string;
  name: string;
  description: string;
}

interface Step1SourceProps {
  sources: SourceOption[];
  disabledSourceIds?: string[];
  selectedSourceId: string | null;
  onChange: (sourceId: string) => void;
  error?: string | null;
}

function getBrandInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const BRAND_COLORS: string[] = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-violet-500 to-violet-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
];

export default function Step1Brands({ sources, disabledSourceIds = [], selectedSourceId, onChange, error }: Step1SourceProps) {
  const selectSource = (id: string) => {
    if (disabledSourceIds.includes(id)) return;
    onChange(id);
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Property Source</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose the source platform for this property. All properties will automatically appear on InstaFarms.
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400 dark:border-gray-600">
          No sources found. Please check your connection.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sources.map((source, index) => {
            const isSelected = selectedSourceId === source.id;
            const isDisabled = disabledSourceIds.includes(source.id);
            const colorClass = BRAND_COLORS[index % BRAND_COLORS.length]!;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => selectSource(source.id)}
                disabled={isDisabled}
                className={`
                  relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left
                  transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${isDisabled
                    ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900"
                    : isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md dark:bg-blue-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                  }
                `}
              >
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass} text-white text-xl font-bold shadow-sm`}
                >
                  {getBrandInitials(source.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold ${isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                    {source.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {source.description}
                  </p>
                </div>
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all
                    ${isSelected ? "bg-blue-600" : "border-2 border-gray-300 dark:border-gray-500"}`}
                >
                  {isSelected && !isDisabled && (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
