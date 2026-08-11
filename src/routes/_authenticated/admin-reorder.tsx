import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw, TrendingDown, PackagePlus, Loader2 } from 'lucide-react'
import {
  decideReorderSuggestion,
  listReorderSuggestions,
  refreshReorder,
} from '@/lib/reorder.functions'
import { useOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authenticated/admin-reorder')({
  component: ReorderPage,
  head: () => ({
    meta: [
      { title: 'اقتراحات إعادة الطلب التنبؤية | صيدلية المصلي' },
      {
        name: 'description',
        content:
          'لوحة تنبؤية تحسب معدل الاستهلاك اليومي ونقطة إعادة الطلب لكل صنف لتفادي نفاد المخزون.',
      },
      { property: 'og:title', content: 'اقتراحات إعادة الطلب التنبؤية' },
      {
        property: 'og:description',
        content: 'تنبؤ بالمخزون الناقص بناءً على الاستهلاك الفعلي ومدة التوريد.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
})

function coverTone(days: number | null): string {
  if (days === null) return 'bg-muted text-muted-foreground'
  if (days <= 7) return 'bg-destructive/15 text-destructive'
  if (days <= 21) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
}

function ReorderPage() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const [leadTimeDays, setLeadTimeDays] = useState(14)

  const list = useServerFn(listReorderSuggestions)
  const refresh = useServerFn(refreshReorder)
  const decide = useServerFn(decideReorderSuggestion)

  const { data, isLoading } = useQuery({
    queryKey: ['reorder-suggestions', organizationId],
    queryFn: () => list({ data: { organizationId: organizationId!, status: 'open' } }),
    enabled: Boolean(organizationId),
  })

  const refreshMutation = useMutation({
    mutationFn: () => refresh({ data: { organizationId: organizationId!, leadTimeDays } }),
    onSuccess: (result) => {
      toast.success(`تم تحديث ${result.persisted} اقتراح إعادة طلب`)
      void queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const decideMutation = useMutation({
    mutationFn: (vars: { id: string; status: 'dismissed' | 'ordered' }) =>
      decide({ data: vars }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const rows = data ?? []
  const critical = useMemo(
    () => rows.filter((r) => (r.days_of_cover ?? 999) <= 7).length,
    [rows],
  )

  return (
    <div dir="rtl" className="container mx-auto space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">اقتراحات إعادة الطلب التنبؤية</h1>
          <p className="text-sm text-muted-foreground">
            تُحسب من الاستهلاك الفعلي خلال آخر ٩٠ يوماً مع مخزون أمان يراعي تذبذب الطلب.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="lead-time">
            مدة التوريد (يوم)
          </label>
          <input
            id="lead-time"
            type="number"
            min={1}
            max={180}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Number(e.target.value) || 14)}
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
          />
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={!organizationId || refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="ms-2 h-4 w-4" />
            )}
            إعادة الحساب
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">أصناف تحتاج طلباً</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">حرِج (≤ ٧ أيام)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{critical}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الكميات المقترحة</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {rows.reduce((sum, r) => sum + r.suggested_qty, 0).toLocaleString('ar')}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <PackagePlus className="h-8 w-8" />
              <p>لا توجد اقتراحات حالياً — كل الأصناف ضمن مستوى الأمان.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">الصنف</th>
                    <th className="p-3">المخزن</th>
                    <th className="p-3">المتوفر</th>
                    <th className="p-3">الاستهلاك/يوم</th>
                    <th className="p-3">تغطية</th>
                    <th className="p-3">نقطة الطلب</th>
                    <th className="p-3">الكمية المقترحة</th>
                    <th className="p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="p-3 font-medium">{row.product_name ?? row.product_id}</td>
                      <td className="p-3 text-muted-foreground">{row.warehouse_name ?? '—'}</td>
                      <td className="p-3">{row.on_hand.toLocaleString('ar')}</td>
                      <td className="p-3">{row.daily_burn_rate.toFixed(2)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={coverTone(row.days_of_cover)}>
                          <TrendingDown className="ms-1 h-3 w-3" />
                          {row.days_of_cover === null
                            ? '—'
                            : `${Math.round(row.days_of_cover)} يوم`}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.reorder_point}</td>
                      <td className="p-3 font-bold text-primary">{row.suggested_qty}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={decideMutation.isPending}
                            onClick={() =>
                              decideMutation.mutate({ id: row.id, status: 'ordered' })
                            }
                          >
                            تم الطلب
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={decideMutation.isPending}
                            onClick={() =>
                              decideMutation.mutate({ id: row.id, status: 'dismissed' })
                            }
                          >
                            تجاهل
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
