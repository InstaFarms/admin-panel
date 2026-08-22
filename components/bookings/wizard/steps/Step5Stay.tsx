"use client";

import { useState } from "react";
import { useWizard } from "../WizardContext";
import { inputCls, inputStyle } from "./FieldBits";
import StayCalendar from "./StayCalendar";

const GUEST_NOTE_CHIPS = ["Early check-in", "Late check-out", "Late check-in", "Airport pickup", "Extra bed", "Special request"];

function Stepper({ label, hint, value, onDec, onInc }: { label: string; hint?: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex-1 rounded-2xl p-3.5" style={{ minWidth: 140, background: "var(--soft)", border: "1px solid var(--line)" }}>
      <div className="text-[12px] font-bold" style={{ color: "var(--mut)" }}>
        {label}
      </div>
      {hint && (
        <div className="mb-2 text-[10.5px]" style={{ color: "var(--mut)" }}>
          {hint}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onDec}
          className="h-8 w-8 rounded-[10px] text-[16px] font-extrabold"
          style={{ border: "1px solid var(--line)", background: "var(--card)" }}
        >
          −
        </button>
        <div className="min-w-[22px] text-center text-[18px] font-extrabold" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        <button
          onClick={onInc}
          className="h-8 w-8 rounded-[10px] text-[16px] font-extrabold"
          style={{ border: "1px solid var(--line)", background: "var(--card)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Step5Stay() {
  const { s, patch } = useWizard();
  const [pendingInc, setPendingInc] = useState<"adults" | "children" | null>(null);

  const totalGuests = s.adults + s.children + s.infants;
  const included = s.property?.baseGuests || 8;
  const maxGuests = s.property?.maxGuests || 15;
  const extraGuests = Math.max(0, s.adults + s.children - included);
  const capPct = Math.min(100, Math.round((totalGuests / maxGuests) * 100));
  const overCap = totalGuests > maxGuests;
  const ready = !!(s.checkIn && s.checkOut && s.adults >= 1);
  const guide = !s.checkIn
    ? "Pick a check-in date to start — then a check-out."
    : !s.checkOut
      ? "Now pick a check-out date (click or drag across the calendar)."
      : s.adults < 1
        ? "Add at least one adult to continue."
        : "All set — continue to guest details.";

  const requestInc = (kind: "adults" | "children") => {
    if (totalGuests + 1 > maxGuests) {
      setPendingInc(kind);
      return;
    }
    patch(kind === "adults" ? { adults: s.adults + 1 } : { children: s.children + 1 });
  };
  const confirmOver = () => {
    if (pendingInc) patch(pendingInc === "adults" ? { adults: s.adults + 1 } : { children: s.children + 1 });
    setPendingInc(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <StayCalendar />

      <div className="ibw-card p-5">
        <div className="text-[15px] font-extrabold">Guests</div>
        <div className="mb-3.5 text-[12.5px]" style={{ color: "var(--mut)" }}>
          Staying headcount -- used for capacity checks and extra-guest pricing.
        </div>
        <div className="flex flex-wrap gap-3">
          <Stepper label="Adults" value={s.adults} onDec={() => patch({ adults: Math.max(1, s.adults - 1) })} onInc={() => requestInc("adults")} />
          <Stepper label="Children" value={s.children} onDec={() => patch({ children: Math.max(0, s.children - 1) })} onInc={() => requestInc("children")} />
          <Stepper label="Infants" value={s.infants} onDec={() => patch({ infants: Math.max(0, s.infants - 1) })} onInc={() => patch({ infants: s.infants + 1 })} />
        </div>

        <div className="mb-1.5 mt-4 flex items-center gap-2">
          <div className="text-[12px] font-extrabold tracking-[0.16em]" style={{ color: "var(--mut)" }}>
            FLOATING GUESTS
          </div>
          <span className="rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
            EXTRA-GUEST PRICING ONLY
          </span>
        </div>
        <div className="mb-2.5 text-[12px]" style={{ color: "var(--mut)" }}>
          Distinct from the headcount above -- day visitors / floaters counted only for extra-guest charges, not capacity.
        </div>
        <div className="flex flex-wrap gap-3">
          <Stepper label="Adults" value={s.fAdults} onDec={() => patch({ fAdults: Math.max(0, s.fAdults - 1) })} onInc={() => patch({ fAdults: s.fAdults + 1 })} />
          <Stepper label="Children" value={s.fChildren} onDec={() => patch({ fChildren: Math.max(0, s.fChildren - 1) })} onInc={() => patch({ fChildren: s.fChildren + 1 })} />
          <Stepper label="Infants" value={s.fInfants} onDec={() => patch({ fInfants: Math.max(0, s.fInfants - 1) })} onInc={() => patch({ fInfants: s.fInfants + 1 })} />
        </div>

        <div className="mt-4 rounded-2xl p-3.5" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-bold">
            <span className="rounded-lg px-2.5 py-0.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              Total {totalGuests}
            </span>
            <span className="rounded-lg px-2.5 py-0.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              Included up to {included}
            </span>
            {extraGuests > 0 && (
              <span className="rounded-lg px-2.5 py-0.5" style={{ background: "var(--accSoft)", color: "var(--accInk)" }}>
                +{extraGuests} extra
              </span>
            )}
            <span className="rounded-lg px-2.5 py-0.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              Max {maxGuests}
            </span>
            <span
              className="rounded-lg px-2.5 py-0.5"
              style={{ background: overCap ? "var(--badSoft)" : "var(--greenSoft)", color: overCap ? "var(--bad)" : "var(--green)" }}
            >
              {overCap ? "Over capacity" : "Within capacity"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${capPct}%`, background: overCap ? "var(--bad)" : "var(--acc)" }}
            />
          </div>
          {pendingInc && (
            <div className="ibw-fade-up mt-3 rounded-xl p-3.5" style={{ background: "var(--amberSoft)", border: "1px solid var(--amber)" }}>
              <div className="mb-2.5 text-[12.5px] font-bold" style={{ color: "var(--amber)" }}>
                That's over this property's max of {maxGuests} guests. Add anyway?
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={confirmOver} className="rounded-[10px] px-4 py-2 text-[12.5px] font-extrabold" style={{ background: "var(--amber)", color: "#fff" }}>
                  Yes, add guest anyway
                </button>
                <button onClick={() => setPendingInc(null)} className="rounded-[10px] px-4 py-2 text-[12.5px] font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ibw-card p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--mut)" }}>
          Notes
        </div>
        <div className="mb-3.5 text-[12.5px]" style={{ color: "var(--mut)" }}>
          Tap a quick request to add it, or type your own. Guest-facing and internal notes are kept separate.
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--line)", borderTop: "3px solid var(--acc)" }}>
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg"
                style={{ background: "var(--accSoft)", color: "var(--accInk)" }}
              >
                💬
              </span>
              <div className="flex-1">
                <div className="text-[13.5px] font-extrabold leading-tight">Guest notes</div>
                <div className="text-[11px]" style={{ color: "var(--mut)" }}>
                  Shown to the guest on the confirmation
                </div>
              </div>
              <span className="rounded-md px-2 py-0.5 text-[9.5px] font-extrabold" style={{ background: "var(--accSoft)", color: "var(--accInk)" }}>
                GUEST-FACING
              </span>
            </div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {GUEST_NOTE_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => patch({ guestNotes: s.guestNotes ? `${s.guestNotes}; ${c}` : c })}
                  className="ibw-chip"
                >
                  + {c}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              className={inputCls}
              style={{ ...inputStyle, resize: "vertical" }}
              value={s.guestNotes}
              onChange={(e) => patch({ guestNotes: e.target.value })}
              placeholder="Arrival time, preferences, requests the guest will see…"
            />
          </div>
          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--line)", borderTop: "3px solid var(--amber)" }}>
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg"
                style={{ background: "var(--amberSoft)", color: "var(--amber)" }}
              >
                🔒
              </span>
              <div className="flex-1">
                <div className="text-[13.5px] font-extrabold leading-tight">Internal notes</div>
                <div className="text-[11px]" style={{ color: "var(--mut)" }}>
                  Ops-only -- never shown to the guest
                </div>
              </div>
              <span className="rounded-md px-2 py-0.5 text-[9.5px] font-extrabold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
                INTERNAL
              </span>
            </div>
            <textarea
              rows={5}
              className={inputCls}
              style={{ ...inputStyle, resize: "vertical" }}
              value={s.internalNotes}
              onChange={(e) => patch({ internalNotes: e.target.value })}
              placeholder="Ops-only context, flags, reminders for the team…"
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3 text-[12.5px] font-bold"
        style={{ background: ready ? "var(--greenSoft)" : "var(--blueSoft)", color: ready ? "var(--green)" : "var(--blue)" }}
      >
        {ready ? "✓" : "→"} {guide}
      </div>
    </div>
  );
}
