import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Small banner that appears when the device loses network.
 * Client-only: reads navigator.onLine after mount to avoid SSR mismatch.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!mounted || online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-white shadow-md sm:text-sm"
      dir="rtl"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>لا يوجد اتصال بالإنترنت — بعض الميزات قد لا تعمل حتى يعود الاتصال.</span>
    </div>
  )
}
