import { useState } from 'react'
import { Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROLE_LABELS } from '@/constants'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

interface TestUser {
  role: keyof typeof ROLE_LABELS
  authCode: string
  name: string
  email: string
  department: string
  description: string
  permissions: string[]
}

const testUsers: TestUser[] = [
  {
    role: 'super_admin',
    authCode: 'SADMIN-K9X2-7M4L',
    name: 'Director General',
    email: 'director@colegio.com',
    department: 'Dirección',
    description: 'Acceso total al sistema, gestión de licencias y usuarios',
    permissions: ['Todo', 'Gestión de usuarios', 'Reportes', 'Configuración', 'Auditoría'],
  },
  {
    role: 'admin',
    authCode: 'ADMIN-5C1P-9Q3R',
    name: 'Administrador',
    email: 'admin@colegio.com',
    department: 'Administración',
    description: 'Gestión completa del inventario y compras',
    permissions: ['Inventario', 'Requisiciones', 'Órdenes', 'Reportes', 'Auditoría'],
  },
  {
    role: 'jefe_compras',
    authCode: 'COMPRA-8N6T-2Y5W',
    name: 'Jefe de Compras',
    email: 'jefe.compras@colegio.com',
    department: 'Compras',
    description: 'Gestiona requisiciones, solicitudes de compra y órdenes',
    permissions: ['Requisiciones', 'Solicitudes de Compra', 'Órdenes', 'Proveedores'],
  },
  {
    role: 'finanzas',
    authCode: 'FINAN-4D7B-1S9Z',
    name: 'Analista de Finanzas',
    email: 'finanzas@colegio.com',
    department: 'Contabilidad',
    description: 'Control presupuestario y análisis de gastos',
    permissions: ['Reportes', 'Análisis de Gastos', 'Presupuesto', 'Auditoría'],
  },
  {
    role: 'gerente',
    authCode: 'GEREN-3H8K-6F2V',
    name: 'Gerente',
    email: 'gerente@colegio.com',
    department: 'Dirección',
    description: 'Acceso a dashboards ejecutivos y reportes estratégicos',
    permissions: ['Dashboard', 'Reportes Ejecutivos', 'Requisiciones', 'Órdenes'],
  },
  {
    role: 'profesor',
    authCode: 'PROFE-2L5G-9C4X',
    name: 'Profesor',
    email: 'profesor@colegio.com',
    department: 'Educación',
    description: 'Acceso básico para crear requisiciones y ver inventario',
    permissions: ['Inventario (Solo lectura)', 'Crear Requisiciones'],
  },
  {
    role: 'auditor',
    authCode: 'AUDIT-7P1T-8B6E',
    name: 'Auditor',
    email: 'auditor@colegio.com',
    department: 'Auditoría',
    description: 'Solo lectura con acceso completo a auditoría y logs',
    permissions: ['Ver todo', 'Auditoría Completa', 'Logs de Sistema'],
  },
]

export default function TestUsersPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [selected, setSelected] = useState<TestUser | null>(null)
  const { setUser, setLicense } = useAuthStore()
  const navigate = useNavigate()

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleQuickLogin = (testUser: TestUser) => {
    // Crear usuario mock
    const user = {
      id: '1',
      auth_code: testUser.authCode,
      full_name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      department: testUser.department,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    // Crear licencia mock
    const license = {
      id: '1',
      school_code: 'MAO-2026',
      license_key: 'LICENSE-KEY-2026',
      expiration_date: '2027-12-31',
      max_users: 50,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    setUser(user as any)
    setLicense(license as any)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-600 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 text-white">
          <h1 className="text-4xl font-bold mb-2">🧪 Prueba Usuarios</h1>
          <p className="text-blue-100 text-lg">Selecciona un rol para probar el sistema con diferentes permisos</p>
        </div>

        {/* Grid de usuarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testUsers.map((testUser) => (
            <div
              key={testUser.role}
              onClick={() => setSelected(testUser)}
              className={`card p-6 cursor-pointer transition-all transform hover:scale-105 ${
                selected?.role === testUser.role ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{testUser.name}</h3>
                  <p className="text-sm text-gray-600">{testUser.department}</p>
                </div>
                <span className="text-3xl">👤</span>
              </div>

              {/* Email */}
              <p className="text-xs text-gray-500 mb-3">{testUser.email}</p>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-4">{testUser.description}</p>

              {/* Permisos */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Permisos:</p>
                <div className="flex flex-wrap gap-1">
                  {testUser.permissions.map((perm) => (
                    <span key={perm} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Auth Code */}
              <div className="bg-gray-100 p-3 rounded mb-4 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Código de autenticación:</p>
                <p className="font-mono text-sm font-bold text-gray-900">{testUser.authCode}</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(testUser.authCode)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded font-medium text-sm transition-colors"
                >
                  {copied === testUser.authCode ? (
                    <>
                      <CheckCircle size={16} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleQuickLogin(testUser)}
                  className="flex-1 px-3 py-2 bg-primary hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                >
                  Ingresar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle del usuario seleccionado */}
        {selected && (
          <div className="card p-8 bg-white mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalles de {selected.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Información */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre Completo</p>
                    <p className="font-medium text-gray-900">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selected.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Departamento</p>
                    <p className="font-medium text-gray-900">{selected.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rol</p>
                    <p className="font-medium text-gray-900">{ROLE_LABELS[selected.role]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Código de Autenticación</p>
                    <div className="flex gap-2 mt-1">
                      <p className="font-mono font-bold text-gray-900 flex-1 bg-gray-100 p-2 rounded">
                        {selected.authCode}
                      </p>
                      <button
                        onClick={() => handleCopy(selected.authCode)}
                        className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded font-medium transition-colors flex items-center gap-2"
                      >
                        {copied === selected.authCode ? (
                          <>
                            <CheckCircle size={18} />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permisos detallados */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Opciones Disponibles</h3>
                <div className="space-y-2">
                  {selected.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-gray-900 font-medium">{perm}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Tip:</strong> Usa el botón "Ingresar" de arriba para loguearte instantáneamente como este usuario y explorar todas sus opciones.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleQuickLogin(selected)}
                  className="w-full mt-6"
                >
                  ✅ Ingresar como {selected.name}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="card p-6 bg-blue-50 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Instrucciones de Uso</h3>
          <ol className="space-y-2 text-gray-700">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>Selecciona un rol que quieras probar</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>Copia el código de autenticación o haz clic en "Ingresar"</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>Explora las opciones del menú disponibles para ese rol</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>Los permisos varían según el rol seleccionado</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">5.</span>
              <span>Usa "Cerrar Sesión" para cambiar de usuario</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
