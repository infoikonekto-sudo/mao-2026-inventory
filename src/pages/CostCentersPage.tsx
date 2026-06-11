import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { getCostCenters, getBudgets, createCostCenter, type CostCenter, type Budget } from '@/services/supabaseClient'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabaseClient'

export default function CostCentersPage() {
    const { user, license } = useAuthStore()
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        budget_allocated: 0,
        department_id: '',
        budget_id: ''
    })

    // Only Finance role (and budget chief) can access this page
    const canManage = user?.role === 'finanzas' || user?.role === 'jefe_presupuesto' || user?.role === 'admin' || user?.role === 'super_admin'

    useEffect(() => {
        if (!license?.id) return
        loadData()
    }, [license])

    const loadData = async () => {
        try {
            setLoading(true)
            const [ccData, budgetData] = await Promise.all([
                getCostCenters(license!.id),
                getBudgets(license!.id)
            ])
            setCostCenters(ccData)
            setBudgets(budgetData)
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.code.trim() || !formData.name.trim()) {
            toast.error('Código y nombre son requeridos')
            return
        }

        if (!license?.id) {
            toast.error('Licencia no válida')
            return
        }

        // Validate Budget Logic
        if (formData.budget_id) {
            const selectedBudget = budgets.find(b => b.id === formData.budget_id)
            if (selectedBudget) {
                if (selectedBudget.status !== 'activo') {
                    toast.error('El presupuesto seleccionado no está activo')
                    return
                }
                // Optional: Check if allocated amount fits in budget (simplified for now)
                // const otherAllocated = costCenters
                //    .filter(c => c.budget_id === formData.budget_id && c.id !== editingId)
                //    .reduce((sum, c) => sum + c.budget_allocated, 0)

                // if (otherAllocated + formData.budget_allocated > selectedBudget.total_amount) {
                //    toast.error('El monto excede el total del presupuesto maestro')
                //    return
                // }
            }
        }

        try {
            setSubmitting(true)

            const payload = {
                code: formData.code.toUpperCase(),
                name: formData.name,
                description: formData.description,
                department_id: formData.department_id || null,
                budget_allocated: formData.budget_allocated,
                budget_id: formData.budget_id || null, // Link to Master Budget
                updated_at: new Date().toISOString()
            }

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('cost_centers')
                    .update(payload)
                    .eq('id', editingId)

                if (error) throw error
                toast.success('Centro de costo actualizado')
            } else {
                // Create new
                await createCostCenter({
                    license_id: license.id,
                    ...payload,
                    is_active: true
                })
                toast.success('Centro de costo creado')
            }

            setShowForm(false)
            setEditingId(null)
            setFormData({ code: '', name: '', description: '', budget_allocated: 0, department_id: '', budget_id: '' })
            loadData()
        } catch (error: any) {
            console.error('Error saving cost center:', error)
            if (error.code === '23505') {
                toast.error('El código ya existe')
            } else {
                toast.error('Error al guardar')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (cc: CostCenter) => {
        setEditingId(cc.id)
        setFormData({
            code: cc.code,
            name: cc.name,
            description: cc.description || '',
            department_id: cc.department_id || '',
            budget_allocated: cc.budget_allocated,
            budget_id: cc.budget_id || ''
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este centro de costo? Esta acción no se puede deshacer.')) {
            return
        }

        try {
            const { error } = await supabase
                .from('cost_centers')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Centro de costo eliminado')
            loadData()
        } catch (error: any) {
            console.error('Error deleting cost center:', error)
            if (error.code === '23503') {
                toast.error('No se puede eliminar: hay requisiciones usando este centro de costo')
            } else {
                toast.error('Error al eliminar')
            }
        }
    }

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('cost_centers')
                .update({ is_active: !currentStatus })
                .eq('id', id)

            if (error) throw error
            toast.success(currentStatus ? 'Centro de costo desactivado' : 'Centro de costo activado')
            loadData()
        } catch (error) {
            console.error('Error toggling status:', error)
            toast.error('Error al cambiar estado')
        }
    }

    const cancelForm = () => {
        setShowForm(false)
        setEditingId(null)
        setFormData({ code: '', name: '', description: '', budget_allocated: 0, department_id: '', budget_id: '' })
    }

    if (!canManage) {
        return (
            <div className="p-6">
                <div className="card p-8 text-center">
                    <h2 className="text-xl font-bold text-gray-700 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600">Solo los roles de Finanzas o Jefe de Presupuesto pueden gestionar centros de costo.</p>
                </div>
            </div>
        )
    }

    if (loading) {
        return <div className="text-center py-10">Cargando centros de costo...</div>
    }

    const totalBudget = costCenters.reduce((sum, cc) => sum + cc.budget_allocated, 0)
    const totalSpent = costCenters.reduce((sum, cc) => sum + cc.budget_spent, 0)

    // Filter active budgets for the dropdown
    const activeBudgets = budgets.filter(b => b.status === 'activo')

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Centros de Costo</h1>
                    <p className="text-gray-600 mt-1">Gestión de presupuestos por departamento</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 bg-blue-50">
                    <h3 className="text-sm font-medium text-gray-600">Centros de Costo Activos</h3>
                    <p className="text-2xl font-bold text-blue-600">{costCenters.filter(cc => cc.is_active).length}</p>
                </div>
                <div className="card p-4 bg-green-50">
                    <h3 className="text-sm font-medium text-gray-600">Total Asignado (Techos)</h3>
                    <p className="text-2xl font-bold text-green-600">Q {totalBudget.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="card p-4 bg-orange-50">
                    <h3 className="text-sm font-medium text-gray-600">Total Gastado</h3>
                    <p className="text-2xl font-bold text-orange-600">Q {totalSpent.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={20} className="mr-2" />
                    {showForm ? 'Cancelar' : 'Nuevo Centro de Costo'}
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="card p-6 bg-blue-50">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="Ej: EDU-01, ADM-01"
                                className="input-base"
                                required
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-500 mt-1">Código único para identificar el centro de costo</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Educación Primaria"
                                className="input-base"
                                required
                            />
                        </div>

                        {/* Presupuesto Maestro Dropdown */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Presupuesto Maestro <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.budget_id}
                                onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                                className="input-base border-blue-300 bg-white"
                                required
                            >
                                <option value="">-- Seleccionar Presupuesto --</option>
                                {activeBudgets.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} (Q {b.remaining_amount.toLocaleString()})
                                    </option>
                                ))}
                                {/* If editing and current budget is inactive/completed, still show it option so it's not lost */}
                                {editingId && formData.budget_id && !activeBudgets.find(b => b.id === formData.budget_id) && (
                                    (() => {
                                        const b = budgets.find(b => b.id === formData.budget_id);
                                        return b ? <option value={b.id}>{b.name} ({b.status})</option> : null
                                    })()
                                )}
                            </select>
                            <p className="text-xs text-blue-600 mt-1">
                                La "Regla de Oro": Todo centro debe pertenecer a un presupuesto vigente.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Techo Asignado (Q) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.budget_allocated}
                                onChange={(e) => setFormData({ ...formData, budget_allocated: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                className="input-base"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Límite de gasto para este departamento.
                            </p>
                        </div>


                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del centro de costo"
                                rows={2}
                                className="input-base"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                            <select
                                value={formData.department_id || ''}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">Ninguno (Sin departamento)</option>
                                <option value="Académico">Académico</option>
                                <option value="Administrativo">Administrativo</option>
                                <option value="Finanzas">Finanzas</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Servicios Generales">Servicios Generales</option>
                                <option value="Tecnología">Tecnología</option>
                            </select>
                        </div>


                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button type="submit" variant="primary" disabled={submitting}>
                            {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={cancelForm}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Presupuesto Maestro</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Techo Asignado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Gastado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Disponible</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {costCenters.length > 0 ? costCenters.map((cc) => {
                                const available = cc.budget_allocated - cc.budget_spent
                                const percentSpent = cc.budget_allocated > 0 ? (cc.budget_spent / cc.budget_allocated) * 100 : 0
                                const masterBudget = budgets.find(b => b.id === cc.budget_id)

                                return (
                                    <tr key={cc.id} className={`hover:bg-gray-50 ${!cc.is_active ? 'opacity-50' : ''}`}>
                                        <td className="px-6 py-4 text-sm font-mono font-semibold text-purple-700">{cc.code}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cc.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {masterBudget ? (
                                                <span className="flex items-center gap-1">
                                                    <span className={`w-2 h-2 rounded-full ${masterBudget.status === 'activo' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    {masterBudget.name}
                                                </span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1">
                                                    <AlertTriangle size={14} /> Sin vincular
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            Q {cc.budget_allocated.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div>
                                                <span className="font-semibold text-orange-600">
                                                    Q {cc.budget_spent.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="text-xs text-gray-500">{percentSpent.toFixed(1)}%</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`font-semibold ${available < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Q {available.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <button
                                                onClick={() => handleToggleActive(cc.id, cc.is_active)}
                                                className={`px-2 py-1 rounded text-xs font-medium ${cc.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {cc.is_active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm flex gap-2">
                                            <button
                                                onClick={() => handleEdit(cc)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cc.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        No hay centros de costo. Crea uno nuevo para comenzar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
