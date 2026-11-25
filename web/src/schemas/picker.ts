import { z } from "zod";

const KENYAN_MOBILE_PATTERN = /^(?:\+?254|0)?(7\d{8}|1\d{8})$/;

/** Normalises a Kenyan mobile number to +2547XXXXXXXX / +2541XXXXXXXX. */
export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\s+/g, "");
  const match = digits.match(KENYAN_MOBILE_PATTERN);
  if (!match) return digits;
  return `+254${match[1]}`;
}

export const pickerSchema = z.object({
  firstName: z.string().min(2, "Enter a first name.").max(40),
  lastName: z.string().min(1).max(40).optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Enter a phone number.")
    .refine((value) => KENYAN_MOBILE_PATTERN.test(value.replace(/\s+/g, "")), "Enter a valid Kenyan mobile number."),
  language: z.enum(["en", "sw"]),
  idNumber: z.string().max(20).optional().or(z.literal("")),
  consentConfirmed: z.boolean().refine((value) => value === true, "Consent is required to register a picker."),
});

export type PickerFormValues = z.infer<typeof pickerSchema>;
