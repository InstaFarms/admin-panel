"use client";

import { useEffect, useState } from "react";
import { searchCustomer, createCustomer } from "@/actions/customerActions";
import type { CustomerData } from "@/utils/types";
import { useWizard } from "../WizardContext";
import { useDebouncedCallback } from "@/utils/debounce";
import { FieldLabel, inputCls, inputStyle } from "./FieldBits";

const RECENT_KEY = "insta-booking-wizard-recent-guests-v1";

function customerName(c: CustomerData): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed guest";
}

export default function Step6Guest() {
  const { s, patch } = useWizard();
  const [results, setResults] = useState<CustomerData[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<Array<{ id: string; name: string }>>([]);
  const [ngPhoneBad, setNgPhoneBad] = useState(false);
  const [ngEmailBad, setNgEmailBad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dupMatch, setDupMatch] = useState<CustomerData | null>(null);

  const checkDup = useDebouncedCallback((phone: string) => {
    if (phone.replace(/\D/g, "").length < 10) {
      setDupMatch(null);
      return;
    }
    const fd = new FormData();
    fd.set("searchKey", "Mobile");
    fd.set("searchValue", phone);
    searchCustomer(fd, { brandName: s.brandName }).then((res) => setDupMatch(res.data?.[0] || null));
  }, 400);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const doSearch = (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const fd = new FormData();
    fd.set("searchKey", /^\d/.test(q.trim()) ? "Mobile" : q.includes("@") ? "Email" : "Name");
    fd.set("searchValue", q);
    searchCustomer(fd, { brandName: s.brandName })
      .then((res) => setResults(res.data || []))
      .finally(() => setSearching(false));
  };
  const runSearch = useDebouncedCallback(doSearch, 400);

  const selectCustomer = (c: CustomerData) => {
    patch({
      customerId: c.id,
      customer: { id: c.id, name: customerName(c), phone: c.mobileNumber, email: c.email || undefined },
    });
    const nextRecent = [{ id: c.id, name: customerName(c) }, ...recent.filter((r) => r.id !== c.id)].slice(0, 5);
    setRecent(nextRecent);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
    } catch {
      /* ignore */
    }
  };

  const saveGuest = async () => {
    const phoneOk = s.ngPhone.replace(/\D/g, "").length >= 10;
    const emailOk = !s.ngEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.ngEmail);
    setNgPhoneBad(!phoneOk);
    setNgEmailBad(!emailOk);
    if (!s.ngName.trim() || !phoneOk || !emailOk) return;

    setSaving(true);
    try {
      const [firstName, ...rest] = s.ngName.trim().split(/\s+/);
      const fd = new FormData();
      fd.set("firstName", firstName);
      fd.set("lastName", rest.join(" "));
      fd.set("mobileNumber", s.ngPhone.trim());
      fd.set("email", s.ngEmail.trim());
      const res = await createCustomer(fd, { brandName: s.brandName });
      if (res.error) {
        setNgPhoneBad(true);
        return;
      }
      // The create action doesn't echo back the new record's id, so look it up.
      const lookup = new FormData();
      lookup.set("searchKey", "Mobile");
      lookup.set("searchValue", s.ngPhone.trim());
      const found = await searchCustomer(lookup, { brandName: s.brandName });
      const match = found.data?.find((c) => c.mobileNumber === s.ngPhone.trim());
      if (match) {
        selectCustomer(match);
      }
      patch({ newGuestOpen: false, ngName: "", ngPhone: "", ngEmail: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {s.customer && (
        <div className="ibw-card ibw-fade-up p-[18px]" style={{ borderColor: "var(--acc)" }}>
          <div className="flex flex-wrap items-center gap-3.5">
            <div
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[15px] font-extrabold"
              style={{ background: "var(--accSoft)", color: "var(--accInk)" }}
            >
              {s.customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15.5px] font-extrabold">{s.customer.name}</span>
                <span className="rounded-md px-2 py-0.5 text-[10.5px] font-extrabold" style={{ background: "var(--accSoft)", color: "var(--accInk)" }}>
                  {s.customer.resCount ? "Returning guest" : "New guest"}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--mut)" }}>
                {s.customer.phone} · {s.customer.email}
              </div>
            </div>
            <button
              onClick={() => patch({ customerId: null, customer: null })}
              className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold"
              style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
            >
              Change
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <span className="flex-1 rounded-[10px] px-3 py-2 text-[12px]" style={{ minWidth: 120, background: "var(--soft)", border: "1px solid var(--line)" }}>
              <span style={{ color: "var(--mut)" }}>Last stay</span>
              <br />
              <b>{s.customer.lastStay || "--"}</b>
            </span>
            <span className="flex-1 rounded-[10px] px-3 py-2 text-[12px]" style={{ minWidth: 120, background: "var(--soft)", border: "1px solid var(--line)" }}>
              <span style={{ color: "var(--mut)" }}>City</span>
              <br />
              <b>{s.customer.city || "--"}</b>
            </span>
          </div>
        </div>
      )}

      <div className="ibw-card p-5">
        <div className="text-[15px] font-extrabold">Search existing guest</div>
        <div className="mb-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
          Search by name, phone number or email.
        </div>
        <input
          className={inputCls}
          style={inputStyle}
          value={s.custQ}
          onChange={(e) => {
            // Digits-first input means a phone number, not a name/email --
            // cap it at 10 digits (a full Indian mobile number) instead of
            // letting a pasted/mistyped string run on indefinitely.
            const raw = e.target.value;
            const v = /^\d/.test(raw) ? raw.replace(/\D/g, "").slice(0, 10) : raw;
            patch({ custQ: v });
            runSearch(v);
          }}
          placeholder="Search by name, phone or email…"
        />
        {recent.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-bold" style={{ color: "var(--mut)" }}>
              Recent:
            </span>
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => patch({ customerId: r.id, customer: { id: r.id, name: r.name } })}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        {searching && (
          <div className="mt-3 text-[12.5px]" style={{ color: "var(--mut)" }}>
            Searching…
          </div>
        )}
        {!searching && results.length > 0 && (
          <div className="mt-3.5 flex flex-col gap-2">
            {results.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl p-3" style={{ border: "1px solid var(--line)" }}>
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-bold" style={{ background: "var(--soft)" }}>
                  {customerName(c).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="text-[14px] font-bold">{customerName(c)}</div>
                  <div className="text-[12px]" style={{ color: "var(--mut)" }}>
                    {c.mobileNumber} {c.email ? `· ${c.email}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => selectCustomer(c)}
                  className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-extrabold"
                  style={{ background: "var(--acc)", color: "var(--accOn)" }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
        {!searching && s.custQ.trim() && results.length === 0 && (
          <div className="mt-3.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: "var(--amberSoft)", color: "var(--amber)" }}>
            No guests match "{s.custQ}" -- create a new guest profile below.
          </div>
        )}
      </div>

      <div className="ibw-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="text-[15px] font-extrabold">Create new guest</div>
            <div className="text-[12.5px]" style={{ color: "var(--mut)" }}>
              Guest not found? Add a new profile without leaving the flow.
            </div>
          </div>
          <button
            onClick={() => patch({ newGuestOpen: !s.newGuestOpen })}
            className="rounded-xl px-4 py-2.5 text-[13px] font-bold"
            style={{ background: "var(--soft)", border: "1px solid var(--line)" }}
          >
            {s.newGuestOpen ? "Cancel" : "+ New guest"}
          </button>
        </div>
        {s.newGuestOpen && (
          <div className="ibw-fade-up mt-3.5">
            {dupMatch && (
              <div
                className="mb-3 flex flex-wrap items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[12.5px] font-bold"
                style={{ background: "var(--amberSoft)", color: "var(--amber)" }}
              >
                <span className="min-w-[200px] flex-1">⚠ A guest with this phone number already exists: {customerName(dupMatch)}.</span>
                <button
                  onClick={() => selectCustomer(dupMatch)}
                  className="rounded-[9px] px-3.5 py-1.5 text-[12px] font-extrabold"
                  style={{ background: "var(--amber)", color: "#fff" }}
                >
                  Use existing
                </button>
              </div>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <input className={inputCls} style={inputStyle} value={s.ngName} onChange={(e) => patch({ ngName: e.target.value })} placeholder="Full name *" />
            </div>
            <div>
              <input
                className={inputCls}
                style={inputStyle}
                value={s.ngPhone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  patch({ ngPhone: v });
                  checkDup(v);
                }}
                placeholder="Phone *"
              />
              {ngPhoneBad && (
                <div className="mt-1 text-[11px] font-bold" style={{ color: "var(--bad)" }}>
                  Enter at least 10 digits
                </div>
              )}
            </div>
            <div>
              <input className={inputCls} style={inputStyle} value={s.ngEmail} onChange={(e) => patch({ ngEmail: e.target.value })} placeholder="Email" />
              {ngEmailBad && (
                <div className="mt-1 text-[11px] font-bold" style={{ color: "var(--bad)" }}>
                  Enter a valid email
                </div>
              )}
            </div>
            <button
              onClick={saveGuest}
              disabled={saving}
              className="rounded-xl py-2.5 text-[13px] font-extrabold disabled:opacity-60"
              style={{ background: "var(--acc)", color: "var(--accOn)" }}
            >
              {saving ? "Saving…" : "Save & Select Guest"}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
