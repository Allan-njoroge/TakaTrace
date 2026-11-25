import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  organization: z.string().max(120).optional().or(z.literal("")),
  topic: z.enum(["GENERAL", "REPORT_RECEIPT", "JOIN_CENTRE", "JOIN_BRAND"]),
  message: z.string().min(10, "Tell us a little more.").max(2000),
  receiptId: z.string().optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
