import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { ROLE_LABELS } from '@/constants'

const mockUsers = [
  { id: '1', name: 'María López', email: 'maria@colegio.com', role: 'profesor', dept: 'Matemáticas', active: true, created: '2026-01-01' },
  { id: '2', name: 'Juan Pérez', email: 'juan@colegio.com', role: 'jefe_compras', dept: 'Administración', active: true, created: '2026-01-01' },
  { id: '3', name: 'Ana García', email: 'ana@colegio.com', role: 'gerente', dept: 'Dirección', active: true, created: '2026-01-05' },
  { id: '4', name: 'Carlos López', email: 'carlos@colegio.com', role: 'finanzas', dept: 'Contabilidad', active: true, created: '2026-01-10' },
  { id: '5', name: 'Pedro Ruiz', email: 'pedro@colegio.com', role: 'profesor', dept: 'Ciencias', active: false, created: '2025-12-15' },
]

const roleColors = {
  super_admin: 'bg-red-100 text-red-800',
  admin: 'bg-purple-100 text-purple-800',
  jefe_compras: 'bg-blue-100 text-blue-800',
  finanzas: 'bg-green-100 text-green-800',
  gerente: 'bg-yellow-100 text-yellow-800',
  profesor: 'bg-gray-100 text-gray-800',
  auditor: 'bg-orange-100 text-orange-800',
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const filtered = mockUsers.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = !filterRole || user.role === filterRole
    return matchSearch && matchRole
  })

  const stats = {
    total: mockUsers.length,
    activos: mockUsers.filter(u => u.active).length,
    inactivos: mockUsers.filter(u => !u.active).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Usuarios</h1>
        <p className="text-gray-600 mt-1">Administra usuarios y permisos del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success">{stats.activos}</p>
          <p className="text-xs text-gray-600">Activos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{stats.inactivos}</p>
          <p className="text-xs text-gray-600">Inactivos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="input-base">
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="jefe_compras">Jefe de Compras</option>
          <option value="finanzas">Finanzas</option>
          <option value="gerente">Gerente</option>
          <option value="profesor">Profesor</option>
        </select>

        <Button variant="primary">
          <Plus size={20} className="mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                      {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.dept}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="text-primary hover:underline">Editar</button>
                      <button className="text-error hover:underline">Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
