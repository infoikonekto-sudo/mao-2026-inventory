import { useState } from 'react'
import useNotifications from '@/hooks/useNotifications'
import { useAuthStore } from '@/stores/authStore'

export default function NotificationBell() {
  const { user } = useAuthStore()
  const licenseId = user?.license_id || ''
  const userId = user?.id || ''
  // const userRole = user?.role || '' // Not needed yet
  const { notifications, unreadCount, markAsRead } = useNotifications(licenseId, userId)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        aria-label="Notificaciones"
        className="relative p-2 rounded hover:bg-gray-100"
        onClick={() => setOpen(!open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 17H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 8C18 5.23858 15.7614 3 13 3V3C10.2386 3 8 5.23858 8 8C8 15 5 17 5 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
          <div className="p-2 border-b font-semibold">Notificaciones</div>
          <div className="max-h-64 overflow-auto">
            {notifications.length === 0 && <div className="p-3 text-sm text-gray-500">No hay notificaciones</div>}
            {notifications.map((n: any) => (
              <div key={n.id} className={`p-3 border-b hover:bg-gray-50 ${n.read ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-sm text-gray-600">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.read && (
                    <button
                      className="ml-2 text-sm text-blue-600"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await markAsRead(n.id)
                      }}
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
