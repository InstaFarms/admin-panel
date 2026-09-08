"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button, Select, Spinner, TextInput } from "flowbite-react";
import { HiCheckCircle } from "react-icons/hi";
import { createAdmin, editAdmin } from "@/actions/adminActions";
import { PHONE_LENGTH } from "@/constants/auth";
import { FIELD_EMAIL, FIELD_FIRST_NAME, FIELD_LAST_NAME, FIELD_PHONE } from "@/constants/admin";
import { useAdminEditorFormContext } from "./AdminEditorFormContext";
import AdminEditorSkeleton from "./AdminEditorSkeleton";
import { parseServerActionResult } from "@/utils/utils";
import type { Gender } from "@/utils/types";
import { AnimatedFieldError } from "@/components/ui/AnimatedFieldError";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { prefersReducedMotion, pulseRing } from "@/lib/motion";
import { staggerReveal, popCheck } from "@/components/bookings/wizard/gsapHelpers";

interface AdminProfileInlineEditorProps {
  adminId?: string;
  canEdit?: boolean;
  canManageRole?: boolean;
  formId?: string;
}

function SectionCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-300">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldBlock({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-200">{label}</label>
      </div>
      {children}
      {error ? <AnimatedFieldError>{error}</AnimatedFieldError> : null}
      {!error && hint ? <p className="text-sm text-gray-500 dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}

const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: "Male", label: "Male", icon: "♂" },
  { value: "Female", label: "Female", icon: "♀" },
  { value: "Other", label: "Other", icon: "⚥" },
];

function GenderPicker({
  value,
  onChange,
  disabled,
}: {
  value: Gender | "";
  onChange: (next: Gender | "") => void;
  disabled?: boolean;
}) {
  return (
    <>
      <SegmentedControl<Gender>
        ariaLabel="Gender"
        options={GENDER_OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowClear
      />
      <input type="hidden" name="gender" value={value} />
    </>
  );
}

const INPUT_CLASS =
  "[&_input]:rounded-xl [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-gray-900 [&_input]:placeholder-slate-400 [&_input]:shadow-sm dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800/80 dark:[&_input]:text-white dark:[&_input]:placeholder-slate-500";

const SELECT_CLASS =
  "[&_select]:rounded-xl [&_select]:border-slate-300 [&_select]:bg-white [&_select]:text-gray-900 [&_select]:shadow-sm dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800/80 dark:[&_select]:text-white";

function PhoneStatusHint({ status }: { status: "idle" | "checking" | "available" | "taken" }) {
  const checkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (status === "available" && checkRef.current) {
      popCheck(checkRef.current);
    }
  }, [status]);

  if (status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-300">
        <Spinner size="sm" /> Checking availability…
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
        <span ref={checkRef} className="inline-flex">
          <HiCheckCircle className="h-4 w-4" />
        </span>
        This number is available.
      </p>
    );
  }
  return null;
}

export default function AdminProfileInlineEditor({
  adminId,
  canEdit = true,
  canManageRole = true,
  formId = "admin-profile-inline-editor-form",
}: AdminProfileInlineEditorProps) {
  const {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    panelRole,
    setPanelRole,
    gender,
    setGender,
    whatsappNumber,
    setWhatsappNumber,
    alternateContact,
    setAlternateContact,
    addressFields,
    panelRoleOptions,
    fetchLoading,
    errors,
    isEditMode,
    adminData,
    phoneStatus,
    focusRequestToken,
    focusFieldId,
    handleFieldChange,
    updateAddressField,
    handleSubmit,
    applyWhatsappFromContact,
  } = useAdminEditorFormContext();

  const gridRef = useRef<HTMLDivElement>(null);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const didRevealRef = useRef(false);

  // Stagger the section cards in once, on first mount.
  useEffect(() => {
    if (didRevealRef.current || !gridRef.current) return;
    didRevealRef.current = true;
    staggerReveal(gridRef.current);
  }, []);

  // Scroll to + focus the first invalid field when a submit is blocked.
  useEffect(() => {
    if (!focusRequestToken || !focusFieldId) return;
    const el = document.getElementById(focusFieldId);
    if (!el) return;
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    (el as HTMLElement).focus({ preventScroll: true });
  }, [focusRequestToken, focusFieldId]);

  const onSubmit = async (formData: FormData) => {
    if (isEditMode && adminId) {
      return parseServerActionResult(editAdmin.bind(null, adminId)(formData));
    }

    return parseServerActionResult(createAdmin(formData));
  };

  const applyWhatsapp = (source: "primary" | "alternate") => {
    applyWhatsappFromContact(source);
    pulseRing(whatsappInputRef.current);
  };

  if (fetchLoading) {
    return <AdminEditorSkeleton />;
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canEdit) return;
        handleSubmit(onSubmit);
      }}
      className="space-y-4"
    >
      <div ref={gridRef} className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Core Identity"
          subtitle="Update the admin's primary identity and contact information."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldBlock label="First Name" error={errors[FIELD_FIRST_NAME]}>
              <TextInput
                id={FIELD_FIRST_NAME}
                name={FIELD_FIRST_NAME}
                type="text"
                value={firstName}
                onChange={(e) => handleFieldChange(FIELD_FIRST_NAME, e.target.value, setFirstName)}
                color={errors[FIELD_FIRST_NAME] ? "failure" : undefined}
                disabled={!canEdit}
                className={INPUT_CLASS}
              />
            </FieldBlock>

            <FieldBlock label="Last Name" error={errors[FIELD_LAST_NAME]}>
              <TextInput
                id={FIELD_LAST_NAME}
                name={FIELD_LAST_NAME}
                type="text"
                value={lastName}
                onChange={(e) => handleFieldChange(FIELD_LAST_NAME, e.target.value, setLastName)}
                color={errors[FIELD_LAST_NAME] ? "failure" : undefined}
                disabled={!canEdit}
                className={INPUT_CLASS}
              />
            </FieldBlock>

            <div className="md:col-span-2">
              <FieldBlock
                label="Email"
                hint="Email is used as the login identity and can't be changed from this screen."
                error={errors[FIELD_EMAIL]}
              >
                <TextInput
                  id={FIELD_EMAIL}
                  name={FIELD_EMAIL}
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange(FIELD_EMAIL, e.target.value, setEmail)}
                  color={errors[FIELD_EMAIL] ? "failure" : undefined}
                  disabled={isEditMode || !canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>
            </div>

            <FieldBlock label="Primary Phone Number" error={errors[FIELD_PHONE]}>
              <TextInput
                id={FIELD_PHONE}
                name={FIELD_PHONE}
                type="tel"
                inputMode="numeric"
                placeholder="10 digit number"
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
                  handleFieldChange(FIELD_PHONE, digits, setPhoneNumber);
                }}
                color={errors[FIELD_PHONE] ? "failure" : undefined}
                disabled={!canEdit}
                className={INPUT_CLASS}
              />
              {!errors[FIELD_PHONE] &&
              phoneNumber.trim() !== (adminData?.phoneNumber ?? "").trim() ? (
                <PhoneStatusHint status={phoneStatus} />
              ) : null}
            </FieldBlock>

            <FieldBlock
              label="WhatsApp Number"
              hint="Use the primary or alternate contact number if WhatsApp is linked to it."
              error={errors.whatsappNumber}
            >
              <div className="space-y-3">
                <TextInput
                  ref={whatsappInputRef}
                  id="whatsappNumber"
                  name="whatsappNumber"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10 digit number"
                  value={whatsappNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
                    handleFieldChange("whatsappNumber", digits, setWhatsappNumber);
                  }}
                  color={errors.whatsappNumber ? "failure" : undefined}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />

                {phoneNumber.trim() || alternateContact.trim() ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      color="light"
                      pill
                      size="xs"
                      disabled={!canEdit || !phoneNumber.trim()}
                      onClick={() => applyWhatsapp("primary")}
                    >
                      Use Primary Number
                    </Button>
                    <Button
                      type="button"
                      color="light"
                      pill
                      size="xs"
                      disabled={!canEdit || !alternateContact.trim()}
                      onClick={() => applyWhatsapp("alternate")}
                    >
                      Use Alternate Contact
                    </Button>
                  </div>
                ) : null}
              </div>
            </FieldBlock>

            <div className="md:col-span-2">
              <FieldBlock label="Alternate Contact" error={errors.alternateContact}>
                <TextInput
                  id="alternateContact"
                  name="alternateContact"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10 digit number"
                  value={alternateContact}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
                    handleFieldChange("alternateContact", digits, setAlternateContact);
                  }}
                  color={errors.alternateContact ? "failure" : undefined}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Role & Metadata" subtitle="Set access role and optional profile metadata.">
            <div className="grid grid-cols-1 gap-4">
              <FieldBlock
                label="Panel Role"
                hint={!canManageRole ? "Only Super Admin can change panel roles." : undefined}
              >
                <Select
                  id="panelRole"
                  name="panelRole"
                  value={panelRole}
                  onChange={(e) => setPanelRole(e.target.value as typeof panelRole)}
                  disabled={!canEdit || !canManageRole}
                  className={SELECT_CLASS}
                >
                  {panelRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </FieldBlock>

              <FieldBlock
                label="Gender"
                hint="Optional — tap the selected option again to clear it."
              >
                <GenderPicker value={gender} onChange={setGender} disabled={!canEdit} />
              </FieldBlock>
            </div>
          </SectionCard>

          <SectionCard
            title="Address"
            subtitle="Optional details that can be added later if needed."
            badge={
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Optional
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldBlock label="Street Address">
                  <TextInput
                    id="address-line1"
                    type="text"
                    placeholder="Street address"
                    value={addressFields.line1}
                    onChange={(e) => updateAddressField("line1", e.target.value)}
                    disabled={!canEdit}
                    className={INPUT_CLASS}
                  />
                </FieldBlock>
              </div>

              <FieldBlock label="City">
                <TextInput
                  id="address-city"
                  type="text"
                  placeholder="City"
                  value={addressFields.city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>

              <FieldBlock label="State">
                <TextInput
                  id="address-state"
                  type="text"
                  placeholder="State"
                  value={addressFields.state}
                  onChange={(e) => updateAddressField("state", e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>

              <FieldBlock label="Country">
                <TextInput
                  id="address-country"
                  type="text"
                  placeholder="Country"
                  value={addressFields.country}
                  onChange={(e) => updateAddressField("country", e.target.value)}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>

              <FieldBlock label="Zip Code">
                <TextInput
                  id="address-pincode"
                  type="text"
                  inputMode="numeric"
                  placeholder="Zip code"
                  value={addressFields.pincode}
                  onChange={(e) => updateAddressField("pincode", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  disabled={!canEdit}
                  className={INPUT_CLASS}
                />
              </FieldBlock>
            </div>
          </SectionCard>
        </div>
      </div>
    </form>
  );
}
