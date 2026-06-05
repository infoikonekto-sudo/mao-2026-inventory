import { useEffect, useState } from 'react'
import { getPendingEmailNotifications, createEmailNotification } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { Mail, RefreshCw, Send, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function DiagnosticsPage() {
  const { user } = useAuthStore()
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({})
  const [pendingEmails, setPendingEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const diag: Record<string, any> = {
        documentReady: document.readyState,
        rootElement: !!document.getElementById('root'),
        windowLoaded: document.readyState === 'complete',
        userAgent: navigator.userAgent,
        userRole: user?.role,
        licenseId: user?.license_id
      }
      setDiagnostics(diag)

      const emails = await getPendingEmailNotifications()
      setPendingEmails(emails || [])
    } catch (error) {
      console.error('Error loading diagnostics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleSendTestEmail = async () => {
    if (!user?.email || !user?.license_id) {
      toast.error('No se pudo identificar al usuario o licencia')
      return
    }

    try {
      toast.loading('Encolando correo de prueba...')
      await createEmailNotification({
        license_id: user.license_id,
        recipient_email: user.email,
        subject: '🧪 Correo de Prueba - MAO 2026',
        body: `
          <h1>Diagnóstico de Correos</h1>
          <p>Este es un correo de prueba generado desde el panel de diagnósticos.</p>
          <p><strong>Usuario:</strong> ${user.full_name}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          <p>Si recibes esto, el sistema de cola (DB) está funcionando. Si no lo recibes en tu bandeja, el worker (\`processNotifications.mjs\`) no está corriendo o falta configurar el SENDGRID_API_KEY.</p>
        `,
        notification_type: 'test_notification'
      })
      toast.dismiss()
      toast.success('Correo de prueba encolado exitosamente')
      await loadData()
    } catch (error) {
      toast.dismiss()
      toast.error('Error al encolar correo')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Diagnóstico del Sistema
        </h1>
        <button onClick={loadData} className="btn-secondary text-sm">Actualizar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Browser Stats */}
        <div className="card p-6 border border-gray-200 shadow-sm surface">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700">
            <AlertCircle size={20} />
            Estado del Navegador
          </h2>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-40">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>

        {/* Email Stats */}
        <div className="card p-6 border border-gray-200 shadow-sm surface">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600">
            <Mail size={20} />
            Cola de Correos
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-orange-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-orange-800 font-medium">Correos Pendientes</p>
                <p className="text-2xl font-bold text-orange-900">{pendingEmails.length}</p>
              </div>
              <Mail className="text-orange-400 opacity-50" size={40} />
            </div>

            <button
              onClick={handleSendTestEmail}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Enviar Correo de Prueba
            </button>
            <p className="text-[10px] text-gray-500 italic text-center">
              * El correo se enviará a: {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Queue List */}
      {pendingEmails.length > 0 && (
        <div className="card p-6 border border-gray-200 shadow-sm surface">
          <h3 className="text-md font-bold mb-4 text-gray-700 uppercase tracking-wider">Detalle de Cola Pendiente</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-2">Destinatario</th>
                  <th className="p-2">Asunto</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Creado</th>
                </tr>
              </thead>
              <tbody>
                {pendingEmails.map(email => (
                  <tr key={email.id} className="border-t border-gray-100">
                    <td className="p-2 font-medium">{email.recipient_email}</td>
                    <td className="p-2">{email.subject}</td>
                    <td className="p-2 text-xs uppercase">{email.notification_type}</td>
                    <td className="p-2 text-gray-400 text-xs">
                      {new Date(email.created_at).toLocaleString('es-GT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error Message */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-500 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <h4 className="font-bold mb-1">Nota Técnica sobre Correos:</h4>
            <p>Este sistema usa una cola asíncrona. Las notificaciones se guardan inmediatamente en la base de datos (Supabase), pero requieren que el script de envío esté activo en un servidor o cron job para procesarse y llegar a los destinatarios.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
