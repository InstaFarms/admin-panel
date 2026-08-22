"use client";

import { useEffect, useRef, useState } from "react";
import { calculateOfflineBookingQuote } from "@/actions/bookingActions";
import { fetchAccommodationGstConfig } from "@/actions/taxConfigurationActions";
import { useWizard, money } from "../WizardContext";
import { CountUpValue, Spinner, StaggerGroup } from "../WizardBits";
import { popWithRing, spinIn } from "../gsapHelpers";
import { FieldLabel, inputCls, inputStyle } from "./FieldBits";

const DEFAULT_GST_POLICY = { boundary: 7500, lower: 5, higher: 18 };

export default function Step7Commercials() {
  const { s, patch, toast } = useWizard();
  const autoBtnRef = useRef<HTMLButtonElement | null>(null);
  const autoIconRef = useRef<HTMLSpanElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gstPolicy, setGstPolicy] = useState(DEFAULT_GST_POLICY);

  useEffect(() => {
    let cancelled = false;
    fetchAccommodationGstConfig(s.brandId || null).then((result) => {
      if (!cancelled && result.success) setGstPolicy(result.policy);
    });
    return () => {
      cancelled = true;
    };
  }, [s.brandId]);

  const fetchQuote = () => {
    if (!s.propertyId || !s.checkIn || !s.checkOut) return;
    patch({ quoteLoading: true, quoteError: null });
    calculateOfflineBookingQuote({
      brandId: s.brandId,
      propertyId: s.propertyId,
      bookingExecutionType: "OFFLINE",
      bookingTechPlatform: "ADMIN_PANEL",
      sourceCategory: s.sourceCategory,
      commissionBookingSourceId: s.commissionBookingSourceId || undefined,
      checkinDate: s.checkIn,
      checkoutDate: s.checkOut,
      adultCount: s.adults,
      childrenCount: s.children,
      infantCount: s.infants,
      floatingAdultCount: s.fAdults,
      floatingChildCount: s.fChildren,
      floatingInfantCount: s.fInfants,
      isInclusiveOfGst: false,
    } as any)
      .then((res: any) => {
        if (res.error || !res.success) {
          patch({ quote: null, quoteError: res.error || "Failed to calculate booking amount", quoteLoading: false });
          return;
        }
        patch({ quote: res.success, quoteError: null, quoteLoading: false });
      })
      .catch(() => patch({ quote: null, quoteError: "Failed to calculate booking amount", quoteLoading: false }));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.propertyId, s.checkIn, s.checkOut, s.adults, s.children, s.infants, s.fAdults, s.fChildren, s.fInfants, s.sourceCategory, s.commissionBookingSourceId]);

  useEffect(() => {
    if (s.baseOverrideStr.trim() !== "") {
      popWithRing(autoBtnRef.current);
      spinIn(autoIconRef.current);
    }
  }, [s.baseOverrideStr]);

  const q = s.quote || {};
  const nights = s.checkIn && s.checkOut ? Math.max(1, Math.round((+new Date(s.checkOut) - +new Date(s.checkIn)) / 86400000)) : 1;
  const baseAuto: number = q.baseRentalAmountWithGst ?? q.rentalCharge ?? 0;
  const baseOverridden = s.baseOverrideStr.trim() !== "";
  const baseValue = baseOverridden ? Number(s.baseOverrideStr) || 0 : baseAuto;

  const extraGuestCharge: number =
    q.extraGuestCharge ?? (q.extraAdultGuestChargeWithGst ?? 0) + (q.extraChildGuestChargeWithGst ?? 0) + (q.floatingGuestCharge ?? 0);

  // GST slab is decided by the per-night room rate against the currently
  // effective accommodation GST policy (fetched above; falls back to
  // 5%/18%/₹7,500 until it loads), then applied to the whole taxable stay
  // total (rental + extra-guest charges). No discount subtraction --
  // discounts aren't shown anywhere in this step, so letting them silently
  // reduce the GST basis produced confusing results (a small override could
  // make an old discount swamp the new total, zeroing GST out with no
  // visible explanation). Recomputed live so overriding the rental charge
  // across the per-night threshold updates the rate too, not just the
  // amount. Boundary is exclusive (exactly the boundary -> lower rate).
  const ratePerNight = baseValue / nights;
  const gstPercentage = ratePerNight > gstPolicy.boundary ? gstPolicy.higher : gstPolicy.lower;
  const stayTotal = Math.max(0, baseValue + extraGuestCharge);
  const gstAmount = Math.round((stayTotal * gstPercentage) / 100);
  const full = stayTotal + gstAmount;
  const paid = 0; // nothing collected until Step 8
  const due = Math.max(0, full - paid);

  const lineItems = q.pricingSummary?.breakdown?.lineItems || [];

  // Publish these to wizard state so every later step (Payment, Review,
  // Success) and the final booking submission use the same override- and
  // GST-slab-aware total, instead of each re-deriving it from the raw quote.
  useEffect(() => {
    if (!s.quote) return;
    if (s.quoteFinalTotal === full && s.quoteGstAmount === gstAmount && s.quoteGstPercentage === gstPercentage && s.quoteStayTotal === stayTotal) return;
    patch({ quoteFinalTotal: full, quoteGstAmount: gstAmount, quoteGstPercentage: gstPercentage, quoteStayTotal: stayTotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.quote, full, gstAmount, gstPercentage, stayTotal]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Tile label="AMOUNT PAYABLE" value={full} />
        <Tile label="AMOUNT PAID" value={paid} tone="green" />
        <Tile label="REMAINING DUE" value={due} tone="amber" />
      </div>

      {s.quoteLoading && <Spinner label={`Recalculating server quote for ${s.property?.name || "this property"}…`} />}
      {!s.quoteLoading && s.quoteError && (
        <div className="rounded-xl px-4 py-3 text-[13px] font-bold" style={{ background: "var(--badSoft)", color: "var(--bad)" }}>
          {s.quoteError}
        </div>
      )}

      {!s.quoteLoading && s.quote && (
        <>
          <div className="ibw-card ibw-fade-up p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[15px] font-extrabold">Charge &amp; discount breakdown</div>
              <span className="text-[11px] font-bold" style={{ color: "var(--mut)" }}>
                recalculates live
              </span>
            </div>

            <div className="mb-3 rounded-[13px] p-4" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="text-[11px] font-extrabold tracking-[0.14em]" style={{ color: "var(--mut)" }}>
                  RENTAL CHARGES
                </div>
                {baseOverridden && (
                  <button
                    ref={autoBtnRef}
                    onClick={() => patch({ baseOverrideStr: "" })}
                    className="text-[11.5px] font-extrabold"
                    style={{ color: "var(--acc)" }}
                  >
                    <span ref={autoIconRef} style={{ display: "inline-block" }}>
                      ↺
                    </span>{" "}
                    Reset to rack
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => patch({ baseOverrideStr: String(Math.max(0, baseValue - 500)) })}
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[17px] font-extrabold"
                  style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--mut)" }}
                >
                  −
                </button>
                <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1 pb-1" style={{ borderBottom: "2px solid var(--acc)" }}>
                  <span className="text-[19px] font-extrabold" style={{ color: "var(--mut)" }}>
                    ₹
                  </span>
                  <input
                    className="min-w-0 flex-1 text-center text-[30px] font-extrabold tabular-nums"
                    style={{ border: "none", outline: "none", background: "none" }}
                    inputMode="numeric"
                    value={s.baseOverrideStr}
                    onChange={(e) => patch({ baseOverrideStr: e.target.value.replace(/[^\d]/g, "") })}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                      e.preventDefault();
                      const delta = e.key === "ArrowUp" ? 500 : -500;
                      patch({ baseOverrideStr: String(Math.max(0, baseValue + delta)) });
                    }}
                    placeholder={String(baseAuto)}
                  />
                </div>
                <button
                  onClick={() => patch({ baseOverrideStr: String(baseValue + 500) })}
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[17px] font-extrabold"
                  style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--mut)" }}
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11.5px]" style={{ color: "var(--mut)" }}>
                <span>{money(Math.round(baseValue / nights))} / night · {nights} night{nights === 1 ? "" : "s"}</span>
                {baseOverridden && baseValue !== baseAuto && (
                  <span style={{ color: baseValue < baseAuto ? "var(--green)" : "var(--amber)" }}>
                    {baseValue < baseAuto ? "below" : "above"} rack rate {money(baseAuto)}
                  </span>
                )}
              </div>
            </div>

            <StaggerGroup className="flex flex-col gap-0" triggerKey={lineItems.length}>
              {lineItems.map((r: any) => {
                // The stay/rental subtotal line must track the RENTAL CHARGES
                // stepper above -- otherwise overriding the base rate leaves
                // this row showing the stale server-computed amount.
                const isStaySubtotal = /stay|rental/i.test(r.label || "");
                const amount = isStaySubtotal ? baseValue : r.amount;
                return (
                  <div key={r.key} className="flex items-center justify-between border-b py-2 text-[13.5px]" style={{ borderColor: "var(--line)" }}>
                    <span>{r.label}</span>
                    <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(amount)}
                    </span>
                  </div>
                );
              })}
              {gstAmount > 0 && (
                <div className="flex items-center justify-between py-2 text-[13.5px]" style={{ color: "var(--mut)" }}>
                  <span>GST ({gstPercentage}%)</span>
                  <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {money(gstAmount)}
                  </span>
                </div>
              )}
            </StaggerGroup>

            <div className="flex items-center justify-between border-t-2 pt-3.5 mt-3.5" style={{ borderColor: "var(--txt)" }}>
              <div className="text-[15.5px] font-extrabold">Final total</div>
              <div className="text-[20px] font-extrabold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {money(full)}
              </div>
            </div>

            <div className="mt-3.5 flex gap-2 border-t border-dashed pt-3.5" style={{ borderColor: "var(--line)" }}>
              <button
                onClick={() => toast("Quote saved.")}
                className="flex-1 rounded-[10px] py-2.5 text-[12.5px] font-extrabold"
                style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
              >
                Save quote
              </button>
              <button
                onClick={async () => {
                  const summary = `${s.property?.name || "Property"} · ${s.checkIn} to ${s.checkOut} · ${money(full)} total`;
                  try {
                    await navigator.clipboard.writeText(summary);
                    toast("Estimate copied to clipboard.");
                  } catch {
                    toast("Could not copy -- clipboard unavailable.");
                  }
                }}
                className="flex-1 rounded-[10px] py-2.5 text-[12.5px] font-extrabold"
                style={{ background: "var(--soft)", border: "1px solid var(--line)", color: "var(--acc)" }}
              >
                Share estimate
              </button>
            </div>
          </div>

          <div className="ibw-card ibw-fade-up p-5">
            <div className="mb-1 text-[11px] font-extrabold tracking-[0.14em]" style={{ color: "var(--mut)" }}>
              TAXATION TYPE
            </div>
            <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
              Decides how the invoice is raised for this reservation.
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => patch({ taxType: "b2c" })}
                className="flex-1 rounded-xl p-3 text-left"
                style={{ minWidth: 200, border: s.taxType === "b2c" ? "2px solid var(--acc)" : "1px solid var(--line)", background: "var(--card)" }}
              >
                <div className="text-[13.5px] font-extrabold">B2C · Guest invoice</div>
                <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                  Default — billed to the individual guest
                </div>
              </button>
              <button
                onClick={() => patch({ taxType: "b2b" })}
                className="flex-1 rounded-xl p-3 text-left"
                style={{ minWidth: 200, border: s.taxType === "b2b" ? "2px solid var(--acc)" : "1px solid var(--line)", background: "var(--card)" }}
              >
                <div className="text-[13.5px] font-extrabold">B2B · GST invoice</div>
                <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: "var(--mut)" }}>
                  Billed to a registered business — input credit
                </div>
              </button>
            </div>
            {s.taxType === "b2b" && (
              <div className="ibw-fade-up mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div>
                  <FieldLabel required>GST number</FieldLabel>
                  <input
                    className={inputCls}
                    style={{ ...inputStyle, textTransform: "uppercase" }}
                    value={s.b2bGstin}
                    onChange={(e) => patch({ b2bGstin: e.target.value })}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>
                <div>
                  <FieldLabel required>Company name</FieldLabel>
                  <input className={inputCls} style={inputStyle} value={s.b2bCompany} onChange={(e) => patch({ b2bCompany: e.target.value })} placeholder="Registered legal name" />
                </div>
                <div>
                  <FieldLabel required>City</FieldLabel>
                  <input className={inputCls} style={inputStyle} value={s.b2bCity} onChange={(e) => patch({ b2bCity: e.target.value })} placeholder="Bengaluru" />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" }) {
  const bg = tone === "green" ? "var(--greenSoft)" : tone === "amber" ? "var(--amberSoft)" : "var(--card)";
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--txt)";
  const border = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--line)";
  return (
    <div className="flex-1 rounded-2xl px-4 py-3.5" style={{ minWidth: 160, background: bg, border: `1px solid ${border}` }}>
      <div className="text-[10.5px] font-extrabold tracking-[0.16em]" style={{ color: tone ? color : "var(--mut)" }}>
        {label}
      </div>
      <div className="text-[21px] font-extrabold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
        <CountUpValue value={value} format={money} />
      </div>
    </div>
  );
}
