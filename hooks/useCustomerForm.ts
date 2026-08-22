"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { CUSTOMERS_VALIDATION } from "@/constants/customers";

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  gender: string;
  dob: Date | null;
}

type CustomerFormInitialValues = Partial<Omit<CustomerFormValues, "dob">> & {
  dob?: Date | string | null;
};

export interface CustomerFormErrors {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  gender?: string | null;
  dob?: string | null;
}

const validateFirstName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return CUSTOMERS_VALIDATION.firstNameRequired;
  if (v.trim().length < 2) return CUSTOMERS_VALIDATION.firstNameMinLength;
  if (v.trim().length > 50) return CUSTOMERS_VALIDATION.firstNameMaxLength;
  return null;
};

const validateLastName = (v: string): string | null => {
  if (v && v.trim().length > 50) return CUSTOMERS_VALIDATION.lastNameMaxLength;
  return null;
};

const validateEmail = (v: string): string | null => {
  if (!v || v.trim().length === 0) return CUSTOMERS_VALIDATION.emailRequired;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return CUSTOMERS_VALIDATION.emailInvalid;
  return null;
};

const validateMobile = (v: string): string | null => {
  if (!v || v.trim().length === 0) return CUSTOMERS_VALIDATION.mobileRequired;
  const digits = v.trim().replace(/\D/g, "");
  if (digits.length !== 10) return CUSTOMERS_VALIDATION.mobileInvalid;
  if (digits.startsWith("0")) return CUSTOMERS_VALIDATION.mobileStartsWithZero;
  return null;
};

const validateGender = (v: string): string | null => {
  if (!v || v.trim().length === 0) return CUSTOMERS_VALIDATION.genderRequired;
  return null;
};

const validateDob = (v: Date | null): string | null => {
  if (!v) return null;
  const dobDt = DateTime.fromJSDate(v);
  if (!dobDt.isValid) return CUSTOMERS_VALIDATION.dobInvalid;
  if (dobDt.startOf("day") > DateTime.now().startOf("day")) {
    return CUSTOMERS_VALIDATION.dobFuture;
  }
  return null;
};

export function useCustomerForm(initial?: CustomerFormInitialValues) {
  const [firstName, setFirstNameRaw] = useState(initial?.firstName ?? "");
  const [lastName, setLastNameRaw] = useState(initial?.lastName ?? "");
  const [email, setEmailRaw] = useState(initial?.email ?? "");
  const [mobileNumber, setMobileRaw] = useState(initial?.mobileNumber ?? "");
  const [gender, setGenderRaw] = useState(initial?.gender ?? "");
  const [dob, setDobRaw] = useState<Date | null>(
    initial?.dob
      ? (typeof initial.dob === "string"
          ? DateTime.fromSQL(initial.dob).toJSDate()
          : initial.dob)
      : null
  );
  const [errors, setErrors] = useState<CustomerFormErrors>({});

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
  const setGender = (v: string) => {
    setGenderRaw(v);
    setErrors((prev) => ({ ...prev, gender: validateGender(v) }));
  };
  const setDob = (v: Date | null) => {
    setDobRaw(v);
    setErrors((prev) => ({ ...prev, dob: validateDob(v) }));
  };

  const validate = (): boolean => {
    const newErrors: CustomerFormErrors = {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
      email: validateEmail(email),
      mobileNumber: validateMobile(mobileNumber),
      gender: validateGender(gender),
      dob: validateDob(dob),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  return {
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    mobileNumber, setMobile,
    gender, setGender,
    dob, setDob,
    errors, setErrors,
    validate,
  };
}
