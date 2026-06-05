import { useState, useEffect } from 'react'
import { PieChart, BarChart, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { getBudgets, createBudget, updateBudget, deleteBudget, getCostCenters } from '@/services/supabaseClient'
import toast from 'react-hot-toast'

interface Budget {
  id: string
  name: string
  total_amount: number
  spent_amount: number
  remaining_amount: number
  category: string
  status: 'activo' | 'completado' | 'pausado'
  start_date?: string
  end_date?: string
  description?: string
  created_at?: string
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'ti', label: 'Tecnología e Información' },
  { value: 'office', label: 'Oficina' },
  { value: 'supplies', label: 'Suministros' },
  { value: 'other', label: 'Otro' },
]

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

const STATUS_CONFIG = {
  activo: { label: 'Activo', color: '#10B981' },
  completado: { label: 'Completado', color: '#9CA3AF' },
  pausado: { label: 'Pausado', color: '#F59E0B' },
}

export default function BudgetsPage() {
  const { license } = useAuthStore()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_amount: '',
    category: 'general',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    loadBudgets()
  }, [license])

  const loadBudgets = async () => {
    try {
      setLoading(true)
      if (!license?.id) {
        throw new Error('No license ID available')
      }
      const [budgetsData, costCentersData] = await Promise.all([
        getBudgets(license.id),
        getCostCenters(license.id)
      ])
      setBudgets(budgetsData)
      setCostCenters(costCentersData || [])
    } catch (error) {
      console.error('Error loading budgets:', error)
      toast.error('Error al cargar presupuestos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!license?.id) {
        throw new Error('No license ID available')
      }

      if (!formData.name || !formData.total_amount || !formData.category) {
        toast.error('Por favor completa los campos requeridos')
        return
      }

      const amount = parseFloat(formData.total_amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('El monto debe ser mayor a 0')
        return
      }

      if (editingId) {
        await updateBudget(editingId, {
          name: formData.name,
          category: formData.category,
          total_amount: amount,
          description: formData.description,
        })
        toast.success('Presupuesto actualizado exitosamente')
        setEditingId(null)
      } else {
        await createBudget(license.id, {
          name: formData.name,
          category: formData.category,
          total_amount: amount,
          start_date: formData.start_date,
          end_date: formData.end_date,
          description: formData.description,
        })
        toast.success('Presupuesto creado exitosamente')
      }

      setFormData({
        name: '',
        description: '',
        total_amount: '',
        category: 'general',
        start_date: '',
        end_date: ''
      })
      setShowForm(false)
      await loadBudgets()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar presupuesto')
    }
  }

  const handleEdit = (budget: Budget) => {
    setFormData({
      name: budget.name,
      description: budget.description || '',
      total_amount: budget.total_amount.toString(),
      category: budget.category,
      start_date: budget.start_date || '',
      end_date: budget.end_date || ''
    })
    setEditingId(budget.id)
    setShowForm(true)
  }

  const handleDelete = async (budgetId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      return
    }

    try {
      await deleteBudget(budgetId)
      toast.success('Presupuesto eliminado exitosamente')
      await loadBudgets()
    } catch (error) {
      console.error('Error deleting budget:', error)
      toast.error('Error al eliminar presupuesto')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      description: '',
      total_amount: '',
      category: 'general',
      start_date: '',
      end_date: ''
    })
  }

  // Cálculos para gráficas
  const budgetByCategory = Object.entries(
    budgets.reduce((acc, budget) => {
      if (!acc[budget.category]) {
        acc[budget.category] = 0
      }
      acc[budget.category] += budget.spent_amount
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: CATEGORIES.find(c => c.value === name)?.label || name,
    value: parseFloat(value.toFixed(2))
  }))

  const statusDistribution = [
    {
      name: 'Activos',
      value: budgets.filter(b => b.status === 'activo').length,
      color: '#10B981'
    },
    {
      name: 'Completados',
      value: budgets.filter(b => b.status === 'completado').length,
      color: '#9CA3AF'
    },
    {
      name: 'Pausados',
      value: budgets.filter(b => b.status === 'pausado').length,
      color: '#F59E0B'
    }
  ]

  const budgetUtilization = budgets.map(b => ({
    name: b.name.length > 15 ? b.name.substring(0, 15) + '...' : b.name,
    asignado: parseFloat(b.total_amount.toFixed(2)),
    gastado: parseFloat(b.spent_amount.toFixed(2)),
    disponible: parseFloat(b.remaining_amount.toFixed(2))
  }))

  const topCostCenters = costCenters
    .filter(cc => cc.budget_spent > 0)
    .sort((a, b) => b.budget_spent - a.budget_spent)
    .slice(0, 5)
    .map(cc => ({
      name: cc.name.length > 20 ? cc.name.substring(0, 20) + '...' : cc.name,
      gastado: cc.budget_spent
    }))

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0)
  const totalAvailable = budgets.reduce((sum, b) => sum + b.remaining_amount, 0)
  const utilizationRate = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando presupuestos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-600 mt-1">Gestiona y controla los presupuestos de tu institución</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setFormData({
              name: '',
              description: '',
              total_amount: '',
              category: 'general',
              start_date: '',
              end_date: ''
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Presupuesto Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                Q {totalBudget.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Gastado</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                Q {totalSpent.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Disponible</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                Q {totalAvailable.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Utilización</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{utilizationRate}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${Math.min(parseFloat(utilizationRate), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gasto por Categoría */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gasto por Categoría</h3>
          {budgetByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: Q${value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {budgetByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `Q${value.toLocaleString('es-GT', { maximumFractionDigits: 2 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No hay datos disponibles
            </div>
          )}
        </div>

        {/* Distribución de Estados */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Estados</h3>
          {statusDistribution.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No hay datos disponibles
            </div>
          )}
        </div>
      </div>

      {/* Utilización de Presupuestos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilización de Presupuestos</h3>
        {budgetUtilization.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `Q${value.toLocaleString('es-GT', { maximumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="asignado" fill="#3B82F6" />
              <Bar dataKey="gastado" fill="#EF4444" />
              <Bar dataKey="disponible" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No hay datos disponibles
          </div>
        )}
      </div>

      {/* Top Centros de Costo Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Centros de Costo con Mayor Gasto</h3>
        {topCostCenters.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCostCenters} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip
                formatter={(value: number) => `Q${value.toLocaleString('es-GT', { maximumFractionDigits: 2 })}`}
              />
              <Bar dataKey="gastado" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No hay gastos registrados en Centros de Costo
          </div>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
            </h2>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Compras 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total (Q) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Presupuestos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Gastado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Disponible</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Utilización</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  No hay presupuestos. Crea uno para comenzar.
                </td>
              </tr>
            ) : (
              budgets.map(budget => {
                const utilization = budget.total_amount > 0
                  ? ((budget.spent_amount / budget.total_amount) * 100).toFixed(1)
                  : '0'
                return (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{budget.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {CATEGORIES.find(c => c.value === budget.category)?.label || budget.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      Q {budget.total_amount.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Q {budget.spent_amount.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      Q {budget.remaining_amount.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${parseFloat(utilization) > 80
                                ? 'bg-red-500'
                                : parseFloat(utilization) > 50
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                            style={{ width: `${Math.min(parseFloat(utilization), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-900 font-medium">{utilization}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${budget.status === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : budget.status === 'completado'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {STATUS_CONFIG[budget.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
