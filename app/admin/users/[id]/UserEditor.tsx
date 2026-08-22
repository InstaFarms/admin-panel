"use client";

import { checkUserMobileExists, createUser, editUser } from "@/actions/userActions";
import { USERS_VALIDATION } from "@/constants/users";
import { useOwnerForm } from "@/hooks/useOwnerForm";
import { User } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { Badge, Label, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

interface UserEditorProps {
  data?: User;
  formId?: string;
}

export default function UserEditor(props: UserEditorProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const submitLockRef = useRef(false);
  const formId = props.formId ?? "user-editor-form";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [mobileExistsError, setMobileExistsError] = useState<string | null>(null);
  const {
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
    validateAll,
  } = useOwnerForm({
    firstName: props.data?.firstName ?? "",
    lastName: props.data?.lastName ?? "",
    email: props.data?.email ?? "",
    mobileNumber: props.data?.mobileNumber ?? "",
    whatsappNumber: props.data?.whatsappNumber ?? "",
  });
  const currentMobile = mobileNumber.trim();
  const initialMobile = props.data?.mobileNumber?.trim() ?? "";
  const mobileChanged = !props.data || currentMobile !== initialMobile;

  const checkMobileAvailability = useCallback(async (): Promise<boolean> => {
    if (!currentMobile || !!errors.mobileNumber) return false;
    setCheckingMobile(true);
    try {
      const result = await checkUserMobileExists(currentMobile, props.data?.id);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      if (result.exists) {
        setMobileExistsError(USERS_VALIDATION.mobileDuplicate);
        return false;
      }
      setMobileExistsError(null);
      return true;
    } finally {
      setCheckingMobile(false);
    }
  }, [currentMobile, errors.mobileNumber, props.data?.id]);

  useEffect(() => {
    if (!mobileChanged) {
      setMobileExistsError(null);
      return;
    }

    if (currentMobile.length !== 10 || !!errors.mobileNumber) {
      setMobileExistsError(null);
      return;
    }

    void checkMobileAvailability();
  }, [checkMobileAvailability, currentMobile, errors.mobileNumber, mobileChanged]);

  const releaseSubmitLock = () => {
    submitLockRef.current = false;
    setIsSubmitting(false);
  };

  const beginSubmit = () => {
    if (submitLockRef.current) return false;
    submitLockRef.current = true;
    setIsSubmitting(true);
    return true;
  };

  const runPromise = (promise: Promise<string>) => {
    const guardedPromise = promise.finally(() => {
      releaseSubmitLock();
    });

    toast.promise(guardedPromise, {
      loading: "Saving User data...",
      success: (data) => {
        if (!props.data) {
          router.push("/admin/users");
        } else {
          router.refresh();
        }
        return data;
      },
      error: (err) => (err as Error).message,
    });
  };

  const submitForm = () => {
    startTransition(() => {
      if (!validateAll()) {
        releaseSubmitLock();
        toast.error("Please fix the errors before saving.");
        return;
      }
      if (mobileExistsError) {
        releaseSubmitLock();
        toast.error(mobileExistsError);
        return;
      }

      const formData = new FormData();
      formData.set("firstName", firstName.trim());
      formData.set("lastName", lastName.trim());
      formData.set("email", email.trim());
      formData.set("mobileNumber", mobileNumber.trim());
      formData.set("whatsappNumber", whatsappNumber.trim());

      let promise: Promise<string>;
      if (props.data) {
        const editUserWithId = editUser.bind(null, props.data.id);
        promise = parseServerActionResult(editUserWithId(formData));
      } else {
        promise = parseServerActionResult(createUser(formData));
      }

      runPromise(promise);
    });
  };

  const handleSubmit = () => {
    if (!beginSubmit()) return;

    if (mobileChanged) {
      const run = async () => {
        const isAvailable = await checkMobileAvailability();
        if (!isAvailable) {
          releaseSubmitLock();
          toast.error(USERS_VALIDATION.mobileDuplicate);
          return;
        }
        submitForm();
      };
      void run();
      return;
    }

    submitForm();
  };

  return (
    <form
      className="flex w-full flex-col gap-5"
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
        <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Basics</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
            Capture the identity details used across user access, operations, and support workflows.
          </p>
        </div>
        <div className="grid w-full gap-5 p-5 md:grid-cols-2">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="firstName">User First Name <span className="text-red-500">*</span></Label>
            </div>
            <TextInput
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Enter First Name"
              required
              maxLength={50}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value.replace(/\s{2,}/g, " ").slice(0, 50))}
              color={errors.firstName ? "failure" : undefined}
            />
            {errors.firstName ? <p className="mt-1 text-sm text-red-500">{errors.firstName}</p> : null}
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="lastName">User Last Name</Label>
            </div>
            <TextInput
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Enter Last Name"
              maxLength={50}
              value={lastName}
              onChange={(e) => setLastName(e.target.value.replace(/\s{2,}/g, " ").slice(0, 50))}
              color={errors.lastName ? "failure" : undefined}
            />
            {errors.lastName ? <p className="mt-1 text-sm text-red-500">{errors.lastName}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
        <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Verification</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
            Keep the contact record complete and verify any new or changed mobile number before saving.
          </p>
        </div>
        <div className="grid w-full gap-5 p-5 md:grid-cols-2">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="mobileNumber">User Mobile Number <span className="text-red-500">*</span></Label>
            </div>
            <TextInput
              id="mobileNumber"
              name="mobileNumber"
              type="tel"
              inputMode="numeric"
              placeholder="Enter Mobile Number (10 digits)"
              required
              maxLength={10}
              value={mobileNumber}
              disabled={isSubmitting}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              color={errors.mobileNumber || mobileExistsError ? "failure" : undefined}
            />
            {errors.mobileNumber ? <p className="mt-1 text-sm text-red-500">{errors.mobileNumber}</p> : null}
            {mobileExistsError && !errors.mobileNumber ? (
              <p className="mt-1 text-sm text-red-500">{mobileExistsError}</p>
            ) : null}
            {checkingMobile ? <Badge color="info" className="mt-2 w-fit">Checking mobile</Badge> : null}
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="email">User Email <span className="text-red-500">*</span></Label>
            </div>
            <TextInput
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().slice(0, 100))}
              color={errors.email ? "failure" : undefined}
            />
            {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email}</p> : null}
          </div>
          <div>
            <div className="mb-2 block">
              <Label htmlFor="whatsappNumber">User Whatsapp Number</Label>
            </div>
            <TextInput
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              inputMode="numeric"
              placeholder="Enter Whatsapp Number"
              maxLength={10}
              value={whatsappNumber}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
              color={errors.whatsappNumber ? "failure" : undefined}
            />
            {errors.whatsappNumber ? <p className="mt-1 text-sm text-red-500">{errors.whatsappNumber}</p> : null}
          </div>
        </div>
      </section>
    </form>
  );
}
