import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, MapPin, Phone, Mail, Edit, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/services/supabaseClient'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import toast from 'react-hot-toast'

interface Supplier {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  city: string
  rating: number
  order_count?: number
}

export default function SuppliersPage() {
  const { user } = useAuthStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    city: '',
    rating: 5,
  })

  useEffect(() => {
    if (user?.license_id) {
      loadSuppliers()
    }
  }, [user?.license_id])

  // Escuchar cambios en tiempo real
  const handleRealtimeChange = useCallback(async (_payload: any) => {
    // Recargar proveedores cuando haya cambios
    if (user?.license_id) {
      const data = await getSuppliers(user.license_id)
      setSuppliers(data || [])
    }
  }, [user?.license_id])

  useRealtimeData('suppliers', user?.license_id || '', handleRealtimeChange)

  const loadSuppliers = async () => {
    try {
      if (!user?.license_id) return
      const data = await getSuppliers(user.license_id)
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast.error('Error cargando proveedores')
    } finally {
      setLoading(false)
    }
  }

  const filtered = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingId(supplier.id)
      setFormData({
        name: supplier.name,
        contact: supplier.contact_name,
        email: supplier.email,
        phone: supplier.phone,
        city: supplier.city,
        rating: supplier.rating,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        contact: '',
        email: '',
        phone: '',
        city: '',
        rating: 5,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Completa todos los campos requeridos')
        return
      }

      if (!user?.license_id) return

      if (editingId) {
        await updateSupplier(editingId, formData)
        toast.success('Proveedor actualizado')
      } else {
        await createSupplier({
          license_id: user.license_id,
          ...formData,
        })
        toast.success('Proveedor creado')
      }

      await loadSuppliers()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Error guardando proveedor')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro?')) return

    try {
      await deleteSupplier(id)
      toast.success('Proveedor eliminado')
      await loadSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Error eliminando proveedor')
    }
  }

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={i < Math.floor(rating) ? '⭐' : '☆'}>
      </span>
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🏢 Proveedores</h1>
        <p className="text-gray-600 mt-1">Gestiona proveedores y calificaciones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{suppliers.length}</p>
          <p className="text-xs text-gray-600">Activos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success">{suppliers.reduce((sum, s) => sum + (s.order_count || 0), 0)}</p>
          <p className="text-xs text-gray-600">Órdenes Totales</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">⭐ {suppliers.length > 0 ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1) : '0'}</p>
          <p className="text-xs text-gray-600">Calificación Promedio</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar proveedor o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10"
          />
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={20} className="mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {renderStars(supplier.rating)}
                    <span className="text-xs text-gray-600 ml-2">{supplier.rating}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(supplier)}
                    className="p-1 text-primary hover:bg-blue-50 rounded"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-1 text-error hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="w-5">👤</span>
                  <span>{supplier.contact_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} />
                  <span>{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span>{supplier.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base"
                  placeholder="Ej: Librería Central"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto *</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input-base"
                  placeholder="Ej: Lic. Pedro García"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-base"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-base"
                  placeholder="2234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input-base"
                  placeholder="Guatemala"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calificación</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  className="input-base"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5.0</option>
                  <option value={4.5}>⭐⭐⭐⭐ 4.5</option>
                  <option value={4}>⭐⭐⭐⭐ 4.0</option>
                  <option value={3.5}>⭐⭐⭐ 3.5</option>
                  <option value={3}>⭐⭐⭐ 3.0</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseModal}
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
