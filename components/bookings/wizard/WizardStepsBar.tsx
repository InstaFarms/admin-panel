"use client";

import { useEffect, useRef } from "react";
import { useWizard, money } from "./WizardContext";
import { createLineFiller, popCircle } from "./gsapHelpers";

const TYPE_LABEL: Record<string, string> = {
  owner: "Completed OTA Booking",
  block: "Blocking",
};

function dShort(iso: string): string {
  return new Date(`${iso}T00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type BarDef = { n: number; title: string; sub: string };

export default function WizardStepsBar() {
  const { s, goTo } = useWizard();
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const circRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lineFillers = useRef<Array<(el: HTMLDivElement | null, filled: boolean) => void>>([]);

  const guestFlow = s.resType === "guest";
  const nights = s.checkIn && s.checkOut ? Math.round((+new Date(s.checkOut) - +new Date(s.checkIn)) / 86400000) : 0;
  const total = s.quoteFinalTotal;
  const paid = s.payMode === "manual" ? s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) : 0;

  const barDefs: BarDef[] = guestFlow
    ? [
        { n: 1, title: "Basics", sub: "New Assisted Reservation" },
        { n: 2, title: "Property", sub: s.property?.name || "Choose property" },
        { n: 3, title: "Stay", sub: s.checkIn && s.checkOut ? `${dShort(s.checkIn)}–${dShort(s.checkOut)} · ${nights}N` : "Dates & guests" },
        { n: 4, title: "Guest", sub: s.customer?.name || "Guest details" },
        { n: 5, title: "Commercials", sub: total ? money(total) : "Pricing & quote" },
        { n: 6, title: "Payment", sub: paid > 0 ? `${money(paid)} received` : "Collection" },
        { n: 7, title: "Review", sub: "Confirm & create" },
      ]
    : [
        { n: 1, title: "Basics", sub: TYPE_LABEL[s.resType] || "Choose type" },
        { n: 2, title: "Details", sub: s.property?.name || TYPE_LABEL[s.resType] || "Fill in details" },
        { n: 3, title: "Done", sub: "Create" },
      ];

  useEffect(() => {
    barDefs.forEach((b, i) => {
      if (!lineFillers.current[i]) lineFillers.current[i] = createLineFiller();
      const done = s.step > b.n;
      lineFillers.current[i](lineRefs.current[i], done);
      popCircle(circRefs.current[i], done);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.step]);

  return (
    <div className="ibw-card mb-4 overflow-x-auto p-3.5">
      <div className="flex items-start" style={{ minWidth: barDefs.length > 4 ? 860 : undefined }}>
        {barDefs.map((b, i) => {
          const done = s.step > b.n;
          const active = s.step === b.n;
          const reachable = b.n <= s.maxStep;
          return (
            <div key={b.title} className="flex flex-1 items-start">
              <div
                onClick={() => reachable && goTo(b.n)}
                className="flex min-w-0 items-center gap-2.5 pr-2"
                style={{ cursor: reachable ? "pointer" : "default", opacity: reachable ? 1 : 0.55 }}
              >
                <div
                  ref={(el) => {
                    circRefs.current[i] = el;
                  }}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12.5px] font-extrabold"
                  style={{
                    background: done ? "var(--acc)" : active ? "var(--accSoft)" : "var(--soft)",
                    color: done ? "var(--accOn)" : active ? "var(--accInk)" : "var(--mut)",
                    border: active ? "2px solid var(--acc)" : "1px solid var(--line)",
                    transition: "background .25s ease, color .25s ease, border-color .25s ease",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div className="min-w-0">
                  <div
                    className="whitespace-nowrap text-[12.5px]"
                    style={{ fontWeight: active ? 800 : 600, color: active ? "var(--txt)" : "var(--mut)" }}
                  >
                    {b.title}
                  </div>
                  <div
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px]"
                    style={{ color: "var(--mut)", maxWidth: 110 }}
                  >
                    {b.sub}
                  </div>
                </div>
              </div>
              {i < barDefs.length - 1 && (
                <div className="relative top-4 mx-1 h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                  <div
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    className="h-full origin-left rounded-full"
                    style={{ background: "var(--acc)", transform: `scaleX(${done ? 1 : 0})` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
