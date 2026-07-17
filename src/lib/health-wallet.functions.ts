import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Wave A · Digital Health Wallet.
 * Aggregation view over existing tables — no new storage, all RLS applies.
 */

export interface WalletIdentity {
  patient_id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

export interface WalletMedication {
  id: string;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  active: boolean;
}

export interface WalletVaultFile {
  id: string;
  file_type: string;
  title: string;
  created_at: string;
}

export interface WalletAppointment {
  id: string;
  starts_at: string;
  status: string;
  doctor_id: string;
  location_id: string;
}

export interface WalletCoverage {
  id: string;
  company_id: string;
  policy_no: string | null;
  valid_to: string | null;
  copay_percent: number | null;
}

export interface WalletEmergency {
  blood_type: string | null;
  allergies: string[];
  emergency_contact: string | null;
}

export interface HealthWalletDTO {
  identity: WalletIdentity | null;
  medications: WalletMedication[];
  vault: WalletVaultFile[];
  upcoming_appointments: WalletAppointment[];
  coverage: WalletCoverage[];
  emergency: WalletEmergency;
}

const EMPTY_EMERGENCY: WalletEmergency = { blood_type: null, allergies: [], emergency_contact: null };

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HealthWalletDTO> => {
    const { supabase, userId } = context;

    const { data: patient, error: pErr } = await supabase
      .from("hc_patients")
      .select("id, full_name, phone, date_of_birth, gender, metadata")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw pErr;

    if (!patient) {
      return {
        identity: null,
        medications: [],
        vault: [],
        upcoming_appointments: [],
        coverage: [],
        emergency: EMPTY_EMERGENCY,
      };
    }

    const patientId = patient.id as string;
    const meta = (patient.metadata ?? {}) as Record<string, unknown>;
    const emergency: WalletEmergency = {
      blood_type: (meta.blood_type as string | undefined) ?? null,
      allergies: Array.isArray(meta.allergies) ? (meta.allergies as string[]) : [],
      emergency_contact: (meta.emergency_contact as string | undefined) ?? null,
    };

    const [medRes, vaultRes, apptRes, covRes] = await Promise.all([
      supabase
        .from("patient_medications")
        .select("id, medicine_name, dosage, frequency, active")
        .eq("patient_id", patientId)
        .eq("active", true)
        .order("start_date", { ascending: false })
        .limit(50),
      supabase
        .from("medical_vault_files")
        .select("id, file_type, title, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("hc_appointments")
        .select("id, starts_at, status, doctor_id, location_id")
        .eq("patient_id", patientId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20),
      supabase
        .from("ins_patient_coverage")
        .select("id, company_id, policy_no, valid_to, copay_percent")
        .eq("patient_id", patientId)
        .order("valid_to", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);

    if (medRes.error) throw medRes.error;
    if (vaultRes.error) throw vaultRes.error;
    if (apptRes.error) throw apptRes.error;
    if (covRes.error) throw covRes.error;

    return {
      identity: {
        patient_id: patientId,
        full_name: patient.full_name as string,
        phone: (patient.phone as string | null) ?? null,
        date_of_birth: (patient.date_of_birth as string | null) ?? null,
        gender: (patient.gender as string | null) ?? null,
      },
      medications: (medRes.data ?? []) as unknown as WalletMedication[],
      vault: (vaultRes.data ?? []) as unknown as WalletVaultFile[],
      upcoming_appointments: (apptRes.data ?? []) as unknown as WalletAppointment[],
      coverage: (covRes.data ?? []) as unknown as WalletCoverage[],
      emergency,
    };
  });
