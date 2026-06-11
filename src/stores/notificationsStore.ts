import { create } from 'zustand'

export interface NotificationItem {
  id: string
  title: string
  message: string
  created_at: string
  read: boolean
}

interface NotificationsState {
  pendingRequisitions: number
  notifications: NotificationItem[]
  setPendingRequisitions: (count: number) => void
  addNotification: (notification: NotificationItem) => void
  markAllAsRead: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  pendingRequisitions: 0,
  notifications: [],
  setPendingRequisitions: (count) => set({ pendingRequisitions: count }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications],
    pendingRequisitions: state.pendingRequisitions + 1 
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
}))
