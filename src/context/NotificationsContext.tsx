import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/shared/services/supabase'
import type { Notification } from '@/types'

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  subscribe: () => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [subscription, setSubscription] = useState<any>(null)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data as Notification[])
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }
  }, [notifications])

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const subscribe = useCallback(() => {
    if (subscription) return

    const sub = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 50))
      })
      .subscribe()

    setSubscription(sub)
  }, [subscription])

  useEffect(() => {
    fetchNotifications()
    subscribe()
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [])

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      subscribe,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider')
  return context
}
