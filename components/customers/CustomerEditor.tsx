"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge, Label, Select, TextInput } from "flowbite-react";
import { DateTime } from "luxon";
import toast from "react-hot-toast";

import {
  checkCustomerMobileExists,
  createCustomer,
  editCustomer,
  sendCustomerOtp,
  verifyCustomerOtp,
} from "@/actions/customerActions";
import { PHONE_LENGTH } from "@/constants/auth";
import { GENDER_OPTIONS } from "@/constants/customers";
import { CUSTOMER_BRANDS, type CustomerBrandName } from "@/constants/customerBrands";
import { useCustomerForm } from "@/hooks/useCustomerForm";
import type { CustomerData } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";

interface SharedCustomerEditorProps {
  data?: CustomerData;
  brandName: CustomerBrandName;
  formId: string;
  deleteAction?: ReactNode;
}

function formatDateInputValue(dobValue: Date | null) {
  if (!dobValue) return "";
  const dob = DateTime.fromJSDate(dobValue);
  return dob.isValid ? dob.toFormat("yyyy-LL-dd") : "";
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function SharedCustomerEditor({
  data,
  brandName,
  formId,
  deleteAction,
}: SharedCustomerEditorProps) {
  const [, startTransition] = useTransition();
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [mobileExistsError, setMobileExistsError] = useState<string | null>(null);
  const router = useRouter();

  const {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    mobileNumber,
    setMobile,
    gender,
    setGender,
    dob,
    setDob,
    errors,
    validate,
  } = useCustomerForm({
    firstName: data?.firstName,
    lastName: data?.lastName ?? "",
    email: data?.email ?? "",
    mobileNumber: data?.mobileNumber ?? "",
    gender: data?.gender ?? "",
    dob: data?.dob ?? null,
  });

  const currentMobile = mobileNumber.trim();
  const initialMobile = data?.mobileNumber?.trim() ?? "";
  const mobileChanged = !data || currentMobile !== initialMobile;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const checkMobileAvailability = useCallback(async (): Promise<boolean> => {
    if (!currentMobile || !!errors.mobileNumber) return false;
    setCheckingMobile(true);
    try {
      const result = await checkCustomerMobileExists(currentMobile, data?.id, { brandName });
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      if (result.exists) {
        setMobileExistsError("This mobile number is already registered to another customer");
        return false;
      }
      setMobileExistsError(null);
      return true;
    } finally {
      setCheckingMobile(false);
    }
  }, [brandName, currentMobile, data?.id, errors.mobileNumber]);

  useEffect(() => {
    if (!mobileChanged) {
      setMobileExistsError(null);
      return;
    }

    if (currentMobile.length !== PHONE_LENGTH || !!errors.mobileNumber) {
      setMobileExistsError(null);
      return;
    }

    void checkMobileAvailability();
  }, [checkMobileAvailability, currentMobile, errors.mobileNumber, mobileChanged]);

  const handleSendOtp = async () => {
    if (!currentMobile) {
      toast.error("Please enter mobile number first.");
      return;
    }
    if (errors.mobileNumber) {
      toast.error(errors.mobileNumber);
      return;
    }
    const isAvailable = await checkMobileAvailability();
    if (!isAvailable) return;

    setSendingOtp(true);
    try {
      const msg = await parseServerActionResult(sendCustomerOtp(currentMobile));
      setOtpSent(true);
      setOtp("");
      setMobileVerified(false);
      setResendCooldown(30);
      toast.success(msg);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter OTP.");
      return;
    }
    if (!currentMobile) {
      toast.error("Please enter mobile number first.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const msg = await parseServerActionResult(verifyCustomerOtp(currentMobile, otp.trim()));
      setMobileVerified(true);
      toast.success(msg);
    } catch (err) {
      setMobileVerified(false);
      toast.error((err as Error).message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const continueSubmit = () => {
    if (mobileChanged && !mobileVerified) {
      toast.error("Please verify mobile number with OTP before submitting.");
      return;
    }

    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    const formData = new FormData();
    formData.set("firstName", firstName.trim());
    formData.set("lastName", lastName.trim());
    formData.set("email", email.trim());
    formData.set("mobileNumber", mobileNumber.trim());
    formData.set("gender", gender);

    const dobDt = dob && DateTime.fromJSDate(dob);
    if (dobDt?.isValid) {
      formData.set("dob", dobDt.toSQLDate()!);
    }

    startTransition(() => {
      const promise: Promise<string> = data
        ? parseServerActionResult(editCustomer.bind(null, data.id)(formData, { brandName }))
        : parseServerActionResult(createCustomer(formData, { brandName }));

      toast.promise(promise, {
        loading: data ? "Updating customer..." : "Creating customer...",
        success: (msg) => {
          if (data) {
            router.refresh();
          } else {
            router.push(
              brandName === CUSTOMER_BRANDS.MAGO
                ? "/admin/mago-customers"
                : "/admin/Instafarms-customer"
            );
          }
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const handleSubmit = () => {
    if (mobileChanged) {
      const run = async () => {
        const isAvailable = await checkMobileAvailability();
        if (!isAvailable) {
          toast.error("Please use a different mobile number.");
          return;
        }
        if (!mobileVerified) {
          toast.error("Please verify mobile number with OTP before submitting.");
          return;
        }
        continueSubmit();
      };
      void run();
      return;
    }

    continueSubmit();
  };

  return (
    <form
      id={formId}
      className="grid w-full gap-5 xl:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
        <SectionShell
          title="Profile Basics"
          subtitle="Capture the customer identity details used across booking, communication, and support workflows."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
              </div>
              <TextInput
                id="firstName"
                type="text"
                placeholder="Enter first name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                color={errors.firstName ? "failure" : undefined}
              />
              {errors.firstName ? <p className="mt-1 text-sm text-red-500">{errors.firstName}</p> : null}
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="lastName">Last Name</Label>
              </div>
              <TextInput
                id="lastName"
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                color={errors.lastName ? "failure" : undefined}
              />
              {errors.lastName ? <p className="mt-1 text-sm text-red-500">{errors.lastName}</p> : null}
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </Label>
              </div>
              <Select
                id="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                color={errors.gender ? "failure" : undefined}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              {errors.gender ? <p className="mt-1 text-sm text-red-500">{errors.gender}</p> : null}
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="dob">Date of Birth</Label>
              </div>
              <TextInput
                id="dob"
                type="date"
                value={formatDateInputValue(dob)}
                max={DateTime.now().toFormat("yyyy-LL-dd")}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (!nextValue) {
                    setDob(null);
                    return;
                  }
                  const parsed = DateTime.fromISO(nextValue);
                  setDob(parsed.isValid ? parsed.toJSDate() : null);
                }}
              />
              {errors.dob ? <p className="mt-1 text-sm text-red-500">{errors.dob}</p> : null}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Contact & Verification"
          subtitle="Keep the contact record complete and verify any new or changed mobile number before saving."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
              </div>
              <TextInput
                id="email"
                type="email"
                placeholder="Enter email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                color={errors.email ? "failure" : undefined}
              />
              {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="mobileNumber">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
              </div>
              <TextInput
                id="mobileNumber"
                type="tel"
                inputMode="numeric"
                placeholder="Enter mobile number"
                required
                value={mobileNumber}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH);
                  setMobile(next);
                  const nextTrimmed = next.trim();
                  const hasChanged = !data || nextTrimmed !== initialMobile;
                  if (hasChanged) {
                    setOtp("");
                    setOtpSent(false);
                    setMobileVerified(false);
                    setResendCooldown(0);
                    setMobileExistsError(null);
                  }
                }}
                color={errors.mobileNumber ? "failure" : undefined}
              />
              {errors.mobileNumber ? (
                <p className="mt-1 text-sm text-red-500">{errors.mobileNumber}</p>
              ) : null}
              {mobileExistsError && !errors.mobileNumber ? (
                <p className="mt-1 text-sm text-red-500">{mobileExistsError}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={mobileVerified ? "success" : otpSent ? "warning" : mobileChanged ? "failure" : "gray"}>
                    {mobileVerified
                      ? "Verified"
                      : otpSent
                        ? "OTP Sent"
                        : mobileChanged
                          ? "Verification Required"
                          : "No Changes"}
                  </Badge>
                  {!mobileChanged ? <Badge color="gray">Existing mobile retained</Badge> : null}
                  {checkingMobile ? <Badge color="info">Checking mobile</Badge> : null}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mobile Verification</h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  {mobileVerified
                    ? "This customer record is ready to save with the verified mobile number."
                    : otpSent
                      ? "Enter the 6-digit OTP to complete verification for this mobile number."
                      : mobileChanged
                        ? "Any new or edited mobile number must be verified before saving."
                        : "No OTP step is needed until the mobile number changes."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">Current mobile</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">{currentMobile || "Not entered yet"}</p>
              </div>
            </div>

            {mobileChanged ? (
              <div className="mt-4 space-y-3">
                {!mobileVerified ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={
                        sendingOtp ||
                        checkingMobile ||
                        !currentMobile ||
                        !!errors.mobileNumber ||
                        !!mobileExistsError ||
                        resendCooldown > 0
                      }
                      className="rounded-md border border-blue-500 px-3 py-1.5 text-sm text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300"
                    >
                      {sendingOtp
                        ? "Sending OTP..."
                        : checkingMobile
                          ? "Checking..."
                          : otpSent
                            ? resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : "Resend OTP"
                            : "Send OTP"}
                    </button>

                    {otpSent ? (
                      <>
                        <TextInput
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-44"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp || !otp.trim() || otp.trim().length < 6}
                          className="rounded-md border border-emerald-500 px-3 py-1.5 text-sm text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
                        >
                          {verifyingOtp ? "Verifying..." : "Verify OTP"}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {mobileVerified
                    ? "If you change this number again, OTP verification will be required once more."
                    : "We only save the customer after the new mobile number is confirmed."}
                </p>
              </div>
            ) : null}
          </div>
        </SectionShell>
    </form>
  );
}
