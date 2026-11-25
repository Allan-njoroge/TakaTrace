import { z } from "zod";

const today = () => new Date().toISOString().slice(0, 10);

export const materialWeightSchema = z.object({
  material: z.enum(["PET", "HDPE", "LDPE", "PP", "PS", "OTHER"], { message: "Choose a material." }),
  weightKg: z
    .number({ message: "Enter the weight in kg." })
    .min(0.1, "Weight must be at least 0.10 kg.")
    .max(2000, "Weight must be 2000 kg or less."),
  weighedOn: z
    .string()
    .min(1, "Choose the date weighed.")
    .refine((value) => value <= today(), "The date can't be in the future.")
    .refine((value) => {
      const days = (Date.parse(today()) - Date.parse(value)) / 86_400_000;
      return days <= 7;
    }, "The date can't be more than 7 days ago."),
  note: z.string().max(280, "Notes are limited to 280 characters.").optional().or(z.literal("")),
});

export type MaterialWeightValues = z.infer<typeof materialWeightSchema>;
