import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { createExpressOrder, getSuppliers, getNextExpressOrderNumber, sendTripleApprovalNotifications } from '@/services/supabaseClient'
import { toast } from 'react-hot-toast'
import { Plus, Trash, ArrowLeft, Save, AlertTriangle, Package, Info } from 'lucide-react'

// Interfaces for local state
interface OrderItem {
    id: string // temp id
    description: string
    quantity: number
    unit: string
    units_per_package: number // units inside each box/package
    supplier_id: string
    supplier_name: string
    estimated_unit_price: number // price per unit/box/package
    // computed
    estimated_subtotal: number
}

const MAX_AMOUNT = 1100.00

// Units that represent containers with multiple individual units inside
const PACKAGE_UNITS = ['caja', 'paquete', 'docena', 'bolsa', 'rollo', 'resma', 'fardo']

export default function CreateExpressOrderPage() {
    const navigate = useNavigate()
    const { user, license } = useAuthStore()

    // Form State
    const [orderNumber, setOrderNumber] = useState('')
    const [department, setDepartment] = useState('')
    const [justification, setJustification] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [paymentReference, setPaymentReference] = useState('')

    const [items, setItems] = useState<OrderItem[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [submitting, setSubmitting] = useState(false)

    // Initialization
    useEffect(() => {
        if (license && user) {
            loadData()
            setDepartment(user.department_id || '')
        }
    }, [license, user])

    const loadData = async () => {
        try {
            const [suppliersData, nextNum] = await Promise.all([
                getSuppliers(license!.id),
                getNextExpressOrderNumber(license!.id)
            ])
            setSuppliers(suppliersData || [])
            setOrderNumber(nextNum)

            // Add one empty item by default
            addItem()
        } catch (error) {
            console.error('Error loading initial data:', error)
            toast.error('Error al cargar datos')
        }
    }

    // Item Management
    const addItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unit: 'unidad',
                units_per_package: 1,
                supplier_id: '',
                supplier_name: '',
                estimated_unit_price: 0,
                estimated_subtotal: 0
            }
        ])
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
    }


    const isPackageUnit = (unit: string) => PACKAGE_UNITS.includes(unit)

    const updateItem = (id: string, field: keyof OrderItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item

            const updated = { ...item, [field]: value }

            // Auto-update supplier name if ID changes
            if (field === 'supplier_id') {
                const sup = suppliers.find(s => s.id === value)
                if (sup) updated.supplier_name = sup.name
            }

            // When unit changes to a non-package unit, reset units_per_package
            if (field === 'unit') {
                if (!isPackageUnit(value)) {
                    updated.units_per_package = 1
                } else if (value === 'docena') {
                    updated.units_per_package = 12
                } else {
                    // For caja/paquete, keep existing or set default
                    if (updated.units_per_package <= 1) {
                        updated.units_per_package = 1 // User needs to fill this
                    }
                }
            }

            // Recalculate subtotal: quantity × price per unit/package
            if (['quantity', 'estimated_unit_price', 'units_per_package', 'unit'].includes(field)) {
                updated.estimated_subtotal = updated.quantity * updated.estimated_unit_price
            }

            return updated
        }))
    }

    // Calculate price per individual unit for display
    const getPricePerIndividualUnit = (item: OrderItem) => {
        if (!isPackageUnit(item.unit) || item.units_per_package <= 0) return null
        return item.estimated_unit_price / item.units_per_package
    }

    // Calculate total individual units
    const getTotalIndividualUnits = (item: OrderItem) => {
        if (!isPackageUnit(item.unit) || item.units_per_package <= 0) return null
        return item.quantity * item.units_per_package
    }

    // Totals & Validation
    const totalEstimated = items.reduce((sum, i) => sum + i.estimated_subtotal, 0)
    const isOverLimit = totalEstimated > MAX_AMOUNT
    const remaining = MAX_AMOUNT - totalEstimated

    // Visual Feedback Color
    const getProgressColor = () => {
        if (isOverLimit) return 'bg-red-600'
        if (totalEstimated > 900) return 'bg-yellow-500' // Warning zone
        return 'bg-green-600'
    }

    const handleSubmit = async () => {
        if (!justification) return toast.error('La justificación es obligatoria')
        if (!paymentMethod) return toast.error('El método de pago es obligatorio')
        if (items.length === 0) return toast.error('Debe agregar al menos un artículo')
        if (isOverLimit) return toast.error(`El monto excede el límite de Q ${MAX_AMOUNT.toLocaleString()}`)

        // Validate Items
        for (const item of items) {
            if (!item.description) return toast.error('Todos los artículos deben tener descripción')
            if (item.estimated_unit_price <= 0) return toast.error('Todos los artículos deben tener precio estimado')
            if (isPackageUnit(item.unit) && item.units_per_package <= 0) {
                return toast.error(`"${item.description}" — indique cuántas unidades trae cada ${item.unit}`)
            }
        }

        try {
            setSubmitting(true)

            const payload = {
                license_id: license!.id,
                order_number: orderNumber,
                created_by: user!.id,
                department,
                estimated_total: totalEstimated,
                justification,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                items: items.map((item, index) => ({
                    item_number: index + 1,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    units_per_package: item.units_per_package,
                    supplier_id: item.supplier_id || null,
                    supplier_name: item.supplier_name || 'Proveedor Externo',
                    estimated_unit_price: item.estimated_unit_price
                }))
            }

            const order = await createExpressOrder(payload)

            // Enviar notificaciones a los jefes
            if (order?.id) {
                const appUrl = window.location.origin
                try {
                    console.log('Enviando notificaciones a jefes...', {
                        order_id: order.id,
                        order_number: order.order_number,
                        total_amount: order.estimated_total
                    })
                    await sendTripleApprovalNotifications({
                        id: order.id,
                        order_number: order.order_number || orderNumber,
                        total_amount: order.estimated_total || totalEstimated,
                        supplier_name: 'Orden Express',
                        requester_name: user?.full_name || 'Usuario'
                    }, license!.id, appUrl)
                    console.log('✅ Notificaciones enviadas exitosamente')
                } catch (notifError) {
                    console.error('❌ Error enviando notificaciones:', notifError)
                    toast.error('Orden creada pero fallo al enviar notificaciones')
                }
            }

            toast.success('Orden Express creada exitosamente')
            navigate(`/dashboard/express-orders/${order.id}`)
        } catch (error) {
            console.error('Error submit:', error)
            toast.error('Error al crear la orden')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <div className="p-4 md:p-6 max-w-5xl mx-auto pb-32 md:pb-32">
                <button
                    onClick={() => navigate('/dashboard/express-orders')}
                    className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
                >
                    <ArrowLeft size={16} /> Volver a lista
                </button>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Nueva Orden Express</h1>
                        <p className="text-sm text-gray-500">#{orderNumber}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">

                        {/* General Info */}
                        <div className="card p-6 bg-white shadow-sm rounded-lg border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">Información General</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="label">Justificación de Compra *</label>
                                    <textarea
                                        className="input-base w-full"
                                        rows={3}
                                        value={justification}
                                        onChange={(e) => setJustification(e.target.value)}
                                        placeholder="Explique el motivo de esta compra express..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Método de Pago *</label>
                                        <select
                                            className="input-base w-full"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            title="Seleccione el método de pago"
                                            aria-label="Método de pago"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="transferencia">Transferencia</option>
                                        </select>
                                    </div>

                                    {paymentMethod === 'cheque' && (
                                        <div>
                                            <label className="label">Número de Cheque</label>
                                            <input
                                                type="text"
                                                className="input-base w-full"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="Ej: 123456"
                                                title="Ingrese el número de cheque"
                                            />
                                        </div>
                                    )}

                                    {paymentMethod === 'transferencia' && (
                                        <div>
                                            <label className="label">No. Referencia</label>
                                            <input
                                                type="text"
                                                className="input-base w-full"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="Ej: REF-2026-001"
                                                title="Ingrese el número de referencia"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800">Artículos</h3>
                                <div className="flex gap-2">
                                    <button onClick={addItem} className="btn-secondary text-sm flex items-center gap-1">
                                        <Plus size={16} /> Agregar Artículo
                                    </button>
                                </div>
                            </div>

                            {items.map((item) => (
                                <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar artículo"
                                    >
                                        <Trash size={18} />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        {/* Line 1: Description + Supplier */}
                                        <div className="md:col-span-8">
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Descripción *</label>
                                            <input
                                                type="text"
                                                className="input-base w-full"
                                                value={item.description}
                                                onChange={(e) => {
                                                    updateItem(item.id, 'description', e.target.value)
                                                }}
                                                placeholder="Ej. Resma de papel, Marcadores..."
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Proveedor</label>
                                            <select
                                                className="input-base w-full"
                                                value={item.supplier_id}
                                                onChange={(e) => updateItem(item.id, 'supplier_id', e.target.value)}
                                                title="Seleccione un proveedor"
                                                aria-label="Seleccionar proveedor"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Line 2: Quantity, Unit, Units per Package, Price, Subtotal */}
                                        <div className={isPackageUnit(item.unit) ? 'md:col-span-2' : 'md:col-span-3'}>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                {isPackageUnit(item.unit) ? `No. de ${item.unit}s` : 'Cantidad'}
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="input-base w-full"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                title="Ingrese la cantidad"
                                            />
                                        </div>
                                        <div className={isPackageUnit(item.unit) ? 'md:col-span-2' : 'md:col-span-3'}>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Unidad</label>
                                            <select
                                                className="input-base w-full"
                                                value={item.unit}
                                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                title="Seleccione la unidad de medida"
                                                aria-label="Unidad de medida"
                                            >
                                                <option value="unidad">Unidad</option>
                                                <option value="caja">Caja</option>
                                                <option value="paquete">Paquete</option>
                                                <option value="docena">Docena</option>
                                                <option value="bolsa">Bolsa</option>
                                                <option value="rollo">Rollo</option>
                                                <option value="resma">Resma</option>
                                                <option value="fardo">Fardo</option>
                                                <option value="libra">Libra</option>
                                                <option value="kilogramo">Kilogramo</option>
                                                <option value="litro">Litro</option>
                                                <option value="galon">Galón</option>
                                                <option value="metro">Metro</option>
                                                <option value="pieza">Pieza</option>
                                                <option value="servicio">Servicio</option>
                                            </select>
                                        </div>

                                        {/* Units per package — only shows for caja/paquete/docena */}
                                        {isPackageUnit(item.unit) && (
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                                                    <Package size={12} />
                                                    Uds/{item.unit}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input-base w-full border-blue-300 bg-blue-50"
                                                    value={item.units_per_package}
                                                    onChange={(e) => updateItem(item.id, 'units_per_package', parseFloat(e.target.value) || 0)}
                                                    placeholder="Ej: 24"
                                                    title="Ingrese cantidad de unidades por paquete"
                                                />
                                            </div>
                                        )}

                                        <div className="md:col-span-3">
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                {isPackageUnit(item.unit) ? `Precio por ${item.unit}` : 'Precio Unit. (Est)'}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Q</span>
                                                <input
                                                    type="number"
                                                    className="input-base w-full pl-6"
                                                    value={item.estimated_unit_price}
                                                    onChange={(e) => updateItem(item.id, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    title="Ingrese el precio estimado"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-3 flex items-end justify-end">
                                            <div className="text-right">
                                                <label className="text-xs font-medium text-gray-500 block">Subtotal</label>
                                                <span className="text-lg font-bold text-gray-800">
                                                    Q {item.estimated_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package info bar — shows when unit is caja/paquete/docena */}
                                    {isPackageUnit(item.unit) && item.units_per_package > 0 && item.estimated_unit_price > 0 && (
                                        <div className="mt-3 pt-3 border-t border-dashed border-blue-200 flex flex-wrap gap-4 text-xs">
                                            <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                                                <Info size={12} />
                                                <span className="font-medium">
                                                    {item.quantity} {item.unit}{item.quantity > 1 ? 's' : ''} × {item.units_per_package} uds = <strong>{getTotalIndividualUnits(item)} unidades totales</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                                                <span className="font-medium">
                                                    Precio por unidad: <strong>Q {getPricePerIndividualUnit(item)?.toFixed(2)}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Floating Sidebar / Summary - Hidden on mobile in favor of Fixed Footer */}
                    <div className="hidden md:block md:col-span-1">
                        <div className="sticky top-6 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen de Orden</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Items:</span>
                                    <span className="font-medium">{items.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-100">
                                    <span>Total Estimado:</span>
                                    <span className={isOverLimit ? 'text-red-600' : 'text-gray-900'}>
                                        Q {totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Limit Visualizer */}
                            <div className="mb-6">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Progreso de Límite</span>
                                    <span>Q {MAX_AMOUNT.toLocaleString()}</span>
                                </div>
                                <div className="h-4 bg-gray-200 rounded-full overflow-hidden" style={{ minHeight: '1rem' }}>
                                    <div
                                        className={`h-full transition-all duration-300 ${getProgressColor()}`}
                                        style={{ width: `${Math.min((totalEstimated / MAX_AMOUNT) * 100, 100)}%` }}
                                    />
                                </div>
                                {isOverLimit ? (
                                    <div className="flex items-start gap-2 mt-2 text-red-600 text-xs font-bold bg-red-50 p-2 rounded">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        <span>Excede el límite. Elimine artículos o reduzca cantidades.</span>
                                    </div>
                                ) : (
                                    <div className="text-right text-xs text-gray-500 mt-1">
                                        Disponible: Q {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || isOverLimit}
                                className={`w-full btn-primary py-3 flex justify-center items-center gap-2 font-bold ${isOverLimit || submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Guardando...' : (
                                    <>
                                        <Save size={20} />
                                        Crear Orden
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile Fixed Footer Bar (Visible only on mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-50 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300">
                <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Estimado</div>
                    <div className={`font-black text-xl leading-none mt-1 ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>
                        Q {totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || isOverLimit || items.length === 0}
                    className={`px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest text-white flex items-center justify-center gap-2 shadow-xl transition-all ${isOverLimit || submitting || items.length === 0 ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-600 shadow-blue-200 hover:scale-[1.02] active:scale-95'}`}
                >
                    {submitting ? 'Procesando...' : (
                        <>
                            <Save size={18} />
                            Crear Orden
                        </>
                    )}
                </button>
            </div>

            {isOverLimit && (
                <div className="md:hidden fixed bottom-[76px] left-0 right-0 bg-red-600 text-white text-[10px] font-bold text-center py-1.5 z-40 uppercase tracking-widest animate-in slide-in-from-bottom-2">
                    Límite excedido (Max: Q {MAX_AMOUNT.toLocaleString()})
                </div>
            )}
        </>
    )
}
