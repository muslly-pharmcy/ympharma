import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


const InsuranceSubmissionSchema = z.object({
  insuranceNumber: z.string().trim().min(3).max(80),
  insuranceCompany: z.string().trim().min(2).max(120).default("المتخصصة للتأمين"),
  patientName: z.string().trim().min(2).max(120),
  patientPhone: z.string().trim().min(7).max(20),
  cardImageUrl: z.string().min(3).max(500).nullish(),
  cardExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  prescriptionImageUrl: z.string().min(3).max(500).nullish(),
  prescriptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  diagnosis: z.string().trim().min(2).max(1000).nullish(),
  isStamped: z.boolean().default(false),
  channel: z.enum(["web", "whatsapp"]).default("web"),
});

export type InsuranceSubmission = z.infer<typeof InsuranceSubmissionSchema>;

/** Validate an insurance submission. Returns list of issues + ok flag. */
export function validateInsuranceSubmission(data: InsuranceSubmission) {
  const issues: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (data.cardExpiry) {
    const exp = new Date(data.cardExpiry);
    if (isNaN(exp.getTime())) issues.push("تاريخ انتهاء البطاقة غير صالح");
    else if (exp < today) issues.push("بطاقة التأمين منتهية الصلاحية — لا يمكن قبول الطلب");
  } else {
    issues.push("يجب إدخال تاريخ انتهاء بطاقة التأمين");
  }

  if (!data.cardImageUrl) issues.push("صورة بطاقة التأمين مطلوبة");
  if (!data.prescriptionImageUrl) issues.push("صورة الوصفة الطبية مطلوبة");

  if (data.prescriptionDate) {
    const rxDate = new Date(data.prescriptionDate);
    const diffDays = Math.floor((today.getTime() - rxDate.getTime()) / 86400000);
    if (isNaN(rxDate.getTime())) issues.push("تاريخ الوصفة غير صالح");
    else if (diffDays > 7) issues.push("الوصفة قديمة (أكثر من 7 أيام). يجب إرسال وصفة بنفس تاريخ الإرسال أو خلال أسبوع");
    else if (diffDays < 0) issues.push("تاريخ الوصفة في المستقبل");
  } else {
    issues.push("تاريخ الوصفة مطلوب");
  }

  if (!data.diagnosis || data.diagnosis.trim().length < 3) {
    issues.push("التشخيص مطلوب — يجب أن يكون مكتوباً في الوصفة الطبية");
  }
  if (!data.isStamped) {
    issues.push("يجب تأكيد أن الوصفة مختومة من الطبيب أو العيادة");
  }

  return { ok: issues.length === 0, issues };
}

/** Public submission endpoint — anyone can submit, server-side validates. */
export const submitInsuranceClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsuranceSubmissionSchema.parse(input))
  .handler(async ({ data }) => {
    const validation = validateInsuranceSubmission(data);

    // Use admin client because the public form has no session and the insert
    // policy is INSERT-only for anon (no SELECT to read back the row).
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: row, error } = await supabase
      .from("insurance_claims")
      .insert({
        insurance_number: data.insuranceNumber,
        insurance_company: data.insuranceCompany,
        patient_name: data.patientName,
        patient_phone: data.patientPhone,
        card_image_url: data.cardImageUrl ?? null,
        card_expiry: data.cardExpiry ?? null,
        prescription_image_url: data.prescriptionImageUrl ?? null,
        prescription_date: data.prescriptionDate ?? null,
        diagnosis: data.diagnosis ?? null,
        is_stamped: data.isStamped,
        channel: data.channel,
        status: validation.ok ? "pending" : "needs_info",
        validation_notes: validation.issues.join(" • ") || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Notify staff via WhatsApp (fire-and-forget, errors swallowed).
    try {
      const token = process.env.WHATSAPP_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const staffPhone = "967782878280";
      if (token && phoneId) {
        const text = `🩺 طلب تأمين جديد\nالمريض: ${data.patientName}\nالشركة: ${data.insuranceCompany}\nرقم التأمين: ${data.insuranceNumber}\nالجوال: ${data.patientPhone}\nالحالة: ${validation.ok ? "صالح ✅" : "ناقص ⚠️ " + validation.issues.join("؛ ")}\nمعرف: ${row.id}`;
        await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: staffPhone,
            type: "text",
            text: { body: text.slice(0, 4000) },
          }),
        });
      }
    } catch { /* swallow */ }

    return { ok: true, id: row.id, validation };
  });
