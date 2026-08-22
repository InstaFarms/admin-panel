"use client";

import { createManagerWithProperties, updateManagerProperties } from "@/actions/managerActions";
import { checkUserMobileExists, editUser } from "@/actions/userActions";
import PropertyMultiSelector from "@/components/PropertyMultiSelector";
import { HiTrash, USERS_VALIDATION } from "@/constants/users";
import { useOwnerForm } from "@/hooks/useOwnerForm";
import { User } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { Badge, Label, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

interface PropertyDetail {
  propertyId: string;
  propertyName: string | null;
  propertyCode: string | null;
  areaName: string | null;
  cityName: string | null;
  stateName: string | null;
}

interface ManagerEditorProps {
  data?: User;
  existingProperties?: PropertyDetail[];
  formId?: string;
  mode?: "full" | "details" | "properties";
}

export default function ManagerEditor(props: ManagerEditorProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const submitLockRef = useRef(false);
  const formId = props.formId ?? "manager-editor-form";
  const mode = props.mode ?? "full";
  const showProfileFields = mode !== "properties";
  const showPropertyAssignment = mode !== "details";
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(
    props.existingProperties?.map((property) => property.propertyId) || []
  );
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetail[]>(
    props.existingProperties || []
  );
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

  const handleAddProperty = (property: any) => {
    const propertyId = property.id || property.propertyId;
    if (!propertyId) {
      toast.error(USERS_VALIDATION.propertyMissingId);
      return;
    }
    if (selectedPropertyIds.includes(propertyId)) {
      return;
    }

    const propertyDetail: PropertyDetail = {
      propertyId,
      propertyName: property.propertyName || property.name || null,
      propertyCode: property.propertyCode || property.code_name || null,
      areaName: property.area || property.areaName || null,
      cityName: property.city || property.cityName || null,
      stateName: property.state || property.stateName || null,
    };

    setPropertyDetails((prev) => [...prev, propertyDetail]);
    setSelectedPropertyIds((prev) => [...prev, propertyId]);
  };

  const handleRemoveProperty = (propertyId: string) => {
    setSelectedPropertyIds((prev) => prev.filter((id) => id !== propertyId));
    setPropertyDetails((prev) => prev.filter((property) => property.propertyId !== propertyId));
  };

  const handleSelectionChange = (propertyIds: string[]) => {
    setSelectedPropertyIds(propertyIds);
    setPropertyDetails((prev) => prev.filter((property) => propertyIds.includes(property.propertyId)));
  };

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

  const runPromise = (promise: Promise<string>, loadingLabel: string) => {
    const guardedPromise = promise.finally(() => {
      releaseSubmitLock();
    });

    toast.promise(guardedPromise, {
      loading: loadingLabel,
      success: (data) => {
        if (!props.data) {
          router.push("/admin/users/managers");
        } else {
          router.refresh();
        }
        return data;
      },
      error: (err) => (err as Error).message,
    });
  };

  const handleSubmit = () => {
    if (!beginSubmit()) return;

    if (showPropertyAssignment && selectedPropertyIds.length === 0) {
      releaseSubmitLock();
      toast.error(USERS_VALIDATION.atLeastOneProperty);
        return;
    }

    if (showProfileFields && mobileChanged) {
      const run = async () => {
        const isAvailable = await checkMobileAvailability();
        if (!isAvailable) {
          releaseSubmitLock();
          toast.error(USERS_VALIDATION.mobileDuplicate);
          return;
        }
        startTransition(() => {
          let promise: Promise<string>;

          if (!validateAll()) {
            releaseSubmitLock();
            toast.error("Please fix the errors before saving.");
        return;
          }

          const formData = new FormData();
          formData.set("firstName", firstName.trim());
          formData.set("lastName", lastName.trim());
          formData.set("email", email.trim());
          formData.set("mobileNumber", mobileNumber.trim());
          formData.set("whatsappNumber", whatsappNumber.trim());

          if (props.data) {
            const editUserWithId = editUser.bind(null, props.data.id);
            promise = parseServerActionResult(editUserWithId(formData));
          } else {
            const managerData = {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              mobileNumber: mobileNumber.trim() || undefined,
              whatsappNumber: whatsappNumber.trim() || undefined,
            };
            promise = parseServerActionResult(
              createManagerWithProperties(managerData, selectedPropertyIds)
            );
          }

          runPromise(promise, "Saving Manager data...");
        });
      };
      void run();
      return;
    }

    startTransition(() => {
      let promise: Promise<string>;

      if (props.data && mode === "properties") {
        promise = parseServerActionResult(
          updateManagerProperties(props.data.id, selectedPropertyIds)
        );
      } else {
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

        if (props.data) {
          const editUserWithId = editUser.bind(null, props.data.id);
          promise = parseServerActionResult(editUserWithId(formData));
        } else {
          const managerData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            mobileNumber: mobileNumber.trim() || undefined,
            whatsappNumber: whatsappNumber.trim() || undefined,
          };
            promise = parseServerActionResult(
              createManagerWithProperties(managerData, selectedPropertyIds)
            );
        }
      }

      runPromise(promise, "Saving Manager data...");
    });
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
      {showProfileFields ? (
        <div className="grid w-full grid-cols-2 gap-5">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="firstName">Manager First Name <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="lastName">Manager Last Name</Label>
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
          <div>
            <div className="mb-2 block">
              <Label htmlFor="email">Manager Email <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="mobileNumber">Manager Mobile Number <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="whatsappNumber">Manager Whatsapp Number</Label>
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
      ) : null}

      {showPropertyAssignment ? (
        <>
          <div className="col-span-2">
            <PropertyMultiSelector
              selectedPropertyIds={selectedPropertyIds}
              onSelectionChange={handleSelectionChange}
              onAddProperty={handleAddProperty}
              hideSelectedList
            />
          </div>

          {propertyDetails.length > 0 ? (
            <div className="col-span-2">
              <div className="mb-2 block">
                <Label>Selected Properties ({propertyDetails.length})</Label>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Property ID</TableHeadCell>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Code</TableHeadCell>
                      <TableHeadCell>Location</TableHeadCell>
                      <TableHeadCell>Actions</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propertyDetails.filter((property) => property.propertyId).map((property) => (
                      <TableRow key={property.propertyId}>
                        <TableCell className="font-mono text-sm">
                          {property.propertyId?.substring(0, 8) || "N/A"}...
                        </TableCell>
                        <TableCell className="font-medium">{property.propertyName || "N/A"}</TableCell>
                        <TableCell>{property.propertyCode || "N/A"}</TableCell>
                        <TableCell>
                          {[property.areaName, property.cityName, property.stateName].filter(Boolean).join(", ") || "N/A"}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleRemoveProperty(property.propertyId)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Remove property"
                          >
                            <HiTrash size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </form>
  );
}
