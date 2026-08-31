"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Admin, genderOptions, type Gender } from "@/utils/types";
import { adminPanelRoleOptions, type AdminPanelRole } from "@repo/db/types";
import { EMAIL_REGEX, PHONE_LENGTH } from "@/constants/auth";
import {
  FIELD_FIRST_NAME,
  FIELD_LAST_NAME,
  FIELD_EMAIL,
  FIELD_PHONE,
  VALIDATION_MESSAGES,
  TOAST_MESSAGES,
} from "@/constants/admin";
import { checkAdminPhoneAvailability, getAdminById } from "@/actions/adminActions";
import { useDebouncedCallback } from "@/utils/debounce";

interface FieldErrors {
  [key: string]: string;
}

const FIELD_WHATSAPP = "whatsappNumber";
const FIELD_ALTERNATE_CONTACT = "alternateContact";
const DUPLICATE_PHONE_ERROR = "This number is already used by another admin. Please add a different number.";
const DUPLICATE_EMAIL_ERROR = "Email is already assigned to another admin.";
const DISTINCT_CONTACT_ERROR = "Alternate contact cannot be the same as primary phone number";

type AddressFieldKey =
  | "line1"
  | "line2"
  | "landmark"
  | "city"
  | "state"
  | "country"
  | "pincode";

export interface AddressFields {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

const EMPTY_ADDRESS_FIELDS: AddressFields = {
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

function getAddressValue(
  address: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  if (!address || typeof address !== "object") return "";

  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function mapAddressDetailsToFields(
  address: Record<string, unknown> | null | undefined,
): AddressFields {
  return {
    line1: getAddressValue(address, ["line1", "addressLine1", "address1", "street", "fullAddress"]),
    line2: getAddressValue(address, ["line2", "addressLine2", "address2"]),
    landmark: getAddressValue(address, ["landmark"]),
    city: getAddressValue(address, ["city"]),
    state: getAddressValue(address, ["state", "stateName"]),
    country: getAddressValue(address, ["country"]),
    pincode: getAddressValue(address, ["pincode", "pinCode", "postalCode", "zipCode"]),
  };
}

export type PhoneStatus = "idle" | "checking" | "available" | "taken";

/** Field ids, in the visual order used to pick the first invalid one to focus. */
const FIELD_ORDER = [
  FIELD_FIRST_NAME,
  FIELD_LAST_NAME,
  FIELD_EMAIL,
  FIELD_PHONE,
  FIELD_WHATSAPP,
  FIELD_ALTERNATE_CONTACT,
] as const;

export function useAdminEditorForm(
  adminId?: string,
  options?: { canManageRole?: boolean; initialAdmin?: Admin | null }
) {
  const router = useRouter();
  const canManageRole = options?.canManageRole ?? false;
  const initialAdmin = options?.initialAdmin ?? null;

  // Form fields - seeded synchronously from initialAdmin (passed by the page's
  // server component) so edit mode never has to re-fetch what the page already
  // loaded.
  const [firstName, setFirstName] = useState(() => initialAdmin?.firstName || "");
  const [lastName, setLastName] = useState(() => initialAdmin?.lastName || "");
  const [email, setEmail] = useState(() => initialAdmin?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(() => initialAdmin?.phoneNumber || "");
  const [panelRole, setPanelRole] = useState<AdminPanelRole>(
    () => (initialAdmin?.panelRole as AdminPanelRole) || "OPS_TEAM"
  );
  const [gender, setGender] = useState<Gender | "">(
    () => (initialAdmin?.gender as Gender) || ""
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    () => initialAdmin?.whatsappNumber || ""
  );
  const [alternateContact, setAlternateContact] = useState(
    () => initialAdmin?.alternateContact || ""
  );
  const [addressFields, setAddressFields] = useState<AddressFields>(() =>
    initialAdmin ? mapAddressDetailsToFields(initialAdmin.addressDetails) : EMPTY_ADDRESS_FIELDS
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [adminData, setAdminData] = useState<Admin | null>(() => initialAdmin);
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  // Bumped when a submit is blocked by validation - the submit button shakes on
  // change, and the editor scrolls/focuses the first invalid field.
  const [validationFailToken, setValidationFailToken] = useState(0);
  const [focusRequestToken, setFocusRequestToken] = useState(0);
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  const isEditMode = !!adminId;

  // Fetch admin data in edit mode - only as a fallback when the caller did not
  // hand us the already-loaded admin (initialAdmin).
  useEffect(() => {
    if (!adminId || initialAdmin) return;

    const fetchAdmin = async () => {
      setFetchLoading(true);
      try {
        const data = await getAdminById(adminId);
        if (data) {
          setAdminData(data);
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setEmail(data.email || "");
          setPhoneNumber(data.phoneNumber || "");
          setPanelRole((data.panelRole as AdminPanelRole) || "OPS_TEAM");
          setGender((data.gender as Gender) || "");
          setWhatsappNumber(data.whatsappNumber || "");
          setAlternateContact(data.alternateContact || "");
          setAddressFields(mapAddressDetailsToFields(data.addressDetails));
        }
      } catch (error) {
        console.error("Error fetching admin:", error);
        toast.error("Failed to load admin data");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  // Validation helpers
  const nameStartsWithNumber = (value: string): boolean => {
    const trimmed = value.trim();
    return trimmed.length > 0 && /^\d/.test(trimmed);
  };

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (nameStartsWithNumber(value)) {
      return VALIDATION_MESSAGES.NAME_STARTS_WITH_NUMBER;
    }
    // Allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      return VALIDATION_MESSAGES.NAME_INVALID_CHARS;
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed) return VALIDATION_MESSAGES.EMAIL_REQUIRED;
    if (nameStartsWithNumber(trimmed)) {
      return VALIDATION_MESSAGES.EMAIL_STARTS_WITH_NUMBER;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return VALIDATION_MESSAGES.EMAIL_INVALID;
    }
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    const trimmed = phone.trim();
    if (!trimmed) return VALIDATION_MESSAGES.PHONE_REQUIRED;
    if (/[a-zA-Z]/.test(trimmed)) {
      return VALIDATION_MESSAGES.PHONE_LETTERS;
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length !== PHONE_LENGTH) {
      return VALIDATION_MESSAGES.PHONE_FORMAT;
    }
    if (digits.startsWith("0")) {
      return VALIDATION_MESSAGES.PHONE_STARTS_WITH_ZERO;
    }
    return null;
  };

  const validateOptionalPhone = (phone: string): string | null => {
    const trimmed = phone.trim();
    if (!trimmed) return null;
    if (/[a-zA-Z]/.test(trimmed)) {
      return VALIDATION_MESSAGES.PHONE_LETTERS;
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length !== PHONE_LENGTH) {
      return VALIDATION_MESSAGES.PHONE_FORMAT;
    }
    if (digits.startsWith("0")) {
      return VALIDATION_MESSAGES.PHONE_STARTS_WITH_ZERO;
    }
    return null;
  };

  const validateDistinctContactNumbers = (
    primaryPhone: string,
    alternatePhone: string,
  ): string | null => {
    const primaryDigits = primaryPhone.trim().replace(/\D/g, "");
    const alternateDigits = alternatePhone.trim().replace(/\D/g, "");

    if (!primaryDigits || !alternateDigits) return null;
    if (primaryDigits === alternateDigits) {
      return DISTINCT_CONTACT_ERROR;
    }

    return null;
  };

  const applyWhatsappFromContact = (source: "primary" | "alternate") => {
    const nextWhatsappNumber =
      source === "primary" ? phoneNumber.trim() : alternateContact.trim();

    setWhatsappNumber(nextWhatsappNumber);

    setErrors((prev) => {
      const next = { ...prev };
      const whatsappError = validateOptionalPhone(nextWhatsappNumber);

      if (whatsappError) {
        next[FIELD_WHATSAPP] = whatsappError;
      } else {
        delete next[FIELD_WHATSAPP];
      }

      return next;
    });
  };

  // Field-level validation on change
  const handleFieldChange = (
    field: string,
    value: string,
    setter: (value: string) => void
  ) => {
    setter(value);

    let error: string | null = null;
    let nextPrimaryPhone = phoneNumber;
    let nextAlternateContact = alternateContact;

    if (field === FIELD_PHONE) {
      nextPrimaryPhone = value;
    }
    if (field === FIELD_ALTERNATE_CONTACT) {
      nextAlternateContact = value;
    }

    switch (field) {
      case FIELD_FIRST_NAME:
      case FIELD_LAST_NAME:
        error = validateName(value);
        break;
      case FIELD_EMAIL:
        // Only show email errors after user stops typing
        if (value.trim().length > 0) {
          error = validateEmail(value);
        }
        break;
      case FIELD_PHONE:
        if (value.trim().length > 0) {
          error = validatePhone(value);
        }
        break;
      case FIELD_WHATSAPP:
      case FIELD_ALTERNATE_CONTACT:
        if (value.trim().length > 0) {
          error = validateOptionalPhone(value);
        }
        break;
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }

      const distinctNumberError = validateDistinctContactNumbers(
        nextPrimaryPhone,
        nextAlternateContact,
      );

      if (distinctNumberError) {
        next[FIELD_PHONE] = distinctNumberError;
        next[FIELD_ALTERNATE_CONTACT] = distinctNumberError;
      } else {
        if (next[FIELD_PHONE] === DISTINCT_CONTACT_ERROR) {
          delete next[FIELD_PHONE];
        }
        if (next[FIELD_ALTERNATE_CONTACT] === DISTINCT_CONTACT_ERROR) {
          delete next[FIELD_ALTERNATE_CONTACT];
        }
      }

      return next;
    });
  };

  const verifyPrimaryPhoneAvailability = useDebouncedCallback(
    async (digits: string, currentAdminId?: string) => {
      try {
        const isAvailable = await checkAdminPhoneAvailability(digits, currentAdminId);

        const stale = phoneNumber.trim().replace(/\D/g, "") !== digits;
        if (!stale) {
          setPhoneStatus(isAvailable ? "available" : "taken");
        }

        setErrors((prev) => {
          const latestDigits = phoneNumber.trim().replace(/\D/g, "");
          if (latestDigits !== digits) {
            return prev;
          }

          const next = { ...prev };

          if (!isAvailable) {
            next[FIELD_PHONE] = DUPLICATE_PHONE_ERROR;
          } else if (next[FIELD_PHONE] === DUPLICATE_PHONE_ERROR) {
            delete next[FIELD_PHONE];
          }

          const distinctNumberError = validateDistinctContactNumbers(
            digits,
            alternateContact,
          );

          if (distinctNumberError) {
            next[FIELD_PHONE] = distinctNumberError;
            next[FIELD_ALTERNATE_CONTACT] = distinctNumberError;
          } else {
            if (next[FIELD_ALTERNATE_CONTACT] === DISTINCT_CONTACT_ERROR) {
              delete next[FIELD_ALTERNATE_CONTACT];
            }
            if (isAvailable && next[FIELD_PHONE] === DISTINCT_CONTACT_ERROR) {
              delete next[FIELD_PHONE];
            }
          }

          return next;
        });
      } catch (error) {
        console.error("Phone availability check failed:", error);
        setPhoneStatus("idle");
      }
    },
    400,
  );

  useEffect(() => {
    const digits = phoneNumber.trim().replace(/\D/g, "");

    if (!digits || digits.length !== PHONE_LENGTH) {
      verifyPrimaryPhoneAvailability.cancel();
      setPhoneStatus("idle");
      setErrors((prev) => {
        if (prev[FIELD_PHONE] !== DUPLICATE_PHONE_ERROR) {
          return prev;
        }

        const next = { ...prev };
        delete next[FIELD_PHONE];
        return next;
      });
      return;
    }

    if (validatePhone(digits)) {
      verifyPrimaryPhoneAvailability.cancel();
      setPhoneStatus("idle");
      return;
    }

    setPhoneStatus("checking");
    verifyPrimaryPhoneAvailability(digits, adminId);

    return () => {
      verifyPrimaryPhoneAvailability.cancel();
    };
  }, [phoneNumber, adminId, verifyPrimaryPhoneAvailability]);

  // Form validation before submit. Returns the errors map (empty === valid) so
  // the caller can also pick the first invalid field to focus.
  const validateForm = (): FieldErrors => {
    const newErrors: FieldErrors = {};

    // First name
    if (!firstName.trim()) {
      newErrors[FIELD_FIRST_NAME] = VALIDATION_MESSAGES.FIRST_NAME_REQUIRED;
    } else {
      const nameError = validateName(firstName);
      if (nameError) newErrors[FIELD_FIRST_NAME] = nameError;
    }

    // Last name
    if (lastName.trim()) {
      const nameError = validateName(lastName);
      if (nameError) newErrors[FIELD_LAST_NAME] = nameError;
    }

    // Email
    const emailError = validateEmail(email);
    if (emailError) newErrors[FIELD_EMAIL] = emailError;

    // Phone
    const phoneError = validatePhone(phoneNumber);
    if (phoneError) newErrors[FIELD_PHONE] = phoneError;

    // Optional contact numbers
    const whatsappError = validateOptionalPhone(whatsappNumber);
    if (whatsappError) newErrors[FIELD_WHATSAPP] = whatsappError;

    const alternateContactError = validateOptionalPhone(alternateContact);
    if (alternateContactError) newErrors[FIELD_ALTERNATE_CONTACT] = alternateContactError;

      const distinctNumberError = validateDistinctContactNumbers(phoneNumber, alternateContact);
      if (distinctNumberError) {
        newErrors[FIELD_PHONE] = distinctNumberError;
        newErrors[FIELD_ALTERNATE_CONTACT] = distinctNumberError;
      }

    setErrors(newErrors);
    return newErrors;
  };

  // Form submission
  const handleSubmit = async (submitFn: (formData: FormData) => Promise<any>) => {
    if (loading) return; // re-entry guard - blocks double submit

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      toast.error(TOAST_MESSAGES.FILL_REQUIRED);
      setValidationFailToken((n) => n + 1);
      const firstInvalid = FIELD_ORDER.find((id) => validationErrors[id]);
      if (firstInvalid) {
        setFocusFieldId(firstInvalid);
        setFocusRequestToken((n) => n + 1);
      }
      return;
    }

    setLoading(true);
    setPhoneStatus("checking");

    const runSubmit = async () => {
      const normalizedPhoneNumber = phoneNumber.trim().replace(/\D/g, "");
      const isPhoneAvailable = await checkAdminPhoneAvailability(normalizedPhoneNumber, adminId);

      if (!isPhoneAvailable) {
        setPhoneStatus("taken");
        setErrors((prev) => ({
          ...prev,
          [FIELD_PHONE]: DUPLICATE_PHONE_ERROR,
        }));
        throw new Error(DUPLICATE_PHONE_ERROR);
      }
      setPhoneStatus("available");

      const formData = new FormData();
      formData.set(FIELD_FIRST_NAME, firstName.trim());
      formData.set(FIELD_LAST_NAME, lastName.trim());
      formData.set(FIELD_EMAIL, email.trim());
      formData.set(FIELD_PHONE, normalizedPhoneNumber);
      // Only send panelRole when the caller can actually change roles, or when a
      // role-manager genuinely changed it. Sending it unconditionally makes the
      // backend 403 every non-super save ("Only Super Admin can change ... role").
      const roleChanged = isEditMode
        ? adminData?.panelRole !== undefined && panelRole !== adminData.panelRole
        : panelRole !== "OPS_TEAM";
      if (canManageRole || roleChanged) {
        formData.set("panelRole", panelRole);
      }
      if (gender) {
        formData.set("gender", gender);
      }
      if (whatsappNumber.trim()) {
        formData.set("whatsappNumber", whatsappNumber.trim().replace(/\D/g, ""));
      }
      if (alternateContact.trim()) {
        formData.set("alternateContact", alternateContact.trim().replace(/\D/g, ""));
      }

      const existingAddressDetails =
        adminData?.addressDetails && typeof adminData.addressDetails === "object"
          ? adminData.addressDetails
          : {};
      const nextAddressDetails = {
        ...existingAddressDetails,
        line1: addressFields.line1.trim(),
        line2: addressFields.line2.trim(),
        landmark: addressFields.landmark.trim(),
        city: addressFields.city.trim(),
        state: addressFields.state.trim(),
        country: addressFields.country.trim(),
        pincode: addressFields.pincode.trim(),
      };
      const compactAddressDetails = Object.fromEntries(
        Object.entries(nextAddressDetails).filter(([, value]) => {
          if (value === null || value === undefined) return false;
          if (typeof value === "string") return value.trim().length > 0;
          return true;
        }),
      );
      if (Object.keys(compactAddressDetails).length > 0) {
        formData.set("addressDetails", JSON.stringify(compactAddressDetails));
      }

      await submitFn(formData);

      if (isEditMode && adminId) {
        router.push(`/admin/admins/${adminId}`);
      } else {
        router.push("/admin/admins");
      }
    };

    try {
      await toast.promise(runSubmit(), {
        loading: TOAST_MESSAGES.SAVING,
        success: () => (isEditMode ? TOAST_MESSAGES.UPDATED : TOAST_MESSAGES.CREATED),
        error: (err) => (err instanceof Error ? err.message : TOAST_MESSAGES.ERROR),
      });
    } catch (error) {
      console.error("Submit error:", error);
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.ERROR;

      setErrors((prev) => {
        const next = { ...prev };

        if (message === DUPLICATE_PHONE_ERROR) {
          next[FIELD_PHONE] = DUPLICATE_PHONE_ERROR;
        }

        if (message === DUPLICATE_EMAIL_ERROR) {
          next[FIELD_EMAIL] = DUPLICATE_EMAIL_ERROR;
        }

        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    // Form fields
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
    setAddressFields,
    panelRoleOptions: adminPanelRoleOptions,
    genderOptions,

    // State
    loading,
    fetchLoading,
    errors,
    adminData,
    isEditMode,
    phoneStatus,
    validationFailToken,
    focusRequestToken,
    focusFieldId,

    // Methods
    handleFieldChange,
    updateAddressField: (field: AddressFieldKey, value: string) =>
      setAddressFields((prev) => ({ ...prev, [field]: value })),
    handleSubmit,
    validateForm,
    applyWhatsappFromContact,
  };
}
