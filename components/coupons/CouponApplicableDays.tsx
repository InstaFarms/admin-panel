interface CouponApplicableDaysProps {
  applicableDays: string[];
  daysOfWeek: string[];
  setApplicableDays: (days: string[]) => void;
  error?: string | null;
}

export default function CouponApplicableDays({
  applicableDays,
  daysOfWeek,
  setApplicableDays,
  error,
}: CouponApplicableDaysProps) {
  const isAllSelected = applicableDays.length === daysOfWeek.length;

  const toggleDay = (day: string) => {
    if (applicableDays.includes(day)) {
      setApplicableDays(applicableDays.filter((d) => d !== day));
      return;
    }

    setApplicableDays([...applicableDays, day]);
  };

  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Applicable Days
          </p>
          <p className="text-sm text-slate-400">
            Choose the booking days when this coupon can be used.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setApplicableDays(isAllSelected ? [] : daysOfWeek)}
          className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
            isAllSelected
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
          }`}
        >
          <span>{isAllSelected ? "Clear All" : "Select All"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {daysOfWeek.map((day) => {
          const isSelected = applicableDays.includes(day);
          const shortDay = day.slice(0, 3).toUpperCase();

          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={isSelected}
              className={`flex min-h-20 flex-col items-center justify-center rounded-md border px-3 py-3 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-600/15 text-blue-200 shadow-sm"
                  : "border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
              }`}
            >
              <span className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
                {shortDay}
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded ${
                  isSelected ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${
                    isSelected ? "bg-white" : "bg-transparent"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
