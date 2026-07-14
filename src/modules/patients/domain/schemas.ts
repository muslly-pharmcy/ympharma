import { z } from "zod";

export const createPatientSchema = z.object({
  organization_id: z.string().uuid().nullish(),
  full_name: z.string().min(2).max(200),
  phone: z.string().max(40).nullish(),
  date_of_birth: z.string().date().nullish(),
  gender: z.enum(["male", "female", "other"]).nullish(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
