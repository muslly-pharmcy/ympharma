import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export interface KernelTelemetry {
  errors24h: number
  agentRuns24h: number
  agentFailures24h: number
  openReorderSuggestions: number
  dlqDepth: number
}

export type ProposalSeverity = 'info' | 'warning' | 'critical'

export interface KernelProposal {
  id: string
  severity: ProposalSeverity
  title: string
  detail: string
  action: string
}

export interface KernelEvolutionReport {
  telemetry: KernelTelemetry
  proposals: KernelProposal[]
  generatedAt: string
}

function since(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

/**
 * Reads live kernel telemetry and derives deterministic self-optimization
 * proposals. Read-only: nothing is auto-applied without a human decision.
 */
export const getKernelEvolution = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KernelEvolutionReport> => {
    const day = since(24)
    const count = async (
      table: string,
      apply: (q: ReturnType<typeof buildBase>) => ReturnType<typeof buildBase>,
    ): Promise<number> => {
      try {
        const { count: n } = await apply(buildBase(table))
        return n ?? 0
      } catch {
        return 0
      }
    }
    function buildBase(table: string) {
      return context.supabase.from(table).select('id', { count: 'exact', head: true })
    }

    const [errors24h, agentRuns24h, agentFailures24h, openReorder, dlqDepth] =
      await Promise.all([
        count('error_logs', (q) => q.gte('created_at', day)),
        count('agent_runs', (q) => q.gte('created_at', day)),
        count('agent_runs', (q) => q.gte('created_at', day).eq('status', 'failed')),
        count('inv_reorder_suggestions', (q) => q.eq('status', 'open')),
        count('agent_events_dlq', (q) => q.gte('created_at', since(24 * 7))),
      ])

    const telemetry: KernelTelemetry = {
      errors24h,
      agentRuns24h,
      agentFailures24h,
      openReorderSuggestions: openReorder,
      dlqDepth,
    }

    const proposals: KernelProposal[] = []

    if (errors24h > 50) {
      proposals.push({
        id: 'errors-spike',
        severity: 'critical',
        title: 'ارتفاع معدل الأخطاء خلال 24 ساعة',
        detail: `تم تسجيل ${errors24h} خطأ. راجع سجل الأخطاء وحدد أكثر المسارات تكرارًا.`,
        action: 'فتح لوحة تشخيص الأخطاء وإصلاح أعلى ثلاثة مصادر.',
      })
    }

    const failureRate =
      agentRuns24h > 0 ? Math.round((agentFailures24h / agentRuns24h) * 100) : 0
    if (agentRuns24h > 0 && failureRate >= 20) {
      proposals.push({
        id: 'agent-failures',
        severity: 'warning',
        title: `نسبة فشل الوكلاء ${failureRate}%`,
        detail: `${agentFailures24h} من ${agentRuns24h} تشغيلًا فشلت خلال 24 ساعة.`,
        action: 'تقليل التزامن أو رفع مهلة الاستدعاء للوكلاء الفاشلة.',
      })
    }
    if (agentRuns24h === 0) {
      proposals.push({
        id: 'agents-idle',
        severity: 'warning',
        title: 'لا يوجد نشاط للوكلاء خلال 24 ساعة',
        detail: 'قد تكون مهام الجدولة متوقفة.',
        action: 'التحقق من جدولة التشغيل كل 12 ساعة.',
      })
    }
    if (dlqDepth > 0) {
      proposals.push({
        id: 'dlq-depth',
        severity: dlqDepth > 20 ? 'critical' : 'warning',
        title: `${dlqDepth} حدث في طابور الرسائل الميتة`,
        detail: 'أحداث لم تُعالج خلال الأسبوع الماضي.',
        action: 'تشغيل معالج DLQ ومراجعة الأحداث المتكررة الفشل.',
      })
    }
    if (openReorder > 0) {
      proposals.push({
        id: 'reorder-open',
        severity: openReorder > 25 ? 'warning' : 'info',
        title: `${openReorder} اقتراح إعادة طلب مفتوح`,
        detail: 'اقتراحات مبنية على معدل الاستهلاك ومخزون الأمان.',
        action: 'مراجعة الاقتراحات وتحويل المعتمد منها إلى أوامر شراء.',
      })
    }
    if (proposals.length === 0) {
      proposals.push({
        id: 'healthy',
        severity: 'info',
        title: 'النواة مستقرة',
        detail: 'لا توجد انحرافات تتطلب تدخلًا الآن.',
        action: 'لا إجراء مطلوب.',
      })
    }

    return { telemetry, proposals, generatedAt: new Date().toISOString() }
  })
