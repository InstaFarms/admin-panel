"use client";

import { getPropertyCollectionAccountConfigAction, type PropertyCollectionAccountConfig } from "@/actions/ownerBankAccountActions";
import { useEffect, useRef, useState } from "react";
import { useWizard, money } from "../WizardContext";
import { revealNewRow } from "../gsapHelpers";
import { inputCls, inputStyle } from "./FieldBits";
import type { PaymentRow } from "../types";

function newRow(amount = ""): PaymentRow {
  return {
    id: Math.random().toString(36).slice(2, 10),
    amount,
    method: "CASH",
    date: new Date().toISOString().slice(0, 10),
    paymentFor: "FULL_PAYMENT",
    ref: "",
    receiverType: "PLATFORM",
    collectedBy: "",
    pgGateway: "",
    pgId: "",
    pgFee: "",
    bankName: "",
    bankRef: "",
  };
}

const PAY_CHOICES = [
  { k: "manual" as const, icon: "💵", title: "Record a payment", desc: "Cash, UPI, bank transfer or gateway -- collected now." },
  { k: "link" as const, icon: "🔗", title: "Send payment link", desc: "Guest pays themselves via a hosted checkout link." },
  { k: "skip" as const, icon: "⏭", title: "Skip for now", desc: "Create the reservation with the full amount outstanding." },
];

export default function Step8Payment() {
  const { s, patch } = useWizard();
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevCount = useRef(s.rows.length);
  const [collectionConfig, setCollectionConfig] = useState<PropertyCollectionAccountConfig | null>(null);

  const total = s.quoteFinalTotal;

  useEffect(() => {
    if (s.rows.length > prevCount.current && listRef.current) {
      revealNewRow(listRef.current.lastElementChild as HTMLElement | null);
    }
    prevCount.current = s.rows.length;
  }, [s.rows.length]);

  useEffect(() => {
    let active = true;
    if (!s.propertyId) {
      setCollectionConfig(null);
      return () => {
        active = false;
      };
    }
    void getPropertyCollectionAccountConfigAction(s.propertyId).then((result) => {
      if (!active || !result.data) return;
      setCollectionConfig(result.data);
      const configuredReceiver = result.data.config?.receiverType;
      if (!configuredReceiver || s.rows.length === 0) return;
      patch({
        rows: s.rows.map((row) => ({
          ...row,
          receiverType: configuredReceiver,
          method:
            configuredReceiver === "OWNER" && row.method === "PAYMENT_GATEWAY"
              ? "CASH"
              : row.method,
          pgGateway: configuredReceiver === "OWNER" ? "" : row.pgGateway,
          pgId: configuredReceiver === "OWNER" ? "" : row.pgId,
          pgFee: configuredReceiver === "OWNER" ? "" : row.pgFee,
        })),
      });
    });
    return () => {
      active = false;
    };
  }, [s.propertyId]);

  const setRow = (id: string, patchRow: Partial<PaymentRow>) => {
    patch({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...patchRow } : r)) });
  };
  const configuredCollectionReceiver = collectionConfig?.config?.receiverType;
  const collectionReceiverType = configuredCollectionReceiver || s.rows[0]?.receiverType || "PLATFORM";
  const setCollectionReceiverType = (receiverType: PaymentRow["receiverType"]) => {
    patch({
      rows: s.rows.map((row) => ({
        ...row,
        receiverType,
        method:
          receiverType === "OWNER" && row.method === "PAYMENT_GATEWAY"
            ? "CASH"
            : row.method,
        pgGateway: receiverType === "OWNER" ? "" : row.pgGateway,
        pgId: receiverType === "OWNER" ? "" : row.pgId,
        pgFee: receiverType === "OWNER" ? "" : row.pgFee,
      })),
    });
  };
  const addRow = () => {
    const row = newRow();
    row.receiverType = collectionReceiverType;
    patch({ rows: [...s.rows, row] });
  };
  const rmRow = (id: string) => patch({ rows: s.rows.filter((r) => r.id !== id) });

  const collected = s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="ibw-card p-5">
        <div className="mb-1 text-[15px] font-extrabold">How do you want to handle payment?</div>
        <div className="mb-3.5 text-[13px]" style={{ color: "var(--mut)" }}>
          Total due for this booking is <b>{money(total)}</b>.
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {PAY_CHOICES.map((c) => {
            const active = s.payMode === c.k;
            return (
              <div
                key={c.k}
                onClick={() => patch({ payMode: c.k, rows: c.k === "manual" && s.rows.length === 0 ? [newRow(String(total || ""))] : s.rows })}
                className="cursor-pointer rounded-2xl p-4"
                style={{ border: active ? "2px solid var(--acc)" : "1px solid var(--line)", background: active ? "var(--accSoft)" : "var(--card)" }}
              >
                <div className="text-[22px]">{c.icon}</div>
                <div className="mt-2 text-[14.5px] font-extrabold">{c.title}</div>
                <div className="mt-0.5 text-[12px]" style={{ color: "var(--mut)" }}>
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {s.payMode === "manual" && (
        <div className="ibw-card ibw-fade-up p-5">
          <div className="mb-4 rounded-2xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <label className="mb-1 block text-[13.5px] font-extrabold">Who collected the guest payment?</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={collectionReceiverType}
              disabled={Boolean(configuredCollectionReceiver)}
              onChange={(e) => setCollectionReceiverType(e.target.value as PaymentRow["receiverType"])}
            >
              <option value="PLATFORM">Mago collected it</option>
              <option value="OWNER">Owner collected it directly</option>
            </select>
            <div className="mt-2 text-[12px]" style={{ color: "var(--mut)" }}>
              {collectionReceiverType === "PLATFORM"
                ? "Mago holds the guest funds. The eligible owner settlement is created in the wallet and follows the configured release rule."
                : "The owner already has the guest funds. It is recorded as paid, but no duplicate wallet or Razorpay Route payout is created."}
            </div>
            {collectionConfig?.config?.selectedAccount ? (
              <div className="mt-2 text-[12px] font-semibold" style={{ color: "var(--mut)" }}>
                Property collection account: {collectionConfig.config.selectedAccount.label} · {collectionConfig.config.selectedAccount.maskedAccountNumber}
              </div>
            ) : null}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-extrabold tracking-[0.1em]" style={{ color: "var(--mut)" }}>
              QUICK AMOUNT
            </span>
            <button onClick={() => s.rows[0] && setRow(s.rows[0].id, { amount: String(total) })} className="ibw-chip">
              Full · {money(total)}
            </button>
            <button onClick={() => s.rows[0] && setRow(s.rows[0].id, { amount: String(Math.round(total / 2)) })} className="ibw-chip">
              50% advance · {money(Math.round(total / 2))}
            </button>
          </div>
          {collected > total && (
            <div className="mb-3 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold" style={{ background: "var(--badSoft)", color: "var(--bad)" }}>
              Recorded amount ({money(collected)}) is more than the total ({money(total)}).
            </div>
          )}
          <div ref={listRef} className="flex flex-col gap-3">
            {s.rows.map((r) => (
              <div key={r.id} className="pay-card rounded-2xl p-4" style={{ border: "1px solid var(--line)", background: "var(--soft)" }}>
                <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                  <input
                    type="number"
                    className={inputCls}
                    style={inputStyle}
                    value={r.amount}
                    onChange={(e) => setRow(r.id, { amount: e.target.value })}
                    placeholder="Amount"
                  />
                  <select className={inputCls} style={inputStyle} value={r.method} onChange={(e) => setRow(r.id, { method: e.target.value as PaymentRow["method"] })}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    {collectionReceiverType === "PLATFORM" && (
                      <option value="PAYMENT_GATEWAY">Payment Gateway</option>
                    )}
                  </select>
                  <input type="date" className={inputCls} style={inputStyle} value={r.date} onChange={(e) => setRow(r.id, { date: e.target.value })} />
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={r.paymentFor}
                    onChange={(e) => setRow(r.id, { paymentFor: e.target.value as PaymentRow["paymentFor"] })}
                  >
                    <option value="FULL_PAYMENT">Full</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="BALANCE">Balance</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div className="mt-2.5 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                  <input className={inputCls} style={inputStyle} value={r.ref} onChange={(e) => setRow(r.id, { ref: e.target.value })} placeholder="Reference ID" />
                  <div className="flex items-center rounded-xl px-3 text-[12.5px] font-bold" style={{ border: "1px solid var(--line)", color: "var(--mut)", background: "var(--card)" }}>
                    {collectionReceiverType === "PLATFORM" ? "Collected by Mago" : "Collected by owner"}
                  </div>
                </div>
                {r.method === "PAYMENT_GATEWAY" && (
                  <div className="ibw-fade-up mt-2.5 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                    <select className={inputCls} style={inputStyle} value={r.pgGateway} onChange={(e) => setRow(r.id, { pgGateway: e.target.value })}>
                      <option value="">Gateway…</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="Cashfree">Cashfree</option>
                      <option value="Others">Others</option>
                    </select>
                    <input className={inputCls} style={inputStyle} value={r.pgId} onChange={(e) => setRow(r.id, { pgId: e.target.value })} placeholder="Gateway payment ID" />
                    <input className={inputCls} style={inputStyle} value={r.pgFee} onChange={(e) => setRow(r.id, { pgFee: e.target.value })} placeholder="Gateway fee" />
                  </div>
                )}
                {r.method === "BANK_TRANSFER" && (
                  <div className="ibw-fade-up mt-2.5 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                    <input className={inputCls} style={inputStyle} value={r.bankName} onChange={(e) => setRow(r.id, { bankName: e.target.value })} placeholder="Bank name" />
                    <input className={inputCls} style={inputStyle} value={r.bankRef} onChange={(e) => setRow(r.id, { bankRef: e.target.value })} placeholder="Bank reference" />
                  </div>
                )}
                {s.rows.length > 1 && (
                  <button onClick={() => rmRow(r.id)} className="mt-2.5 text-[12px] font-bold" style={{ color: "var(--bad)" }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addRow} className="mt-3 rounded-xl px-4 py-2 text-[12.5px] font-bold" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
            + Add another payment
          </button>
        </div>
      )}

      {s.payMode === "link" && (
        <div className="ibw-card ibw-fade-up p-5">
          <div className="mb-3 text-[15px] font-extrabold">Send via</div>
          <div className="mb-3.5 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" checked={s.linkEmail} onChange={(e) => patch({ linkEmail: e.target.checked })} /> Email
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" checked={s.linkWa} onChange={(e) => patch({ linkWa: e.target.checked })} /> WhatsApp
            </label>
          </div>
          <button onClick={() => patch({ linkMsgOpen: !s.linkMsgOpen })} className="text-[12.5px] font-bold underline" style={{ color: "var(--acc)" }}>
            {s.linkMsgOpen ? "Hide customization" : "+ Customize message"}
          </button>
          {s.linkMsgOpen && (
            <div className="ibw-fade-up mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <input
                className={inputCls}
                style={inputStyle}
                value={s.ovEmail}
                onChange={(e) => patch({ ovEmail: e.target.value })}
                placeholder={s.customer?.email || "Override email"}
              />
              <input className={inputCls} style={inputStyle} value={s.ovWa} onChange={(e) => patch({ ovWa: e.target.value })} placeholder={s.customer?.phone || "Override phone"} />
              <textarea
                rows={2}
                className={inputCls}
                style={{ ...inputStyle, gridColumn: "1 / -1", resize: "vertical" }}
                value={s.linkNote}
                onChange={(e) => patch({ linkNote: e.target.value })}
                placeholder="Add a personal note to the payment link message…"
              />
            </div>
          )}
          <div className="mt-3.5 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold" style={{ background: "var(--blueSoft)", color: "var(--blue)" }}>
            The reservation is created as pending and the link is sent when you press Create on the Review step.
          </div>
        </div>
      )}

      {s.payMode === "skip" && (
        <div className="ibw-card ibw-fade-up p-5 text-[13.5px]" style={{ color: "var(--mut)" }}>
          The reservation will be created with <b style={{ color: "var(--txt)" }}>{money(total)}</b> outstanding. You can record payments later
          from the booking's detail page.
        </div>
      )}
    </div>
  );
}
