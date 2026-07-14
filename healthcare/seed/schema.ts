import { z } from "zod";

export const seedRowSchema = z.object({
  full_name: z.string().min(3),
  specialty: z.string().min(2),
  facility: z.string().min(2),
  city: z.string().min(2),
  area: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  schedule: z.string().optional().default(""),
  experience: z.coerce.number().int().min(0).max(80).optional(),
  verification_status: z.enum(["verified", "pending"]).default("pending"),
  source: z.enum(["hospital", "doctor", "official", "public"]).default("public"),
  confidence_level: z.enum(["A", "B", "C", "D"]).optional(),
});

export type SeedRow = z.infer<typeof seedRowSchema>;
