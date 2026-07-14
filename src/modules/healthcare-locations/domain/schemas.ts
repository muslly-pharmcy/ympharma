import { z } from "zod";

export const createLocationSchema = z.object({
  organization_id: z.string().uuid(),
  branch_id: z.string().uuid().nullish(),
  kind: z.enum(["clinic", "hospital", "medical_center", "pharmacy_clinic"]),
  name_ar: z.string().min(2).max(200),
  name_en: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  city: z.string().max(120).nullish(),
  governorate: z.string().max(120).nullish(),
  country: z.string().length(2).default("YE"),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  phone: z.string().max(40).nullish(),
  email: z.string().email().nullish(),
  whatsapp: z.string().max(40).nullish(),
  working_hours: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
