import { useState, useEffect, useRef, useMemo } from 'react'
import { generateWarehouseExitPDF } from '@/utils/pdfGenerator'
import { useAuthStore } from '@/stores/authStore'
import { supabase, createDelivery, getDeliveriesByReceiver, getRecentDeliveries, findInventoryItemByBarcode } from '@/services/supabaseClient'
import { toast } from 'react-hot-toast'
import { 
    Search, 
    ShoppingCart, 
    User, 
    PenTool, 
    X, 
    FileText, 
    History, 
    Camera, 
    RefreshCw, 
    Package, 
    Building2,
    Trash2,
    Plus,
    Minus,
    ArrowRight,
    MapPin,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import { getStockUnitsConsumed } from '@/utils/inventoryConversions'

// Interfaces
interface InventoryItem {
    id: string
    name: string
    current_stock: number
    unit_of_measure: string
    units_per_package?: number
    unit_cost?: number
    category_id?: string
    category?: string
    location?: string
    item_code?: string
}

interface CartItem extends InventoryItem {
    quantityToAdd: number
    dispenseUnit: string // Selected unit for this item (unidad, caja, paquete, libra, etc.)
}

// Unit options for dispense
const UNIT_OPTIONS = [
    { value: 'unidades', label: 'Unidades' },
    { value: 'cajas', label: 'Cajas' },
    { value: 'paquetes', label: 'Paquetes' },
    { value: 'libras', label: 'Libras' },
    { value: 'galones', label: 'Galones' },
    { value: 'litros', label: 'Litros' },
    { value: 'metros', label: 'Metros' },
    { value: 'rollos', label: 'Rollos' },
    { value: 'resmas', label: 'Resmas' },
    { value: 'docenas', label: 'Docenas' },
    { value: 'bolsas', label: 'Bolsas' },
    { value: 'botellas', label: 'Botellas' },
    { value: 'pares', label: 'Pares' },
    { value: 'juegos', label: 'Juegos' },
]

export default function WindowDeliveryPage() {
    const { user, license } = useAuthStore()

    // Data State
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)

    // Form State
    const [receiverName, setReceiverName] = useState('')
    const [department, setDepartment] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Selección, 2: Firma, 3: Historial Global

    // History State
    const [userHistory, setUserHistory] = useState<any[]>([])
    const [globalHistory, setGlobalHistory] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // Signature State
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    // Scanner State
    const [showScanModal, setShowScanModal] = useState(false)
    const scannerRef = useRef<any>(null)

    useEffect(() => {
        loadData()
    }, [])

    // New: Load history when receiver name changes
    useEffect(() => {
        if (receiverName.length > 2) {
            const timer = setTimeout(() => {
                loadUserHistory(receiverName)
            }, 800)
            return () => clearTimeout(timer)
        } else {
            setUserHistory([])
        }
    }, [receiverName])

    async function loadData() {
        if (!license?.id) return
        try {
            setLoading(true)
            const [inventoryData] = await Promise.all([
                supabase
                    .from('inventory_items')
                    .select('id, item_code, name, category, current_stock, unit_of_measure, units_per_package, location')
                    .eq('license_id', license.id)
                    .eq('is_active', true)
                    .order('name')
            ])
            setItems(inventoryData.data || [])
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Error cargando inventario')
        } finally {
            setLoading(false)
        }
    }

    async function loadUserHistory(name: string) {
        if (!license?.id) return
        setLoadingHistory(true)
        const history = await getDeliveriesByReceiver(license.id, name)
        setUserHistory(history || [])
        setLoadingHistory(false)
    }

    async function loadGlobalHistory() {
        if (!license?.id) return
        setLoadingHistory(true)
        const data = await getRecentDeliveries(license.id)
        setGlobalHistory(data || [])
        setLoadingHistory(false)
    }

    const toggleHistoryMode = () => {
        if (step === 3) {
            setStep(1)
        } else {
            setStep(3)
            loadGlobalHistory()
        }
    }

    // Cart Logic
    const addToCart = (item: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id)
            if (existing) {
                const newQty = existing.quantityToAdd + 1
                const consumed = getStockUnitsConsumed(newQty, existing.dispenseUnit, item.unit_of_measure, item.units_per_package || 1)
                if (consumed > item.current_stock) {
                    toast.error(`Stock insuficiente (${item.current_stock} disponibles)`)
                    return prev
                }
                return prev.map(i => i.id === item.id ? { ...i, quantityToAdd: newQty } : i)
            }
            return [...prev, { ...item, quantityToAdd: 1, dispenseUnit: item.unit_of_measure || 'unidades' }]
        })
    }

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.id !== itemId))
    }

    const updateQuantity = (itemId: string, qty: number) => {
        if (qty < 1) return
        setCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const consumed = getStockUnitsConsumed(qty, i.dispenseUnit, i.unit_of_measure, i.units_per_package || 1)
                if (consumed > i.current_stock) {
                    toast.error(`Límite de stock: ${i.current_stock}`)
                    return i
                }
                return { ...i, quantityToAdd: qty }
            }
            return i
        }))
    }

    const updateDispenseUnit = (itemId: string, newUnit: string) => {
        setCart(prev => prev.map(i => {
            if (i.id === itemId) {
                const consumed = getStockUnitsConsumed(i.quantityToAdd, newUnit, i.unit_of_measure, i.units_per_package || 1)
                if (consumed > i.current_stock) {
                    toast.error(`Unidad no disponible para esa cantidad`)
                    return { ...i, dispenseUnit: newUnit, quantityToAdd: 1 } 
                }
                return { ...i, dispenseUnit: newUnit }
            }
            return i
        }))
    }

    // Signature Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        setIsDrawing(true)
        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.beginPath()
        ctx.moveTo(offsetX, offsetY)
        setHasSignature(true)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const { offsetX, offsetY } = getCoordinates(e, canvas)
        ctx.lineTo(offsetX, offsetY)
        ctx.stroke()
    }

    const stopDrawing = () => setIsDrawing(false)

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY
        if ('touches' in e) {
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }
        const rect = canvas.getBoundingClientRect()
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        }
    }

    const handleFinalize = async () => {
        if (!receiverName || !department) {
            toast.error('Complete el formulario de receptor')
            return
        }
        if (!hasSignature) {
            toast.error('Firma requerida para el vale legal')
            return
        }

        try {
            const signatureDataUrl = canvasRef.current?.toDataURL() || ''

            await createDelivery({
                license_id: license!.id,
                receiver_name: receiverName,
                department,
                items: cart.map(i => {
                    const consumed = getStockUnitsConsumed(i.quantityToAdd, i.dispenseUnit, i.unit_of_measure, i.units_per_package || 1)
                    return {
                        id: i.id,
                        name: i.name,
                        quantity: consumed, 
                        unit: i.unit_of_measure,
                        dispense_quantity: i.quantityToAdd,
                        dispense_unit: i.dispenseUnit,
                        units_per_package: i.units_per_package || 1,
                    }
                }),
                signatureDataUrl: signatureDataUrl,
                delivered_by: user!.id
            })

            await generateWarehouseExitPDF(
                receiverName,
                department,
                cart.map(i => ({
                    name: i.name,
                    quantityToAdd: i.quantityToAdd,
                    unit_of_measure: i.dispenseUnit 
                })),
                signatureDataUrl
            )

            toast.success('Despacho finalizado con éxito')
            setCart([])
            setReceiverName('')
            setDepartment('')
            setHasSignature(false)
            setStep(1)
            loadData() 
        } catch (error) {
            console.error(error)
            toast.error('Error procesando el despacho')
        }
    }

    const filteredItems = useMemo(() => {
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const term = normalize(searchTerm || '')
        return items.filter(i => {
            if (i.current_stock <= 0) return false
            return normalize(i.name || '').includes(term) || normalize(i.item_code || '').includes(term) || normalize(i.category || '').includes(term)
        })
    }, [items, searchTerm])

    const startCameraScanner = async () => {
        try {
            const { Html5Qrcode } = await import('html5-qrcode')
            const scanner = new Html5Qrcode('delivery-scanner-region')
            scannerRef.current = scanner
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 300, height: 100 } },
                async (decodedText: string) => {
                    scanner.stop().catch(() => { })
                    scannerRef.current = null
                    if (!license?.id) return
                    const product = await findInventoryItemByBarcode(license.id, decodedText)
                    if (product) {
                        addToCart(product as any)
                        toast.success(`Detectado: ${product.name}`)
                    } else {
                        toast.error('Código no registrado')
                    }
                    setTimeout(() => showScanModal && startCameraScanner(), 1500)
                },
                () => { }
            )
        } catch (error) {
            toast.error('Error al abrir cámara')
        }
    }

    const openScanner = () => {
        setShowScanModal(true)
        setTimeout(() => startCameraScanner(), 400)
    }

    const closeScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => { })
            scannerRef.current = null
        }
        setShowScanModal(false)
    }

    return (
        <div className="min-h-[calc(100vh-4.5rem)] flex flex-col p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-[1800px] mx-auto">
            
            {/* Header POS Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-emerald-600 text-white rounded-[1rem] md:rounded-[1.5rem] shadow-xl shadow-emerald-100">
                            <ShoppingCart size={24} className="md:w-8 md:h-8" />
                        </div>
                        Despacho de Ventanilla
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 md:mt-2 text-sm md:text-base">Gestión de salida rápida y firma digital de vale</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    <button 
                        onClick={toggleHistoryMode}
                        className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold transition-all text-sm md:text-base ${
                            step === 3 ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <History size={18} />
                        <span className="hidden sm:inline">{step === 3 ? 'Volver al Terminal' : 'Historial Global'}</span>
                        <span className="sm:hidden">{step === 3 ? 'Volver' : 'Historial'}</span>
                    </button>
                    {step === 1 && (
                        <button 
                            onClick={openScanner}
                            className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-emerald-50 text-emerald-700 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100"
                        >
                            <Camera size={18} />
                            Scanner
                        </button>
                    )}
                </div>
            </div>

            {step === 3 ? (
                <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Registro Maestro de Entregas</h2>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black">
                            <RefreshCw size={14} /> ACTUALIZADO REAL-TIME
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <th className="px-8 py-5 text-left">Cronología</th>
                                    <th className="px-8 py-5 text-left">Beneficiario / Depto</th>
                                    <th className="px-8 py-5 text-left">Detalle de Items</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loadingHistory ? (
                                    <tr><td colSpan={4} className="p-20 text-center text-gray-400 uppercase text-xs font-black tracking-[0.2em]">Sincronizando Archivo...</td></tr>
                                ) : globalHistory.map(d => (
                                    <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-gray-900">{new Date(d.created_at).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(d.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-gray-800">{d.receiver_name}</div>
                                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-tight flex items-center gap-1">
                                                <Building2 size={10} /> {d.department}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-2">
                                                {d.items?.map((i: any, idx: number) => (
                                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase">
                                                        {i.quantity} {i.unit} • {i.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button 
                                                onClick={() => generateWarehouseExitPDF(d.receiver_name, d.department, d.items, d.signature_url, new Date(d.created_at).toLocaleDateString())}
                                                className="p-3 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm bg-blue-50"
                                            >
                                                <FileText size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : step === 2 ? (
                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                    <div className="w-full max-w-2xl bg-white p-12 rounded-[3rem] border border-gray-100 shadow-2xl space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-emerald-600">
                            <PenTool size={200} />
                        </div>
                        
                        <div className="text-center space-y-2 relative z-10">
                            <h2 className="text-3xl font-black text-gray-900">Validación de Entrega</h2>
                            <p className="text-gray-500 font-medium">Capture la firma del receptor para emitir el vale de salida</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Receptor Autorizado</span>
                                <p className="text-xl font-black text-gray-800">{receiverName}</p>
                                <p className="text-xs text-blue-600 font-bold uppercase mt-1">{department}</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-right">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Total Artículos</span>
                                <p className="text-xl font-black text-emerald-600">{cart.length} LINEAS</p>
                                <p className="text-xs text-gray-400 font-bold uppercase mt-1">{cart.reduce((sum, i) => sum + i.quantityToAdd, 0)} UNIDADES</p>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center px-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Firma Digital del Vale</label>
                                <button onClick={clearSignature} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-3 py-1 rounded-full transition-all">Limpiar Lienzo</button>
                            </div>
                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] overflow-hidden relative group">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={240}
                                    className="w-full h-60 touch-none cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!hasSignature && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300">
                                        <PenTool size={40} className="mb-2 opacity-20" />
                                        <p className="font-black uppercase tracking-[0.3em] text-[10px]">Área de Firma Obligatoria</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6 relative z-10">
                            <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-[1.5rem] bg-gray-100 text-gray-600 font-black uppercase text-xs tracking-[0.2em] hover:bg-gray-200 transition-all">Cancelar</button>
                            <button 
                                onClick={handleFinalize}
                                disabled={!hasSignature}
                                className={`flex-[2] py-5 rounded-[1.5rem] bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 ${!hasSignature ? 'opacity-50 grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
                            >
                                <CheckCircle2 size={20} />
                                Confirmar y Despachar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0 pb-32 lg:pb-6 pr-1 lg:pr-2">
                    
                    {/* Left: Product Selector */}
                    <div className="flex-[2] flex flex-col space-y-4 lg:space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Buscador Inteligente de Inventario</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, código o categoría..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 pb-12 content-start">
                            {loading ? (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Cargando Catálogo...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-4 text-center">
                                    <div className="p-8 bg-gray-50 rounded-[2.5rem] text-gray-200">
                                        <Package size={80} />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-gray-800">No se encontraron productos</p>
                                        <p className="text-gray-400 font-medium">Intenta con otros términos o códigos</p>
                                    </div>
                                </div>
                            ) : filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => item.current_stock > 0 && addToCart(item)}
                                    className={`group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between h-56 relative overflow-hidden ${item.current_stock <= 0 ? 'opacity-60' : 'hover:-translate-y-1'}`}
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-gray-400 group-hover:scale-110 transition-transform duration-500">
                                        <Package size={140} />
                                    </div>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <span className="px-3 py-1 bg-gray-50 text-[10px] font-black text-gray-400 rounded-full uppercase tracking-widest">{item.item_code || 'SIN COD'}</span>
                                            {item.current_stock > 0 ? (
                                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                    <Plus size={18} />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                                                    <AlertCircle size={18} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">{item.name}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <MapPin size={10} className="text-gray-300" />
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.location || 'BODEGA CENTRAL'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Disponibilidad</p>
                                            <p className={`text-2xl font-black tabular-nums ${item.current_stock <= (item.units_per_package || 5) ? 'text-rose-500' : 'text-gray-900'}`}>
                                                {item.current_stock}
                                                <span className="text-xs font-bold text-gray-400 ml-1 uppercase">{item.unit_of_measure}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.current_stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {item.current_stock > 0 ? 'En Stock' : 'Agotado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: POS Sidebar (Cart & Receptor) */}
                    <div id="mobile-cart-section" className="flex-1 w-full lg:w-auto lg:min-w-[400px] xl:min-w-[450px] flex flex-col gap-6 shrink-0 pt-8 lg:pt-0">
                        
                        {/* Receptor Info */}
                        <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-5 lg:space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                                    <User size={20} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Datos del Receptor</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo del Receptor</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700"
                                            placeholder="¿Quién recibe el material?"
                                            value={receiverName}
                                            onChange={e => setReceiverName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Departamento / Área</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                        <input
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700"
                                            placeholder="Ej. Administración, Ventas..."
                                            value={department}
                                            onChange={e => setDepartment(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* User Search Context */}
                            {receiverName.length > 2 && userHistory.length > 0 && (
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 animate-in fade-in slide-in-from-top duration-300">
                                    <div className="flex items-center gap-2 mb-3">
                                        <History size={12} className="text-blue-600" />
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Entregas Previas Recientes</span>
                                    </div>
                                    <div className="space-y-2">
                                        {userHistory.slice(0, 2).map((h: any) => (
                                            <div key={h.id} className="text-[10px] font-bold text-gray-500 flex justify-between bg-white/50 px-3 py-1.5 rounded-xl border border-blue-50">
                                                <span>{new Date(h.created_at).toLocaleDateString()}</span>
                                                <span className="text-blue-700 uppercase">{h.items?.length || 0} ITEMS</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cart POS */}
                        <div className="bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl shadow-slate-300 flex flex-col">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                                        <ShoppingCart size={20} />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Canasta</h3>
                                </div>
                                <span className="px-4 py-1.5 bg-white/5 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{cart.length} LINEAS</span>
                            </div>

                            <div className="px-8 py-6 space-y-6">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="p-6 bg-white/5 rounded-full text-slate-700">
                                            <ShoppingCart size={40} />
                                        </div>
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">La canasta está vacía</p>
                                    </div>
                                ) : cart.map(item => (
                                    <div key={item.id} className="bg-white/5 rounded-3xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <h4 className="text-white font-black text-sm line-clamp-1">{item.name}</h4>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">{item.category || 'General'}</span>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-end justify-between gap-4">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1.5 ml-1">Presentación de Despacho</label>
                                                <select 
                                                    value={item.dispenseUnit}
                                                    onChange={(e) => updateDispenseUnit(item.id, e.target.value)}
                                                    className="w-full bg-slate-800 border-none text-white text-[10px] font-black uppercase tracking-widest rounded-xl py-2 focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                                                >
                                                    {UNIT_OPTIONS.map(u => (
                                                        <option key={u.value} value={u.value}>{u.label}</option>
                                                    ))}
                                                    {/* Append inventory unit if not in the list */}
                                                    {!UNIT_OPTIONS.find(uo => uo.value === item.unit_of_measure) && (
                                                        <option value={item.unit_of_measure}>{item.unit_of_measure}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex items-center bg-slate-800 rounded-2xl p-1 gap-2 border border-white/5">
                                                <button onClick={() => updateQuantity(item.id, item.quantityToAdd - 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><Minus size={14} /></button>
                                                <input 
                                                    type="number" 
                                                    value={item.quantityToAdd} 
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-12 bg-transparent border-none text-white text-center font-black text-lg focus:ring-0 p-0"
                                                />
                                                <button onClick={() => updateQuantity(item.id, item.quantityToAdd + 1)} className="p-2 text-slate-400 hover:text-white transition-colors"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-black/20 border-t border-white/5 space-y-6">
                                <button 
                                    onClick={() => cart.length > 0 && setStep(2)}
                                    disabled={cart.length === 0}
                                    className={`w-full py-5 rounded-[1.5rem] bg-emerald-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 ${cart.length === 0 ? 'opacity-20 grayscale' : 'hover:scale-[1.02] active:scale-95'}`}
                                >
                                    Siguiente Paso
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Modal POS */}
            {showScanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <Camera className="text-emerald-500" /> Scanner Óptico
                                </h3>
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Coloque el código de barras frente a la cámara</p>
                            </div>
                            <button onClick={closeScanner} className="p-4 bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div id="delivery-scanner-region" className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-gray-900 relative shadow-inner border-4 border-gray-100">
                            {/* Scanner placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center border-2 border-emerald-500/50 m-12 rounded-3xl animate-pulse">
                                <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-8 text-center px-6">
                            <div className="flex-1 py-4 bg-gray-50 rounded-2xl">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Detectados</span>
                                <span className="text-2xl font-black text-emerald-600">--</span>
                            </div>
                            <div className="flex-1 py-4 bg-gray-50 rounded-2xl">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Último Código</span>
                                <span className="text-2xl font-black text-gray-800">--</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Fixed Cart Bar */}
            {step === 1 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">En Canasta</div>
                        <div className="font-black text-xl text-emerald-600">{cart.length} Ítems</div>
                    </div>
                    <button 
                        onClick={() => document.getElementById('mobile-cart-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest text-white bg-slate-900 shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingCart size={18} />
                        Ver Canasta
                    </button>
                </div>
            )}
        </div>
    )
}
