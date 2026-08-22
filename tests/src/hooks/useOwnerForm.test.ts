import { describe, it, expect } from "vitest";
import { validateOwnerFormValues } from "@/hooks/useOwnerForm";
import { USERS_VALIDATION } from "@/constants/users";

describe("validateOwnerFormValues", () => {
  const validValues = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    mobileNumber: "9876543210",
    whatsappNumber: "9876543210",
  };

  describe("firstName", () => {
    it("returns no error for valid first name", () => {
      const errors = validateOwnerFormValues({ ...validValues });
      expect(errors.firstName).toBeNull();
    });

    it("returns error when first name is empty", () => {
      const errors = validateOwnerFormValues({ ...validValues, firstName: "" });
      expect(errors.firstName).toBe(USERS_VALIDATION.firstNameRequired);
    });

    it("returns error when first name is whitespace only", () => {
      const errors = validateOwnerFormValues({ ...validValues, firstName: "   " });
      expect(errors.firstName).toBe(USERS_VALIDATION.firstNameRequired);
    });

    it("returns error when first name is too short", () => {
      const errors = validateOwnerFormValues({ ...validValues, firstName: "J" });
      expect(errors.firstName).toBe(USERS_VALIDATION.firstNameMinLength);
    });

    it("returns error when first name exceeds 50 characters", () => {
      const errors = validateOwnerFormValues({
        ...validValues,
        firstName: "a".repeat(51),
      });
      expect(errors.firstName).toBe(USERS_VALIDATION.firstNameMaxLength);
    });
  });

  describe("lastName", () => {
    it("returns no error for empty or valid last name", () => {
      expect(validateOwnerFormValues({ ...validValues }).lastName).toBeNull();
      expect(validateOwnerFormValues({ ...validValues, lastName: "" }).lastName).toBeNull();
    });

    it("returns error when last name exceeds 50 characters", () => {
      const errors = validateOwnerFormValues({
        ...validValues,
        lastName: "a".repeat(51),
      });
      expect(errors.lastName).toBe(USERS_VALIDATION.lastNameMaxLength);
    });
  });

  describe("email", () => {
    it("returns no error for valid email", () => {
      const errors = validateOwnerFormValues({ ...validValues });
      expect(errors.email).toBeNull();
    });

    it("returns error when email is empty", () => {
      const errors = validateOwnerFormValues({ ...validValues, email: "" });
      expect(errors.email).toBe(USERS_VALIDATION.emailRequired);
    });

    it("returns error for invalid email format", () => {
      const invalidEmails = ["notanemail", "@domain.com", "user@", "user@.com"];
      invalidEmails.forEach((email) => {
        const errors = validateOwnerFormValues({ ...validValues, email });
        expect(errors.email).toBe(USERS_VALIDATION.emailInvalid);
      });
    });

    it("accepts valid email formats", () => {
      const validEmails = ["a@b.co", "user.name@domain.co.in"];
      validEmails.forEach((email) => {
        const errors = validateOwnerFormValues({ ...validValues, email });
        expect(errors.email).toBeNull();
      });
    });
  });

  describe("mobileNumber", () => {
    it("returns no error for valid 10-digit mobile", () => {
      const errors = validateOwnerFormValues({ ...validValues });
      expect(errors.mobileNumber).toBeNull();
    });

    it("returns error when mobile is empty", () => {
      const errors = validateOwnerFormValues({ ...validValues, mobileNumber: "" });
      expect(errors.mobileNumber).toBe(USERS_VALIDATION.mobileRequired);
    });

    it("returns error for invalid mobile (too short)", () => {
      const errors = validateOwnerFormValues({ ...validValues, mobileNumber: "123" });
      expect(errors.mobileNumber).toBe(USERS_VALIDATION.mobileInvalid);
    });

    it("accepts 10–13 digit numbers and optional +", () => {
      const validMobiles = ["9876543210", "+919876543210", "1234567890123"];
      validMobiles.forEach((mobileNumber) => {
        const errors = validateOwnerFormValues({ ...validValues, mobileNumber });
        expect(errors.mobileNumber).toBeNull();
      });
    });
  });

  describe("whatsappNumber", () => {
    it("returns no error when whatsapp is empty (optional)", () => {
      const errors = validateOwnerFormValues({ ...validValues, whatsappNumber: "" });
      expect(errors.whatsappNumber).toBeNull();
    });

    it("returns error when whatsapp is invalid format", () => {
      const errors = validateOwnerFormValues({ ...validValues, whatsappNumber: "abc" });
      expect(errors.whatsappNumber).toBe(USERS_VALIDATION.mobileInvalid);
    });
  });

  describe("partial values", () => {
    it("handles undefined fields as empty", () => {
      const errors = validateOwnerFormValues({});
      expect(errors.firstName).toBe(USERS_VALIDATION.firstNameRequired);
      expect(errors.email).toBe(USERS_VALIDATION.emailRequired);
      expect(errors.mobileNumber).toBe(USERS_VALIDATION.mobileRequired);
    });
  });
});
