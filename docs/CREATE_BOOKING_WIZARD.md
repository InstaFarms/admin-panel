# Create Booking Wizard

Route: **`/admin/bookings/new-reservation`**

A new, separate page implementing the "Create Booking Wizard" design
(`https://claude.ai/design/p/c981cbf1-102d-43ff-ad2a-96859ca34bc5`, file
`Create Booking Wizard.dc.html`). It does **not** replace or modify the
existing reservation-creation pages at `/admin/bookings/create`,
`/admin/bookings/owner-reservation/create`, `/admin/bookings/blocking/create`
or `/admin/bookings/enquiry/create` -- all of those are untouched (their
backend actions are also still used by those pages). This is an additional
entry point that will eventually replace them once it's fully validated;
until then both exist side by side.

Only the main content area was built (per instructions, the navbar/sidebar
were left alone). The wizard renders its own self-contained shell -- it
intentionally does **not** use the app's Flowbite `dark:`-class theme system.
Instead it scopes its own CSS custom properties (`--bg`, `--acc`, `--card`,
etc., see `components/bookings/wizard/wizard-theme.css`) under a `.ibw-root`
wrapper and a `data-theme="light"|"dark"` attribute toggled by the page's own
theme button (top right). This mirrors an existing precedent in this
codebase: `CreateBlockingEditor.tsx` / `/admin/bookings/blocking/create` is
also a fully bespoke, self-themed page that ignores the global dark-mode
toggle. See "Theming" below for why this was the deliberate choice over
retrofitting Flowbite's `dark:` classes.

## Reservation types (exact match to the design)

Step 1 now offers exactly the three type cards the design mock defines --
no more, no less:

- **New Assisted Reservation** (`resType: "guest"`) -- the full guest
  booking flow, with payment.
- **Completed OTA Booking** (`resType: "owner"`, reusing the design's own
  `owner` key) -- logs a booking already confirmed on an OTA channel
  (Airbnb, Booking.com, ...). This **replaces** the old "Owner Reservation"
  self-stay flow entirely; that older feature's editor/action
  (`CreateOwnerReservationEditor.tsx` / `createOwnerReservation`) still
  exists and is used by `/admin/bookings/owner-reservation/create`, but is
  no longer reachable from this wizard.
- **Blocking** (`resType: "block"`) -- inventory-only operational block.

"Booking Enquiry" is **not** a type card in the design and has been removed
from this wizard's picker (`BookingEnquiryForm.tsx` deleted). The
`createReservationEnquiry` action and `/admin/bookings/enquiry/create` are
untouched and still work as their own page.

## Flow shape

Renumbered to match the design's actual behavior (it visually collapses
brand/type/source/purpose onto one screen and jumps straight from there to
Property Selection):

**Guest flow (7 steps + success):** 1. Type & Details (brand pill-toggle +
3 type cards +, once "New Assisted Reservation" is picked, inline booking-
source cards and purpose/reason cards on the same screen) → 2. Property
Selection → 3. Stay Details → 4. Guest Details → 5. Commercials → 6. Payment
→ 7. Review & Confirm → (terminal) Success.

**Completed OTA Booking / Blocking (2 steps + success):** 1. Type & Details
→ 2. flow-specific form → (terminal) Success (`ShortFlowDone.tsx`).

## File map

```
apps/admin/app/admin/bookings/new-reservation/page.tsx      -- server component: fetches brands/owners/commission sources/draft
apps/admin/components/bookings/wizard/
  CreateBookingWizard.tsx     -- shell: state machine, topbar, footer nav, draft autosave, create submission
  WizardContext.tsx           -- React context + `money()`/`moneyCompact()` formatters
  WizardStepsBar.tsx          -- animated step progress bar (guest flow only)
  SidebarRail.tsx             -- "Booking Summary so far" + Smart Assist + payment donut
  WizardBits.tsx              -- CountUpValue / StaggerGroup / Spinner (GSAP-backed primitives)
  gsapHelpers.ts               -- every GSAP animation used across the wizard, with graceful no-GSAP fallback
  useWizardProperties.ts      -- client-side property list loader used by every property picker
  types.ts                    -- WizardState shape
  wizard-theme.css            -- scoped design tokens (light/dark), 1:1 with the .dc.html mock
  steps/
    Step1TypeBrand.tsx        -- brand + type + (guest flow) inline booking-source + purpose picker -- all of Step 1
    OtaLoggingForm.tsx        -- "Completed OTA Booking" flow (iCal-sync placeholder, channel/property/pax, settlement ledger)
    PropertyBlockForm.tsx     -- "Blocking" flow (calendar date picker, Temporary/Permanent, customer search)
    ShortFlowDone.tsx         -- terminal screen for the two short flows above
    Step4Property.tsx .. Step10Success.tsx  -- the guest-flow steps (Property, Stay, Guest, Commercials, Payment, Review, Success)
    StayCalendar.tsx           -- 2-month click/drag date-range calendar (Stay Details step)
    FieldBits.tsx              -- shared label/input/chip building blocks
```

## What's wired to real backend logic

| Area | Action used | Notes |
|---|---|---|
| Brands | `getAllBrands` | server-fetched in `page.tsx` |
| Commission booking sources | `getCommissionBookingSources` | Step 1's inline booking-source cards match the design's real 3-item list -- Direct, Owner Referral, Third Party Travel Agent. "Owner Referral" has no dedicated backend `sourceKind` slot (the DB constrains it to `DIRECT`/`ASSISTED`/`OTA`/`CORPORATE`/`TRAVEL_AGENT`), so it's sent as `DIRECT`. Only "Third Party Travel Agent" reveals a detail sub-form (agent name/voucher/commission & settlement terms), matching the design -- Assisted/OTA/Corporate detail forms from the old taxonomy were removed since the design's own `SRC` data never reaches them. |
| Property list/search | `getAllPropertiesForSelector` | client-side load-all + filter, same pattern `PropertySelector` uses |
| Property availability & min-nights/peak rules | `getPropertyAvailability` | drives the Stay Details calendar's blocked/peak dates |
| Blocking reasons | `getBlockingReasonsForProperty` | real per-property reason list (shown as chip buttons), falls back to a generic list if the property isn't picked yet |
| Guest search | `searchCustomer` | Guest Details step, and the customer pickers in the OTA-logging and Blocking flows |
| Guest creation | `createCustomer` | same three places |
| Price quote | `calculateOfflineBookingQuote` | Commercials step -- live server quote, coupon codes, GST inclusive/exclusive toggle, night-by-night table (`daywiseBreakup`), itemized breakdown (`pricingSummary.breakdown`) |
| Manual price override (Commercials) | flows into `createBooking`'s `baseRentalAmountWithGst`/`rentalCharge` | the −/+ stepper is now a **real** override, not a preview -- editing it changes what's actually submitted, and the displayed total/profit-margin panel reflect the delta live |
| Draft save/resume | `saveReservationDraft` / `getReservationDraft` | "Save as Draft" button + `?draftId=` resume; mirrored to `localStorage` for same-tab reload resilience |
| Final creation | `createBooking` (guest flow **and** the new OTA-logging flow, with `reservationContext.sourceKind` set to `"OTA"`) / `createReservationPropertyBlock` (Blocking) | one per reservation type, on the last actionable step |
| Payment link | `sendBookingPaymentLink` (resend) + the `createBooking` `sendPaymentLink`/`createPendingBooking`/`deliveryChannels` flags | matches `CreateBookingEditor`'s existing pending-booking + payment-link pattern |
| Payment status polling | `getBookingById` | polled every 4s on the success screen while a payment link is pending |

## What's design-only / not backed by real logic yet

- **iCal-sync matching (OTA-logging flow)** -- there is no iCal/channel-
  manager integration in this codebase. The "Is this booking already synced
  on iCal?" question and its unmatched-bookings list use hardcoded sample
  data (`FAKE_FEED` in `OtaLoggingForm.tsx`), same as the design mock's own
  placeholder data. Picking "No" (or skipping straight to manual entry)
  uses real property/customer/date data throughout. Needs: a real
  channel-manager feed before the "Yes" branch can be trusted.
- **Profit & margin panel (Commercials)** -- illustrative only. The quote
  response has no cost-basis field, so cost is approximated client-side as
  60% of the (possibly overridden) base rate. Needs: the pricing API to
  expose an actual cost figure before this can be trusted for real margin
  decisions.
- **"Save quote" / "Share estimate" (Commercials)** -- "Save quote" is a
  local toast confirmation only (no dedicated persistence endpoint exists
  beyond the draft-save flow, which already covers this). "Share estimate"
  copies a plain-text summary to the clipboard -- both real, lightweight
  actions, not fake.
- **Success-screen actions**: "Send WhatsApp confirmation", "Send email
  confirmation", "Add to calendar" are stub buttons that toast "coming
  soon" -- there's no admin-triggerable endpoint for these today
  (notifications currently fire automatically server-side on booking
  creation, per the existing codebase). "Print confirmation" and "Copy
  booking link" are real (browser print / clipboard).
- **Command palette (Cmd/Ctrl+K) and full arrow-key calendar navigation**
  from the original mock were not carried over -- they add meaningful
  complexity for comparatively low value versus the rest of the flow. Basic
  keyboard shortcuts (Escape = back, Enter = advance/create) are implemented.
- **Property browser filters (Property Selection step)** -- area/type/
  capacity/budget filters and sort are real client-side filters over the
  real property list, but they use a hardcoded area/type list (matching the
  design's own hardcoded options) rather than deriving choices from actual
  property data. The list itself, and picking a property, is real. The
  **map view** is an intentional placeholder, exactly as the original
  design mock itself describes it ("stretch goal" / "drop real map tiles
  here"), though its area pins are computed from the real filtered property
  list's average rates.
- **Property card cover photos** -- intentionally placeholder (hatch
  pattern), same as the design mock's own literal "property photo" text.
  `getAllPropertiesForSelector()` (`/properties/admin/paginate`) is
  documented as returning only lightweight fields (id, name, code, area,
  city, etc.) with **no image field**, and no other property-listing
  endpoint in this API includes images either. The only source that returns
  an image is `getPropertyById()` (`/properties/admin/{id}/full`), a heavy
  full tab-edit payload (brand mappings, special dates, commission, stay
  details, gallery) not meant to be called once per visible card, and its
  response shape isn't documented (empty schema in `docs/api/openapi.json`)
  so the actual gallery/cover-image field path is unverified. Needs either a
  lightweight endpoint that includes a thumbnail URL, or confirmation of the
  `/full` response's gallery shape from a live call, before this can be
  wired up for real without guessing.
- **Property list is not brand-filtered server-side** -- `getAllPropertiesForSelector()`
  is called without a brand filter, matching how `PropertySelector`'s own
  `loadAllByDefault` path already behaves in this codebase.
- **Night-by-night table (Commercials)** reads `quote.daywiseBreakup`
  defensively (`date`/`rate`/`amount`/`price` field fallbacks) since the
  exact shape of that array wasn't confirmed against a live response.
- **B2B taxation block (Commercials)** -- GSTIN/company/city fields are
  collected and submitted (`taxType`/`gstin`/`billingCompanyName`/
  `billingCity` on `createBooking`'s form data) but the backend's actual
  handling of these fields for GST-invoice generation wasn't verified in
  this pass.

## Theming

The app's real dark-mode mechanism is Flowbite's `dark` class on `<html>`
(no React theme context, see `app/layout.tsx` + `ThemeModeScript`). The
design mock instead uses a `data-theme` attribute driving CSS custom
properties. Rather than bridge two theming systems that don't otherwise
coexist anywhere in this codebase, the wizard scopes its own tokens to its
own root (`.ibw-root[data-theme=...]`) and follows the app's navbar
dark-mode toggle, independent implementation -- the same choice already
made by `/admin/bookings/blocking/create`.

## Animations (GSAP)

`gsap` was already a dependency (`^3.15.0`) but unused elsewhere in the
booking-creation code; all usage here is net new (`gsapHelpers.ts`). Implemented,
matching the design mock 1:1:

- Step-panel slide/fade transition on every step change (direction-aware).
- Stagger-in reveal for card grids/lists (type cards, purpose cards, source
  cards, property cards, pricing rows, night-rate bars).
- Animated ₹ count-up/down for the Commercials tiles, the sidebar running
  total, and the payment-progress donut.
- Sidebar rail value "flash" when a summary value changes.
- Success-screen checkmark pop-in (`back.out` easing).
- New-payment-row reveal animation when "+ Add another payment" is pressed.
- Commercials' "↺ Reset to rack" button: bouncy pop-in + a 2-repeat pulsing
  ring, plus the reset icon spin-in.
- Toast slide-up entrance.

Every animation degrades to an instant, correct DOM state if GSAP fails to
load, matching the original mock's own `if (window.gsap)` guards.

## Known gaps / suggested next pass

1. Wire a real iCal/channel-manager feed for the OTA-logging flow's
   "synced already?" matching UI.
2. Expose a real cost basis from the pricing API for a trustworthy Commercials
   margin panel.
3. Confirm `daywiseBreakup`'s exact field names against a live quote
   response and tighten the defensive field-reading in `Step7Commercials.tsx`.
4. Decide on brand-scoped property search once the property endpoint's
   brand-filter contract is confirmed.
5. Verify the backend actually applies `taxType`/`gstin`/`billingCompanyName`/
   `billingCity` for B2B GST invoicing -- confirm the field names match what
   `createBooking`'s handler expects.
6. Consider extracting `StayCalendar.tsx` into a shared component -- this
   codebase already has multiple near-duplicate bespoke calendars
   (`CreateBookingEditor.tsx`'s `BookingStayCalendar`, `CreateBlockingEditor.tsx`'s
   inline calendar, and now `PropertyBlockForm.tsx`'s own); worth unifying.
