import { Label, Spinner, TextInput } from "flowbite-react";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";

import { checkCouponCode } from "@/actions/couponActions";

interface CouponNameCodeProps {
  defaultName?: string;
  defaultCode?: string;
  couponId?: string;
  brandId?: string;
  nameError?: string | null;
  codeError?: string | null;
  onNameChange?: () => void;
  onCodeChange?: () => void;
}

export default function CouponNameCode({
  defaultName,
  defaultCode,
  couponId,
  brandId,
  nameError,
  codeError,
  onNameChange,
  onCodeChange,
}: CouponNameCodeProps) {
  const [code, setCode] = useState(defaultCode || "");
  const [debouncedCode] = useDebounce(code, 500);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!debouncedCode || debouncedCode === defaultCode) {
      setError(null);
      return;
    }

    const validateCode = async () => {
      setIsValidating(true);
      const result = await checkCouponCode(debouncedCode, couponId, brandId);
      setIsValidating(false);

      if (!result.valid) {
        setError(result.message || "Invalid code");
      } else {
        setError(null);
      }
    };

    startTransition(() => {
      validateCode();
    });
  }, [brandId, couponId, debouncedCode, defaultCode, startTransition]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="name">
            Coupon Name <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="name"
          name="name"
          type="text"
          placeholder="Enter coupon name"
          required
          defaultValue={defaultName}
          className="w-full"
          color={nameError ? "failure" : "gray"}
          onChange={onNameChange}
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">
            {nameError}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="code">
            Coupon Code <span className="text-red-500">*</span>
          </Label>
        </div>
        <div className="relative">
          <TextInput
            id="code"
            name="code"
            type="text"
            placeholder="Enter coupon code"
            required
            value={code}
            onChange={(e) => {
              handleChange(e);
              onCodeChange?.();
            }}
            className="w-full"
            color={codeError || error ? "failure" : "gray"}
          />
          {isValidating && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Spinner size="sm" />
            </div>
          )}
        </div>
        {(codeError || error) && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-500">
            <span className="font-medium">{codeError || error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
