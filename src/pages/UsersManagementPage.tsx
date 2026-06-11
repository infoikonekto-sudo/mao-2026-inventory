import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabaseClient'
import toast from 'react-hot-toast'
import { ROLE_LABELS, USER_ROLES } from '@/constants'
import { rolePermissions } from '@/utils/permissions'


interface User {
  id: string
  auth_code: string
  full_name: string
  email: string
  role: string
  department?: string
  department_id?: string
  is_active: boolean
  custom_permissions: string[]
}

import { Department } from '@/types'

export default function UsersManagementPage() {
  const { user, license } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    auth_code: '',
    role: 'profesor',
    department: '',
    custom_permissions: [] as string[],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      if (!license?.id) return
      const [usersRes, deptsRes] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('license_id', license.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('departments')
          .select('*')
          .eq('license_id', license.id)
          .order('name', { ascending: true })
      ])

      if (usersRes.error) throw usersRes.error
      if (deptsRes.error) throw deptsRes.error

      setUsers(usersRes.data || [])
      setDepartments(deptsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  // Removed loadUsers function

  const handleOpenModal = (userItem?: User) => {
    if (userItem) {
      setEditingId(userItem.id)
      setFormData({
        full_name: userItem.full_name,
        email: userItem.email || '',
        auth_code: userItem.auth_code,
        role: userItem.role,
        department: userItem.department_id || userItem.department || '',
        custom_permissions: userItem.custom_permissions || [],
      })
    } else {
      setEditingId(null)
      setFormData({
        full_name: '',
        email: '',
        auth_code: '',
        role: 'profesor',
        department: '',
        custom_permissions: [],
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (!formData.full_name || !formData.auth_code) {
        toast.error('Completa todos los campos requeridos')
        return
      }

      if (!license?.id) return

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            department_id: formData.department || null,
            custom_permissions: formData.custom_permissions,
          })
          .eq('id', editingId)

        if (error) throw error
        toast.success('Usuario actualizado')
      } else {
        // Crear
        const { error } = await supabase
          .from('users')
          .insert([{
            license_id: license.id,
            full_name: formData.full_name,
            email: formData.email,
            auth_code: formData.auth_code.toUpperCase(),
            role: formData.role,
            department_id: formData.department || null,
            custom_permissions: formData.custom_permissions,
            is_active: true,
          }])

        if (error) throw error
        toast.success('Usuario creado')
      }

      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving user:', error)
      toast.error('Error guardando usuario')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Usuario eliminado')
      await loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error eliminando usuario')
    }
  }

  const generateAuthCode = () => {
    const prefix = formData.full_name.split(' ')[0].slice(0, 3).toUpperCase()
    const random = Math.random().toString(36).substring(2, 7).toUpperCase()
    setFormData({ ...formData, auth_code: `${prefix}-${random}` })
  }

  if (!user || user.role !== 'admin') {
    return <div className="text-center py-10 text-error">⛔ Solo administradores pueden acceder</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Usuarios</h1>
        <p className="text-gray-600 mt-1">Crea y administra usuarios del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total de Usuarios</p>
          <p className="text-3xl font-bold text-primary mt-2">{users.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Activos</p>
          <p className="text-3xl font-bold text-success mt-2">{users.filter(u => u.is_active).length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Jefes de Compra</p>
          <p className="text-3xl font-bold text-info mt-2">{users.filter(u => u.role === 'jefe_compras').length}</p>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Cargando usuarios...</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Departamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(userItem => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{userItem.full_name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{userItem.auth_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{userItem.email || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {ROLE_LABELS[userItem.role as keyof typeof ROLE_LABELS] || userItem.role}
                      </span>
                      {userItem.custom_permissions && userItem.custom_permissions.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase" title="Permisos personalizados activos">
                          Especial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {departments.find(d => d.id === userItem.department_id)?.name || userItem.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {userItem.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(userItem)}
                          className="text-primary hover:bg-blue-50 px-2 py-1 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(userItem.id)}
                          className="text-error hover:bg-red-50 px-2 py-1 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ej: María López"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="correo@colegio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Autenticación *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.auth_code}
                    onChange={(e) => setFormData({ ...formData, auth_code: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono"
                    placeholder="MAR-7K2Q9"
                    disabled={!!editingId}
                  />
                  <button
                    onClick={generateAuthCode}
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                    disabled={!!editingId}
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={USER_ROLES.PROFESOR}>👤 {ROLE_LABELS.profesor}</option>
                  <option value={USER_ROLES.JEFE_COMPRAS}>👔 {ROLE_LABELS.jefe_compras}</option>
                  <option value={USER_ROLES.ADMIN}>🔐 {ROLE_LABELS.admin}</option>
                  <option value="hr" disabled>──────────</option>
                  <option value={USER_ROLES.JEFE_PRESUPUESTO}>💰 {ROLE_LABELS.jefe_presupuesto}</option>
                  <option value={USER_ROLES.JEFE_OPERACIONES}>⚙️ {ROLE_LABELS.jefe_operaciones}</option>
                  <option value={USER_ROLES.JEFE_CALIDAD}>✅ {ROLE_LABELS.jefe_calidad}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área / Departamento</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Sin área asignada</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">El panel del usuario se personalizará para esta área.</p>
              </div>

              {/* Permisos Personalizados */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800">🛠️ Permisos Especiales</h3>
                  {formData.custom_permissions.length > 0 && (
                    <button
                      onClick={() => setFormData({ ...formData, custom_permissions: [] })}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Restablecer al Rol
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100">
                  {rolePermissions.super_admin.menuItems.filter(m => m !== 'profile').map((item) => (
                    <label key={item} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.custom_permissions.includes(item)}
                        onChange={(e) => {
                          const newPerms = e.target.checked
                            ? [...formData.custom_permissions, item]
                            : formData.custom_permissions.filter(p => p !== item)
                          setFormData({ ...formData, custom_permissions: newPerms })
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="text-[11px] text-gray-700 capitalize">
                        {item.replace('-', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
                {formData.custom_permissions.length === 0 && (
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    * El usuario usará los permisos por defecto de su rol.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
