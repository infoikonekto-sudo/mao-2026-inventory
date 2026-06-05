import { useEffect, useState, useCallback } from 'react'
import {
  createInAppNotification,
  getInAppNotifications,
  subscribeToInAppNotifications,
  markNotificationAsRead,
} from '@/services/supabaseClient'

export type InAppNotification = {
  id: string
  license_id: string
  recipient_user_id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

import { useAuthStore } from '@/stores/authStore'

export default function useNotifications(licenseId: string, userId: string) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const user = useAuthStore.getState().user
      const role = user?.role || null
      const data = await getInAppNotifications(licenseId, userId, role, 50)
      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.read).length)
    } catch (err) {
      console.error('Error loading in-app notifications:', err)
    }
  }, [licenseId, userId])

  useEffect(() => {
    if (!licenseId || !userId) return
    load()
    const channel = subscribeToInAppNotifications(licenseId, userId, (payload: any) => {
      // payload.record contiene la fila nueva
      const record = payload.record
      setNotifications(prev => [record, ...prev])
      setUnreadCount(c => c + (record.read ? 0 : 1))
    })

    return () => {
      try {
        if (channel && (channel as any).unsubscribe) (channel as any).unsubscribe()
      } catch (e) {
        // Ignorar
      }
    }
  }, [licenseId, userId, load])

  async function sendInAppNotification(toUserId: string, title: string, message: string, relatedType?: string, relatedId?: string) {
    return createInAppNotification({
      license_id: licenseId,
      recipient_user_id: toUserId,
      title,
      message,
      related_type: relatedType,
      related_id: relatedId,
      read: false,
    })
  }

  async function markAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  return {
    notifications,
    unreadCount,
    reload: load,
    sendInAppNotification,
    markAsRead,
  }
}
