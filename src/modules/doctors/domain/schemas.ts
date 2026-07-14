import { z } from "zod";

export const createDoctorSchema = z.object({
  organization_id: z.string().uuid().nullish(),
  user_id: z.string().uuid().nullish(),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  full_name_ar: z.string().min(2).max(200),
  full_name_en: z.string().max(200).nullish(),
  title: z.string().max(120).nullish(),
  bio_ar: z.string().max(4000).nullish(),
  bio_en: z.string().max(4000).nullish(),
  photo_url: z.string().url().nullish(),
  years_experience: z.number().int().min(0).max(80).nullish(),
  languages: z.array(z.string()).default([]),
  gender: z.enum(["male", "female", "other"]).nullish(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const submitVerificationSchema = z.object({
  doctor_id: z.string().uuid(),
  documents: z.array(z.object({
    kind: z.string(),
    url: z.string().url(),
    note: z.string().max(500).optional(),
  })).default([]),
});
export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;

export const verifyDoctorSchema = z.object({
  doctor_id: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).nullish(),
});
export type VerifyDoctorInput = z.infer<typeof verifyDoctorSchema>;

export const createSpecialtySchema = z.object({
  code: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
  name_ar: z.string().min(2).max(120),
  name_en: z.string().min(2).max(120),
  description_ar: z.string().max(1000).nullish(),
  description_en: z.string().max(1000).nullish(),
  sort_order: z.number().int().default(0),
});
export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;
