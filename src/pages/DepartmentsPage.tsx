import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Department {
  id: string
  name: string
  created_at: string
}

export default function DepartmentsPage() {
  const { license } = useAuthStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    if (!license) return
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('license_id', license.id)
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
      toast.error('Error al cargar los departamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !license) return

    try {
      if (editingId) {
        const { error } = await supabase
          .from('departments')
          .update({ name: formData.name })
          .eq('id', editingId)
          .eq('license_id', license.id)
        if (error) throw error
        toast.success('Departamento actualizado')
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([{ name: formData.name, license_id: license.id }])
        if (error) throw error
        toast.success('Departamento creado')
      }
      setShowModal(false)
      fetchDepartments()
    } catch (error: any) {
      console.error('Error saving department:', error)
      toast.error(error.message || 'Error al guardar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este departamento? Podría afectar usuarios y presupuestos vinculados.')) return

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Departamento eliminado')
      fetchDepartments()
    } catch (error: any) {
      console.error('Error deleting:', error)
      toast.error(error.message || 'Error al eliminar')
    }
  }

  const openModal = (dept?: Department) => {
    if (dept) {
      setEditingId(dept.id)
      setFormData({ name: dept.name })
    } else {
      setEditingId(null)
      setFormData({ name: '' })
    }
    setShowModal(true)
  }

  const filtered = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏢 Gestión de Áreas</h1>
          <p className="text-gray-600 mt-1">Administra los departamentos o áreas del sistema</p>
        </div>
        <Button variant="primary" onClick={() => openModal()}>
          <Plus size={20} className="mr-2" />
          Nueva Área
        </Button>
      </div>

      <div className="card p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar área por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10 w-full md:w-1/3"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando áreas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nombre del Área</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {dept.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(dept)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                      No se encontraron áreas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Área' : 'Nueva Área'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Área / Departamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Mantenimiento"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1"
                >
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
