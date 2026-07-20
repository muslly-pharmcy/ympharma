// Server functions to run clinical checks against a stored prescription.

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ClinicalCheckInput } from '@/domain/clinical/types'

export const runClinicalCheckForPrescription = createServerFn({ method: 'POST' })
  .inputValidator((raw: unknown) => z.object({
    prescriptionId: z.string().uuid(),
    providerId: z.string().optional(),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { getActor, requirePermission, requireOrg } = await import('./session.server')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { runClinicalCheck } = await import('./clinical/engine.server')

    const actor = await getActor()
    requirePermission(actor, 'prescription.read')

    const { data: rx, error } = await supabaseAdmin
      .from('hc_prescriptions')
      .select('id, organization_id, patient_id')
      .eq('id', data.prescriptionId).single()
    if (error || !rx) throw new Error(error?.message ?? 'Prescription not found')
    requireOrg(actor, (rx as { organization_id: string }).organization_id)

    const [{ data: items }, { data: patient }, { data: allergies }, { data: conditions }] = await Promise.all([
      supabaseAdmin.from('hc_prescription_items').select('id, product_id, drug_code, drug_name, dose, frequency, route').eq('prescription_id', data.prescriptionId),
      supabaseAdmin.from('hc_patients').select('id, date_of_birth, sex, weight_kg').eq('id', (rx as { patient_id: string }).patient_id).single(),
      supabaseAdmin.from('patient_allergies').select('substance, code').eq('patient_id', (rx as { patient_id: string }).patient_id),
      supabaseAdmin.from('patient_conditions').select('label, code').eq('patient_id', (rx as { patient_id: string }).patient_id),
    ])

    const dob = (patient as { date_of_birth?: string | null } | null)?.date_of_birth
    const ageYears = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10) : null

    const input: ClinicalCheckInput = {
      patient: {
        patientId: (rx as { patient_id: string }).patient_id,
        ageYears,
        sex: ((patient as { sex?: string | null } | null)?.sex ?? null) as 'male' | 'female' | 'other' | null,
        weightKg: (patient as { weight_kg?: number | null } | null)?.weight_kg ?? null,
        pregnant: null,
        breastfeeding: null,
        renalFunctionEgfr: null,
        hepaticImpairment: null,
        knownAllergies: (allergies ?? []).map((a) => ({ substance: (a as { substance: string }).substance, code: (a as { code: string | null }).code ?? null })),
        activeConditions: (conditions ?? []).map((c) => ({ label: (c as { label: string }).label, code: (c as { code: string | null }).code ?? null })),
      },
      drugs: (items ?? []).map((it) => {
        const row = it as { id: string; product_id: string | null; drug_code: string | null; drug_name: string; dose: string | null; frequency: string | null; route: string | null }
        return {
          itemId: row.id,
          productId: row.product_id,
          code: row.drug_code,
          name: row.drug_name,
          dose: row.dose,
          frequency: row.frequency,
          route: row.route,
        }
      }),
    }

    const result = await runClinicalCheck(input, data.providerId)
    return result
  })
