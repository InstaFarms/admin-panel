"use client";

import { useWizard, money } from "../WizardContext";

export default function Step9Review() {
  const { s, goTo } = useWizard();

  const total = s.quoteFinalTotal;
  const paid = s.payMode === "manual" ? s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) : 0;
  const due = Math.max(0, total - paid);
  const status = due <= 0 && total > 0 ? "Fully paid" : paid > 0 ? "Partially paid" : "Payment pending";
  const statusTone = due <= 0 && total > 0 ? "green" : paid > 0 ? "amber" : "amber";
  const payColor = statusTone === "green" ? "var(--green)" : "var(--amber)";

  const nextSteps = [
    "The guest is notified with the confirmation and stay details.",
    "The reservation is created instantly and blocks the calendar.",
    s.payMode === "link" ? "A payment link is sent to the guest for the outstanding amount." : due > 0 ? "The remaining balance is tracked against this booking." : "The payment is recorded as fully received.",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="ibw-card p-5" style={{ background: "linear-gradient(135deg, var(--accSoft), var(--card))" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="text-[18px] font-extrabold">{s.customer?.name || "Guest"}</div>
            <div className="text-[13px]" style={{ color: "var(--mut)" }}>
              {s.checkIn} → {s.checkOut} · {s.property?.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-extrabold">{money(total)}</div>
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-extrabold"
              style={{ background: statusTone === "green" ? "var(--greenSoft)" : "var(--amberSoft)", color: statusTone === "green" ? "var(--green)" : "var(--amber)" }}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <ReviewCard title="Booking details" onEdit={() => goTo(3)}>
          <Row label="Check-in" value={s.checkIn || "--"} />
          <Row label="Check-out" value={s.checkOut || "--"} />
          <Row label="Guests" value={String(s.adults + s.children + s.infants)} />
          <Row label="Property" value={s.property?.name || "--"} />
          {s.property?.area && (
            <div className="text-right text-[12px]" style={{ color: "var(--mut)" }}>
              {s.property.area}
            </div>
          )}
        </ReviewCard>
        <ReviewCard title="Pricing breakdown" onEdit={() => goTo(5)}>
          <Row label="Base + extras" value={money(s.quoteStayTotal)} />
          <Row label={`GST (${s.quoteGstPercentage}%)`} value={money(s.quoteGstAmount)} />
          <Row label="Total" value={money(total)} bold />
        </ReviewCard>
        <ReviewCard title={`Payment · ${status}`} onEdit={() => goTo(6)} accent={payColor}>
          <Row label="Received" value={money(paid)} valueColor={payColor} bold />
          <Row label="Due" value={money(due)} bold />
          <Row label="Method" value={s.payMode === "manual" ? s.rows[0]?.method.replace("_", " ") || "--" : s.payMode === "link" ? "Payment link" : "Not collected yet"} />
        </ReviewCard>
      </div>

      <div className="ibw-card p-5">
        <div className="mb-2.5 text-[14px] font-extrabold">What happens next</div>
        <ul className="flex flex-col gap-2">
          {nextSteps.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--mut)" }}>
              <span
                className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold"
                style={{ background: "var(--greenSoft)", color: "var(--green)" }}
              >
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-2.5 border-t pt-2.5 text-[12.5px]" style={{ borderColor: "var(--line)", color: "var(--mut)" }}>
          Use Edit on any card above to jump back, or press <b style={{ color: "var(--txt)" }}>Create Reservation</b> below when you're ready.
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ title, onEdit, accent, children }: { title: string; onEdit: () => void; accent?: string; children: React.ReactNode }) {
  return (
    <div className="ibw-card p-4" style={accent ? { borderColor: accent } : undefined}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13.5px] font-extrabold" style={accent ? { color: accent } : undefined}>
          {title}
        </div>
        <button onClick={onEdit} className="text-[12px] font-bold underline" style={{ color: accent || "var(--acc)" }}>
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, tone, bold, valueColor }: { label: string; value: string; tone?: "green"; bold?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span style={{ color: "var(--mut)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color: valueColor || (tone === "green" ? "var(--green)" : "var(--txt)") }}>{value}</span>
    </div>
  );
}
