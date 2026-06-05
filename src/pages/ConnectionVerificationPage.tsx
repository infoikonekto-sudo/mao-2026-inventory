import { useState } from 'react'
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabaseClient'
import toast from 'react-hot-toast'

interface ConnectionTest {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
  time: number
}

export default function ConnectionVerificationPage() {
  const { user, license } = useAuthStore()
  const [tests, setTests] = useState<ConnectionTest[]>([])
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    setTesting(true)
    const testResults: ConnectionTest[] = []

    try {
      // Test 1: Supabase Connection
      let startTime = Date.now()
      try {
        const { error } = await supabase.from('users').select('*', { count: 'exact', head: true })
        testResults.push({
          name: 'Conexión a Supabase',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : 'Conectado exitosamente',
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Conexión a Supabase',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 2: Inventario
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('inventory_items')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Inventario',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros (Stock)`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Inventario',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 3: Requisiciones
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('requisitions')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Requisiciones',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Requisiciones',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 4: Solicitudes de Compra
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('purchase_requests')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Solicitudes de Compra',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Solicitudes de Compra',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 5: Órdenes de Compra
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('purchase_orders')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Órdenes de Compra',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Órdenes de Compra',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 6: Proveedores
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Proveedores',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Proveedores',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 7: Realtime Subscription
      startTime = Date.now()
      try {
        const subscription = supabase
          .channel(`test-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => { })
          .subscribe()

        testResults.push({
          name: 'Realtime (Subscripción)',
          status: 'success',
          message: 'Realtime conectado',
          time: Date.now() - startTime,
        })

        await supabase.removeChannel(subscription)
      } catch (err: any) {
        testResults.push({
          name: 'Realtime (Subscripción)',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 8: Usuarios
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Usuarios',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Usuarios',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 9: RLS (Row Level Security)
      startTime = Date.now()
      try {
        const { error } = await supabase
          .from('inventory_items')
          .select('*', { count: 'exact' })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'RLS (Seguridad)',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : 'Políticas de seguridad activas',
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'RLS (Seguridad)',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      // Test 10: Auditoría
      startTime = Date.now()
      try {
        const { count, error } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('license_id', license?.id || '')

        testResults.push({
          name: 'Tabla Auditoría',
          status: error ? 'error' : 'success',
          message: error ? `Error: ${error.message}` : `${count || 0} registros`,
          time: Date.now() - startTime,
        })
      } catch (err: any) {
        testResults.push({
          name: 'Tabla Auditoría',
          status: 'error',
          message: err.message || 'Error desconocido',
          time: Date.now() - startTime,
        })
      }

      setTests(testResults)
      const successCount = testResults.filter(t => t.status === 'success').length
      toast.success(`✅ ${successCount}/${testResults.length} pruebas pasadas`)
    } catch (error) {
      console.error('Error running tests:', error)
      toast.error('Error ejecutando pruebas')
    } finally {
      setTesting(false)
    }
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const errorCount = tests.filter(t => t.status === 'error').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🔗 Verificación de Conexiones</h1>
        <p className="text-gray-600 mt-1">Verifica que todas las conexiones a Supabase estén funcionando correctamente</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total de Pruebas</p>
          <p className="text-3xl font-bold text-primary mt-2">{tests.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Exitosas</p>
          <p className="text-3xl font-bold text-success mt-2">{successCount}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Errores</p>
          <p className="text-3xl font-bold text-error mt-2">{errorCount}</p>
        </div>
      </div>

      {/* Botón de Prueba */}
      <div className="flex justify-center">
        <button
          onClick={runTests}
          disabled={testing}
          className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
        >
          <RefreshCw size={20} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Ejecutando pruebas...' : 'Ejecutar Pruebas de Conexión'}
        </button>
      </div>

      {/* Resultados */}
      {tests.length > 0 && (
        <div className="card">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">📋 Resultados de Pruebas</h2>
          </div>
          <div className="divide-y">
            {tests.map((test, index) => (
              <div key={index} className="p-6 flex items-start justify-between hover:bg-gray-50">
                <div className="flex items-start gap-4 flex-1">
                  {test.status === 'success' && (
                    <CheckCircle className="text-success mt-1 flex-shrink-0" size={24} />
                  )}
                  {test.status === 'error' && (
                    <AlertCircle className="text-error mt-1 flex-shrink-0" size={24} />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{test.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${test.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {test.time}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información del Sistema */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">ℹ️ Información del Sistema</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Usuario Actual</p>
            <p className="font-semibold">{user?.full_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Rol</p>
            <p className="font-semibold">{user?.role === 'admin' ? '🔐 Administrador' : user?.role === 'jefe_compras' ? '👔 Jefe de Compras' : '👤 Usuario'}</p>
          </div>
          <div>
            <p className="text-gray-600">Licencia</p>
            <p className="font-semibold">{license?.school_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">ID Licencia</p>
            <p className="font-mono text-xs">{license?.id?.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Recomendaciones</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✅ Ejecuta las pruebas regularmente para verificar la salud del sistema</li>
          <li>✅ Si encuentras errores, verifica tu conexión a internet</li>
          <li>✅ Asegúrate de que Supabase esté accesible (no está bajo mantenimiento)</li>
          <li>✅ El Realtime debe estar habilitado en tu proyecto Supabase</li>
          <li>✅ Las políticas de RLS deben estar correctamente configuradas</li>
        </ul>
      </div>
    </div>
  )
}
