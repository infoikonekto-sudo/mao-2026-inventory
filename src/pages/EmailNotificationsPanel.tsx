import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getPendingEmailNotifications } from '@/services/supabaseClient'
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailNotification {
  id: string
  recipient_email: string
  subject: string
  notification_type: string
  sent: boolean
  sent_at: string | null
  created_at: string
  error_message: string | null
}

export default function EmailNotificationsPanel() {
  const { user, license } = useAuthStore()
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('pending')

  const isAdmin = user && (user.role === 'admin' || user.role === 'jefe_compras')

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (user && license && isAdmin) {
          const data = await getPendingEmailNotifications()
          setNotifications(data || [])
        }
      } catch (error) {
        console.error('Error loading notifications:', error)
        toast.error('Error al cargar notificaciones')
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
    // Recargar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [user, license, isAdmin])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const data = await getPendingEmailNotifications()
      setNotifications(data || [])
      toast.success('Notificaciones actualizadas')
    } catch (error) {
      console.error('Error refreshing notifications:', error)
      toast.error('Error actualizando notificaciones')
    } finally {
      setLoading(false)
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'sent') return n.sent
    if (filter === 'pending') return !n.sent
    return true
  })

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.sent).length,
    pending: notifications.filter(n => !n.sent).length,
    errors: notifications.filter(n => n.error_message).length,
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notificaciones por Email</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          <p className="text-xs text-gray-600">Enviados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-600">Pendientes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          <p className="text-xs text-gray-600">Errores</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Todos ({stats.total})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Pendientes ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'sent'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Enviados ({stats.sent})
        </button>
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Cargando notificaciones...
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filtered.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {notif.sent ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : notif.error_message ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{notif.subject}</p>
                        <p className="text-sm text-gray-600">Para: {notif.recipient_email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tipo: {notif.notification_type}
                        </p>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            notif.sent
                              ? 'bg-green-100 text-green-800'
                              : notif.error_message
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {notif.sent ? 'Enviado' : notif.error_message ? 'Error' : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    {notif.error_message && (
                      <p className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                        Error: {notif.error_message}
                      </p>
                    )}

                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        Creada: {new Date(notif.created_at).toLocaleString('es-GT')}
                      </span>
                      {notif.sent_at && (
                        <span>
                          Enviada: {new Date(notif.sent_at).toLocaleString('es-GT')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {filter === 'pending'
              ? 'No hay notificaciones pendientes'
              : filter === 'sent'
              ? 'No hay notificaciones enviadas'
              : 'No hay notificaciones'}
          </div>
        )}
      </div>
    </div>
  )
}
