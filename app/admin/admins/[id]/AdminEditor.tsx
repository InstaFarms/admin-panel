"use client";

import { Label, Select, Textarea, TextInput } from "flowbite-react";
import MyButton from "@/components/MyButton";
import DeleteAdminButton from "../DeleteAdminButton";
import { useAdminEditorForm } from "@/hooks/useAdminEditorForm";
import { createAdmin, editAdmin } from "@/actions/adminActions";
import { parseServerActionResult } from "@/utils/utils";
import { PHONE_LENGTH } from "@/constants/auth";
import {
  ADMIN_FORM_ID,
  FIELD_FIRST_NAME,
  FIELD_LAST_NAME,
  FIELD_EMAIL,
  FIELD_PHONE,
} from "@/constants/admin";

export interface AdminEditorProps {
  adminId?: string;
  canEdit?: boolean;
  canManageRole?: boolean;
}

export default function AdminEditor({
  adminId,
  canEdit = true,
  canManageRole = true,
}: AdminEditorProps) {
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
    genderOptions,
    loading,
    fetchLoading,
    errors,
    isEditMode,
    handleFieldChange,
    updateAddressField,
    handleSubmit,
  } = useAdminEditorForm(adminId);

  const onSubmit = async (formData: FormData) => {
    if (isEditMode && adminId) {
      return parseServerActionResult(editAdmin.bind(null, adminId)(formData));
    }
    return parseServerActionResult(createAdmin(formData));
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading admin data...</div>
      </div>
    );
  }

  return (
    <form
      id={ADMIN_FORM_ID}
      className="mx-auto w-full max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canEdit) return;
        handleSubmit(onSubmit);
      }}
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 block">
            <Label htmlFor={FIELD_FIRST_NAME}>
              Admin First Name <span className="text-red-600">*</span>
            </Label>
          </div>
          <TextInput
            id={FIELD_FIRST_NAME}
            name={FIELD_FIRST_NAME}
            type="text"
            placeholder="Enter First Name"
            required
            value={firstName}
            onChange={(e) =>
              handleFieldChange(FIELD_FIRST_NAME, e.target.value, setFirstName)
            }
            color={errors[FIELD_FIRST_NAME] ? "failure" : undefined}
            disabled={!canEdit}
          />
          {errors[FIELD_FIRST_NAME] && (
            <p className="mt-1 text-sm text-red-600">{errors[FIELD_FIRST_NAME]}</p>
          )}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor={FIELD_LAST_NAME}>Admin Last Name</Label>
          </div>
          <TextInput
            id={FIELD_LAST_NAME}
            name={FIELD_LAST_NAME}
            type="text"
            placeholder="Enter Last Name"
            value={lastName}
            onChange={(e) =>
              handleFieldChange(FIELD_LAST_NAME, e.target.value, setLastName)
            }
            color={errors[FIELD_LAST_NAME] ? "failure" : undefined}
            disabled={!canEdit}
          />
          {errors[FIELD_LAST_NAME] && (
            <p className="mt-1 text-sm text-red-600">{errors[FIELD_LAST_NAME]}</p>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="panelRole">Panel Role</Label>
          </div>
          <Select
            id="panelRole"
            name="panelRole"
            value={panelRole}
            onChange={(e) => setPanelRole(e.target.value as typeof panelRole)}
            disabled={!canEdit || !canManageRole}
          >
            {panelRoleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          {!canManageRole ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only Super Admin can change panel roles.
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="gender">Gender</Label>
          </div>
          <Select
            id="gender"
            name="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as typeof gender)}
            disabled={!canEdit}
          >
            <option value="">Select gender</option>
            {genderOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 block">
            <Label htmlFor={FIELD_EMAIL}>
              Admin Email <span className="text-red-600">*</span>
            </Label>
          </div>
          <TextInput
            id={FIELD_EMAIL}
            name={FIELD_EMAIL}
            type="email"
            placeholder="Enter email"
            required
            value={email}
            onChange={(e) =>
              handleFieldChange(FIELD_EMAIL, e.target.value, setEmail)
            }
            color={errors[FIELD_EMAIL] ? "failure" : undefined}
            disabled={isEditMode || !canEdit}
          />
          {errors[FIELD_EMAIL] && (
            <p className="mt-1 text-sm text-red-600">{errors[FIELD_EMAIL]}</p>
          )}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor={FIELD_PHONE}>
              Admin Phone Number <span className="text-red-600">*</span>
            </Label>
          </div>
          <TextInput
            id={FIELD_PHONE}
            name={FIELD_PHONE}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter Phone Number (10 digits)"
            required
            value={phoneNumber}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
              handleFieldChange(FIELD_PHONE, digits, setPhoneNumber);
            }}
            color={errors[FIELD_PHONE] ? "failure" : undefined}
            disabled={!canEdit}
          />
          {errors[FIELD_PHONE] && (
            <p className="mt-1 text-sm text-red-600">{errors[FIELD_PHONE]}</p>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
          </div>
          <TextInput
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter WhatsApp Number (10 digits)"
            value={whatsappNumber}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
              handleFieldChange("whatsappNumber", digits, setWhatsappNumber);
            }}
            color={errors.whatsappNumber ? "failure" : undefined}
            disabled={!canEdit}
          />
          {errors.whatsappNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.whatsappNumber}</p>
          )}
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="alternateContact">Alternate Contact</Label>
          </div>
          <TextInput
            id="alternateContact"
            name="alternateContact"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter Alternate Contact (10 digits)"
            value={alternateContact}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
              handleFieldChange("alternateContact", digits, setAlternateContact);
            }}
            color={errors.alternateContact ? "failure" : undefined}
            disabled={!canEdit}
          />
          {errors.alternateContact && (
            <p className="mt-1 text-sm text-red-600">{errors.alternateContact}</p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h6 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          Address Details
        </h6>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-2 block">
              <Label htmlFor="address-line1">Address Line 1</Label>
            </div>
            <Textarea
              id="address-line1"
              rows={2}
              placeholder="House number, street, locality"
              value={addressFields.line1}
              onChange={(e) => updateAddressField("line1", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 block">
              <Label htmlFor="address-line2">Address Line 2</Label>
            </div>
            <Textarea
              id="address-line2"
              rows={2}
              placeholder="Apartment, floor, additional directions"
              value={addressFields.line2}
              onChange={(e) => updateAddressField("line2", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="address-landmark">Landmark</Label>
            </div>
            <TextInput
              id="address-landmark"
              type="text"
              placeholder="Nearby landmark"
              value={addressFields.landmark}
              onChange={(e) => updateAddressField("landmark", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="address-city">City</Label>
            </div>
            <TextInput
              id="address-city"
              type="text"
              placeholder="City"
              value={addressFields.city}
              onChange={(e) => updateAddressField("city", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="address-state">State</Label>
            </div>
            <TextInput
              id="address-state"
              type="text"
              placeholder="State"
              value={addressFields.state}
              onChange={(e) => updateAddressField("state", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="address-country">Country</Label>
            </div>
            <TextInput
              id="address-country"
              type="text"
              placeholder="Country"
              value={addressFields.country}
              onChange={(e) => updateAddressField("country", e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="address-pincode">Pincode</Label>
            </div>
            <TextInput
              id="address-pincode"
              type="text"
              inputMode="numeric"
              placeholder="Pincode"
              value={addressFields.pincode}
              onChange={(e) =>
                updateAddressField("pincode", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <MyButton loading={loading} type="submit" disabled={!canEdit}>
          {loading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Admin"
              : "Create Admin"}
        </MyButton>
        {isEditMode && adminId && canEdit && (
          <div onClick={(e) => e.preventDefault()}>
            <DeleteAdminButton id={adminId} />
          </div>
        )}
      </div>
    </form>
  );
}
