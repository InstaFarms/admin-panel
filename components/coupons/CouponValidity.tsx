import { Label, TextInput } from "flowbite-react";

interface CouponValidityProps {
  validFrom: string;
  setValidFrom: (value: string) => void;
  validUntil: string;
  setValidUntil: (value: string) => void;
  validFromError?: string | null;
  validUntilError?: string | null;
  isEdit?: boolean;
}

export default function CouponValidity({
  validFrom,
  setValidFrom,
  validUntil,
  setValidUntil,
  validFromError,
  validUntilError,
  isEdit = false,
}: CouponValidityProps) {
  // Only stop new coupons from starting in the past. An existing coupon's
  // validFrom is often already in the past (it's been running for a while) —
  // enforcing today's date as the browser's native `min` there made the date
  // itself fail HTML5 constraint validation, which silently blocks the whole
  // form's submit event (no handler call, no error, no network request) the
  // moment you try to save ANY change to that coupon.
  const today = new Date().toISOString().slice(0, 10);
  const validFromMin = isEdit ? undefined : today;

  return (
    <>
      <div>
        <div className="mb-2 block">
          <Label htmlFor="validFrom">
            Valid From <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="validFrom"
          name="validFrom"
          type="date"
          required
          className="w-full"
          value={validFrom}
          min={validFromMin}
          onChange={(e) => setValidFrom(e.target.value)}
          color={validFromError ? "failure" : "gray"}
        />
        {validFromError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">
            {validFromError}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="validUntil">
            Valid Until <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="validUntil"
          name="validUntil"
          type="date"
          required
          className="w-full"
          value={validUntil}
          min={validFrom}
          onChange={(e) => setValidUntil(e.target.value)}
          color={validUntilError ? "failure" : "gray"}
        />
        {validUntilError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">
            {validUntilError}
          </p>
        )}
      </div>
    </>
  );
}
