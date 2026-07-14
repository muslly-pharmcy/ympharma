// Additive schemas for Phoenix Omega S1 — Doctor Network completion.
import { z } from "zod";

export const practiceTypeEnum = z.enum([
  "gov_hospital",
  "private_hospital",
  "military_hospital",
  "teaching_hospital",
  "clinic",
  "medical_center",
  "charity",
  "ngo",
]);
export type PracticeType = z.infer<typeof practiceTypeEnum>;

export const bookingMethodEnum = z.enum(["walk_in", "phone", "whatsapp", "online", "assistant"]);
export type BookingMethod = z.infer<typeof bookingMethodEnum>;

export const workingHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
    close: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
    closed: z.boolean().optional(),
  }).nullish(),
).default({});

export const upsertPracticeSchema = z.object({
  id: z.string().uuid().optional(),
  doctor_id: z.string().uuid(),
  location_id: z.string().uuid(),
  practice_type: practiceTypeEnum.default("clinic"),
  working_hours: workingHoursSchema,
  phone: z.string().max(40).nullish(),
  whatsapp: z.string().max(40).nullish(),
  assistant_phone: z.string().max(40).nullish(),
  booking_method: bookingMethodEnum.default("phone"),
  consultation_duration_min: z.number().int().min(5).max(240).nullish(),
  gallery: z.array(z.string().url()).default([]),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
  notes: z.string().max(1000).nullish(),
});
export type UpsertPracticeInput = z.infer<typeof upsertPracticeSchema>;

export const joinSubmissionSchema = z.object({
  full_name_ar: z.string().trim().min(3).max(200),
  full_name_en: z.string().trim().max(200).nullish(),
  title: z.string().max(120).nullish(),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(255).nullish().or(z.literal("")),
  city: z.string().max(80).nullish(),
  governorate: z.string().max(80).nullish(),
  claimed_specialties: z.array(z.string().max(80)).default([]),
  practice_wishlist: z.array(z.object({
    facility_name: z.string().max(200),
    kind: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
  })).default([]),
  documents: z.array(z.object({
    kind: z.string().max(40),
    url: z.string().url(),
    note: z.string().max(500).optional(),
  })).default([]),
  biography: z.string().max(2000).nullish(),
});
export type JoinSubmissionInput = z.infer<typeof joinSubmissionSchema>;

export const reviewJoinSchema = z.object({
  submission_id: z.string().uuid(),
  decision: z.enum(["approve", "reject", "duplicate", "reviewing"]),
  reviewer_notes: z.string().max(2000).nullish(),
  duplicate_of: z.string().uuid().nullish(),
});
export type ReviewJoinInput = z.infer<typeof reviewJoinSchema>;

export const updateDoctorProfileSchema = z.object({
  doctor_id: z.string().uuid(),
  patch: z.object({
    full_name_ar: z.string().min(2).max(200).optional(),
    full_name_en: z.string().max(200).nullish(),
    title: z.string().max(120).nullish(),
    academic_title: z.string().max(120).nullish(),
    medical_title: z.string().max(120).nullish(),
    bio_ar: z.string().max(4000).nullish(),
    bio_en: z.string().max(4000).nullish(),
    photo_url: z.string().url().nullish(),
    years_experience: z.number().int().min(0).max(80).nullish(),
    languages: z.array(z.string().max(20)).optional(),
    sub_specialties: z.array(z.string().max(80)).optional(),
    certificates: z.array(z.object({
      title: z.string().max(200),
      issuer: z.string().max(200).optional(),
      year: z.number().int().optional(),
      url: z.string().url().optional(),
    })).optional(),
    awards: z.array(z.object({
      title: z.string().max(200),
      year: z.number().int().optional(),
    })).optional(),
    services: z.array(z.object({
      name: z.string().max(200),
      description: z.string().max(500).optional(),
      fee: z.number().optional(),
    })).optional(),
    accepted_insurance: z.array(z.string().uuid()).optional(),
    consultation_fee_min: z.number().nullish(),
    consultation_fee_max: z.number().nullish(),
    currency: z.string().max(8).optional(),
    gallery: z.array(z.string().url()).optional(),
    intro_video_url: z.string().url().nullish(),
    seo_title_ar: z.string().max(160).nullish(),
    seo_desc_ar: z.string().max(300).nullish(),
    telemedicine_ready: z.boolean().optional(),
    emergency_available: z.boolean().optional(),
  }),
});
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
