"use client";

import { useState } from "react";
import { USERS_VALIDATION } from "@/constants/users";

export interface OwnerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber: string;
}

export interface OwnerFormErrors {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  whatsappNumber?: string | null;
}

const validateFirstName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return USERS_VALIDATION.firstNameRequired;
  if (v.trim().length < 2) return USERS_VALIDATION.firstNameMinLength;
  if (v.trim().length > 50) return USERS_VALIDATION.firstNameMaxLength;
  return null;
};

const validateLastName = (v: string): string | null => {
  if (v && v.trim().length > 50) return USERS_VALIDATION.lastNameMaxLength;
  return null;
};

const validateEmail = (v: string): string | null => {
  if (!v || v.trim().length === 0) return USERS_VALIDATION.emailRequired;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return USERS_VALIDATION.emailInvalid;
  return null;
};

const validateMobile = (v: string): string | null => {
  if (!v || v.trim().length === 0) return USERS_VALIDATION.mobileRequired;
  if (!/^[0-9]{10}$/.test(v.trim().replace(/\s/g, ""))) return USERS_VALIDATION.mobileInvalid;
  return null;
};

const validateWhatsapp = (v: string): string | null => {
  if (v && !/^[0-9]{10}$/.test(v.trim().replace(/\s/g, ""))) return USERS_VALIDATION.mobileInvalid;
  return null;
};

/** Pure validation for owner form values (use in handleSubmit before server action). */
export function validateOwnerFormValues(values: Partial<OwnerFormValues>): OwnerFormErrors {
  return {
    firstName: validateFirstName(values.firstName ?? ""),
    lastName: validateLastName(values.lastName ?? ""),
    email: validateEmail(values.email ?? ""),
    mobileNumber: validateMobile(values.mobileNumber ?? ""),
    whatsappNumber: validateWhatsapp(values.whatsappNumber ?? ""),
  };
}

export function useOwnerForm(initial?: Partial<OwnerFormValues>) {
  const [firstName, setFirstNameRaw] = useState(initial?.firstName ?? "");
  const [lastName, setLastNameRaw] = useState(initial?.lastName ?? "");
  const [email, setEmailRaw] = useState(initial?.email ?? "");
  const [mobileNumber, setMobileRaw] = useState(initial?.mobileNumber ?? "");
  const [whatsappNumber, setWhatsappRaw] = useState(initial?.whatsappNumber ?? "");
  const [errors, setErrors] = useState<OwnerFormErrors>({});

  const setFirstName = (v: string) => {
    setFirstNameRaw(v);
    setErrors((prev) => ({ ...prev, firstName: validateFirstName(v) }));
  };
  const setLastName = (v: string) => {
    setLastNameRaw(v);
    setErrors((prev) => ({ ...prev, lastName: validateLastName(v) }));
  };
  const setEmail = (v: string) => {
    setEmailRaw(v);
    setErrors((prev) => ({ ...prev, email: validateEmail(v) }));
  };
  const setMobile = (v: string) => {
    setMobileRaw(v);
    setErrors((prev) => ({ ...prev, mobileNumber: validateMobile(v) }));
  };
  const setWhatsapp = (v: string) => {
    setWhatsappRaw(v);
    setErrors((prev) => ({ ...prev, whatsappNumber: validateWhatsapp(v) }));
  };

  const validateAll = (): boolean => {
    const newErrors: OwnerFormErrors = {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
      email: validateEmail(email),
      mobileNumber: validateMobile(mobileNumber),
      whatsappNumber: validateWhatsapp(whatsappNumber),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    mobileNumber,
    setMobile,
    whatsappNumber,
    setWhatsapp,
    errors,
    setErrors,
    validateAll,
  };
}
