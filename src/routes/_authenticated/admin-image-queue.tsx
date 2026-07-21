import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { getImageQueueStats } from '@/lib/excel-import.functions'

export const Route = createFileRoute('/_authenticated/admin-image-queue')({
  head: () => ({
    meta: [{ title: 'طابور توليد صور المنتجات — لوحة التحكم' }],
  }),
  component: AdminImageQueue,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-600" dir="rtl">فشل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8" dir="rtl">غير موجود</div>,
})

function AdminImageQueue() {
  const q = useQuery({
    queryKey: ['admin', 'image-queue'],
    queryFn: () => getImageQueueStats(),
    refetchInterval: 15_000,
  })

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6 pt-24">
      <header className="flex items-center gap-3">
        <ImageIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طابور توليد صور المنتجات</h1>
          <p className="text-sm text-gray-600">
            حالة معالجة صور الكتالوج. سيقوم العمّال الخلفيون بتحديث المنتجات تلقائياً.
          </p>
        </div>
      </header>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : q.data ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">إجمالي المنتجات في الطابور</p>
            <p className="mt-2 text-4xl font-black text-primary">
              {q.data.total.toLocaleString('ar-EG')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(q.data.by_status).map(([status, count]) => (
              <div
                key={status}
                className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500">{status}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {count.toLocaleString('ar-EG')}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            يتم التحديث تلقائياً كل 15 ثانية.
          </p>
        </>
      ) : null}
    </div>
  )
}
