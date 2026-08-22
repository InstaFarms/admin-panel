"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard, money } from "../WizardContext";
import { popCheck } from "../gsapHelpers";
import { getBookingById, sendBookingPaymentLink } from "@/actions/bookingActions";

const ACTION_ICONS: Record<string, string> = {
  print: "🖨",
  copy: "🔗",
  whatsapp: "💬",
  email: "✉️",
  view: "📋",
  calendar: "📅",
};

export default function Step10Success() {
  const { s, toast } = useWizard();
  const router = useRouter();
  const checkRef = useRef<HTMLDivElement | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [polls, setPolls] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const total = s.quoteFinalTotal;
  const paid = s.payMode === "manual" ? s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) : 0;
  const pending = s.payMode === "link" && !confirmed;

  useEffect(() => {
    popCheck(checkRef.current);
  }, []);

  useEffect(() => {
    if (!pending || !s.bookingId) return;
    if (polls >= 15) return;
    const t = setTimeout(async () => {
      try {
        const res = await getBookingById(s.bookingId!);
        const status = (res as any)?.success?.booking?.status;
        if (status === "CONFIRMED" || status === "COMPLETED") {
          setConfirmed(true);
        } else {
          setPolls((p) => p + 1);
        }
      } catch {
        setPolls((p) => p + 1);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [pending, polls, s.bookingId]);

  const copyId = () => {
    if (s.bookingId) navigator.clipboard?.writeText(s.bookingId).catch(() => {});
    setCopyLabel("✓ Copied");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  };

  const resendLink = async () => {
    if (!s.bookingId) return;
    const res = await sendBookingPaymentLink({
      bookingId: s.bookingId,
      brandId: s.brandId,
      deliveryChannels: ([s.linkEmail && "email", s.linkWa && "whatsapp"] as const).filter(
        (v): v is "email" | "whatsapp" => v !== false,
      ),
    });
    if ((res as any)?.error) toast((res as any).error);
    else toast("Payment link re-sent.");
  };

  const payLabel = pending ? "Payment link sent — waiting for payment" : total > 0 ? "Fully paid" : "No payment required";
  const payCaption = pending ? `Auto-checking every few seconds · checked ${polls}×` : total > 0 ? money(paid) : "";
  const payColor = pending ? "var(--amber)" : "var(--green)";

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1 flex flex-col gap-4" style={{ flex: "2.4 1 480px" }}>
        <div className="ibw-card p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div
              ref={checkRef}
              className="flex h-16 w-16 flex-none items-center justify-center rounded-full text-[30px] font-extrabold"
              style={{ background: "var(--greenSoft)", color: "var(--green)" }}
            >
              ✓
            </div>
            <div className="min-w-[220px] flex-1">
              <div className="mb-2 text-[22px] font-extrabold">Booking Confirmed 🎉</div>
              <div className="flex flex-wrap gap-2 text-[12px]" style={{ color: "var(--mut)" }}>
                <span className="rounded-md px-2 py-0.5" style={{ background: "var(--soft)" }}>
                  {s.customer?.name}
                </span>
                <span className="rounded-md px-2 py-0.5" style={{ background: "var(--soft)" }}>
                  {s.property?.name}
                </span>
                <span className="rounded-md px-2 py-0.5" style={{ background: "var(--soft)" }}>
                  {s.checkIn} → {s.checkOut}
                </span>
              </div>
              <div
                className="mt-2.5 flex w-fit items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                style={{ background: "var(--soft)", border: "1px dashed var(--acc)" }}
              >
                <div>
                  <div className="text-[10px] font-extrabold tracking-[0.14em]" style={{ color: "var(--mut)" }}>
                    RESERVATION ID
                  </div>
                  <div className="font-mono text-[16px] font-extrabold" style={{ color: "var(--acc)" }}>
                    {s.bookingId}
                  </div>
                </div>
                <button onClick={copyId} className="rounded-[9px] px-3 py-1.5 text-[12px] font-extrabold" style={{ background: "var(--acc)", color: "var(--accOn)" }}>
                  {copyLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ibw-card flex flex-wrap items-center gap-3.5 p-5" style={{ borderColor: payColor }}>
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 text-[11px] font-extrabold tracking-[0.14em]" style={{ color: "var(--mut)" }}>
              PAYMENT STATUS
            </div>
            <div className="text-[16px] font-extrabold" style={{ color: payColor }}>
              {payLabel}
            </div>
            {payCaption && (
              <div className="mt-0.5 text-[12px]" style={{ color: "var(--mut)" }}>
                {payCaption}
              </div>
            )}
          </div>
          {pending && (
            <button onClick={resendLink} className="rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold" style={{ background: "var(--amber)", color: "#fff" }}>
              Send Payment Link
            </button>
          )}
          {!pending && total > 0 && (
            <span className="text-[12.5px] font-bold" style={{ color: "var(--green)" }}>
              Method · {s.payMode === "manual" ? s.rows[0]?.method.replace("_", " ") : s.payMode === "link" ? "Payment link" : "--"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/admin/bookings/${s.bookingId}`)}
            className="rounded-xl px-5 py-2.5 text-[13px] font-extrabold"
            style={{ background: "var(--acc)", color: "var(--accOn)" }}
          >
            View Reservation →
          </button>
        </div>

        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="ibw-card p-4">
            <div className="mb-2.5 text-[13.5px] font-extrabold">Guest communication</div>
            <ActionRow icon={ACTION_ICONS.print} label="Print confirmation" onClick={() => window.print()} />
            <ActionRow
              icon={ACTION_ICONS.copy}
              label="Copy booking link"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/admin/bookings/${s.bookingId}`).catch(() => {});
                toast("Link copied.");
              }}
            />
            <ActionRow icon={ACTION_ICONS.whatsapp} label="Send WhatsApp confirmation" onClick={() => toast("Coming soon -- not wired to a backend endpoint yet (see docs).")} />
            <ActionRow icon={ACTION_ICONS.email} label="Send email confirmation" onClick={() => toast("Coming soon -- not wired to a backend endpoint yet (see docs).")} />
          </div>
          <div className="ibw-card p-4">
            <div className="mb-2.5 text-[13.5px] font-extrabold">Operations</div>
            <ActionRow icon={ACTION_ICONS.view} label="View booking in Reservations" onClick={() => router.push(`/admin/bookings/${s.bookingId}`)} />
            <ActionRow icon={ACTION_ICONS.calendar} label="Add to calendar" onClick={() => toast("Coming soon -- not wired to a backend endpoint yet (see docs).")} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <button
            onClick={() => (window.location.href = "/admin/bookings/new-reservation")}
            className="rounded-xl px-[18px] py-2.5 text-[13px] font-extrabold"
            style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--txt)" }}
          >
            Create another reservation
          </button>
          <button onClick={() => router.push("/admin/bookings")} className="rounded-xl px-2 py-2.5 text-[13px] font-extrabold" style={{ background: "none", color: "var(--mut)" }}>
            Go to dashboard →
          </button>
        </div>
      </div>

      <div className="ibw-card min-w-0 p-[18px]" style={{ flex: "1 1 280px", maxWidth: 340 }}>
        <div className="mb-2.5 text-[14.5px] font-extrabold">Booking Summary</div>
        {[
          { k: "Brand", v: s.brandName || "--" },
          { k: "Property", v: s.property?.name || "--" },
          { k: "Dates", v: s.checkIn && s.checkOut ? `${s.checkIn} → ${s.checkOut}` : "--" },
          { k: "Guests", v: String(s.adults + s.children + s.infants) },
          { k: "Guest", v: s.customer?.name || "--" },
          { k: "Source", v: s.sourceKind || "--" },
        ].map((r) => (
          <div key={r.k} className="flex justify-between gap-2.5 border-b py-1.5 text-[12.5px]" style={{ borderColor: "var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>{r.k}</span>
            <span className="font-bold">{r.v}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2.5 text-[14px]">
          <span className="font-extrabold">Total</span>
          <span className="font-extrabold tabular-nums" style={{ color: "var(--acc)" }}>
            {money(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-1.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold" style={{ background: "var(--soft)" }}>
      <span>{icon}</span>
      {label}
    </button>
  );
}
