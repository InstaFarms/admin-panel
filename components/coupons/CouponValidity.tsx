import { Label, TextInput } from "flowbite-react";

interface CouponValidityProps {
  validFrom: string;
  setValidFrom: (value: string) => void;
  validUntil: string;
  setValidUntil: (value: string) => void;
  validFromError?: string | null;
  validUntilError?: string | null;
}

export default function CouponValidity({
  validFrom,
  setValidFrom,
  validUntil,
  setValidUntil,
  validFromError,
  validUntilError,
}: CouponValidityProps) {
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
          min={new Date().toISOString().slice(0, 10)}
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
