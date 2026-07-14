import type { IntakeErrors, IntakeValues } from "../productTypes.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeIntake(values: IntakeValues): IntakeValues {
  return {
    businessName: values.businessName.trim().replace(/\s+/g, " "),
    website: normalizeWebsite(values.website),
    address: values.address.trim().replace(/\s+/g, " "),
    email: values.email.trim().toLowerCase(),
    notes: values.notes.trim(),
  };
}

export function validateIntake(values: IntakeValues): IntakeErrors {
  const normalized = normalizeIntake(values);
  const errors: IntakeErrors = {};

  if (normalized.businessName.length < 2) {
    errors.businessName = "Enter the business name.";
  } else if (normalized.businessName.length > 120) {
    errors.businessName = "Keep the business name under 120 characters.";
  }

  if (normalized.address.length < 8) {
    errors.address = "Enter a complete street address, city, state, and ZIP code.";
  } else if (normalized.address.length > 240) {
    errors.address = "Keep the address under 240 characters.";
  }

  if (!emailPattern.test(normalized.email)) {
    errors.email = "Enter a valid email address.";
  } else if (normalized.email.length > 254) {
    errors.email = "Keep the email address under 254 characters.";
  }

  if (normalized.website) {
    try {
      const url = new URL(normalized.website);
      if (!url.hostname.includes(".") || !["http:", "https:"].includes(url.protocol)) {
        errors.website = "Enter a public website address.";
      }
    } catch {
      errors.website = "Enter a valid website address.";
    }
  }

  if (normalized.notes.length > 1000) {
    errors.notes = "Keep notes under 1,000 characters.";
  }

  return errors;
}

export function isIntakeValid(values: IntakeValues) {
  return Object.keys(validateIntake(values)).length === 0;
}
