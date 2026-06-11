import { User } from '@/types'
import { Bell, Menu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useAuthStore } from '@/stores/authStore'

interface TopBarProps {
  onToggleSidebar: () => void
  user: User
}

export default function TopBar({ onToggleSidebar, user }: TopBarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { license } = useAuthStore()
  const { notifications, setPendingRequisitions, addNotification, markAllAsRead } = useNotificationsStore()
  
  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element with a standard soft notification sound (base64 to avoid external files)
    const audioUrl = "data:audio/wav;base64,UklGRq4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWoAAACAgICAgICAgICAgICAgICAgICAf3p2eHd5eHl5eHl5eHl4eHl4eXd3eHh5enqAgICAgICAe3x8e3t7e3t7e3t7e3t8fHyAgICAgICAfHx8fHx8fHx8fHx8fHx8fHyAgICAgICAgICAgICAgICAgICAgICAgICAgIAA"
    audioRef.current = new Audio(audioUrl)
    audioRef.current.volume = 0.5
    
    if (!license) return

    // 1. Fetch initial pending requisitions count
    const fetchPending = async () => {
      const { count } = await supabase
        .from('requisitions')
        .select('*', { count: 'exact', head: true })
        .eq('license_id', license.id)
        .eq('status', 'pendiente')
        
      if (count !== null) {
        setPendingRequisitions(count)
      }
    }
    
    fetchPending()

    // 2. Subscribe to realtime inserts
    const channel = supabase.channel('requisitions-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requisitions',
          filter: `license_id=eq.${license.id}`
        },
        (payload) => {
          if (payload.new.status === 'pendiente') {
            // Play sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error("Audio play failed:", e))
            }
            
            // Add notification
            addNotification({
              id: payload.new.id,
              title: 'Nueva Requisición',
              message: `Requisición ${payload.new.requisition_number || 'nueva'} creada.`,
              created_at: payload.new.created_at || new Date().toISOString(),
              read: false
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [license])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Side - Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <Menu size={24} />
        </button>

        {/* Center - Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">Panel Principal</span>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-4 ml-auto lg:ml-0">
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar..."
            className="hidden md:flex px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
          />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen)
                if (!notificationsOpen) markAllAsRead()
              }}
              className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-error text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No hay notificaciones nuevas
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map(notif => (
                        <div key={notif.id} className={`p-4 ${notif.read ? 'bg-white' : 'bg-blue-50'}`}>
                          <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {new Date(notif.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={user.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.full_name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500">Conectado</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
