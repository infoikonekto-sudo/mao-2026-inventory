import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { Plus, Search, Edit, Trash2, X, Package, Printer, Camera, Hash, RefreshCw, Barcode, Layers, Tag, Filter, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import {
  getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  getNextItemCode, checkItemCodeExists, findInventoryItemByBarcode, bulkRenameCategory
} from '@/services/supabaseClient'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import toast from 'react-hot-toast'
import JsBarcode from 'jsbarcode'
import InventoryEntryTab from '@/components/InventoryEntryTab'

interface InventoryItem {
  id: string
  item_code?: string
  code?: string
  name: string
  category: string
  current_stock: number
  minimum_stock: number
  unit_cost: number
  location: string
  unit_of_measure?: string
  units_per_package?: number
  barcode?: string
  is_low_stock?: boolean
}

const UNIT_OPTIONS = [
  { value: 'unidades', label: 'Unidades', icon: '📦' },
  { value: 'cajas', label: 'Cajas', icon: '📦' },
  { value: 'paquetes', label: 'Paquetes', icon: '📦' },
  { value: 'docenas', label: 'Docenas', icon: '📦' },
  { value: 'bolsas', label: 'Bolsas', icon: '🛍️' },
  { value: 'libras', label: 'Libras', icon: '⚖️' },
  { value: 'kilogramos', label: 'Kilogramos', icon: '⚖️' },
  { value: 'litros', label: 'Litros', icon: '🧴' },
  { value: 'galones', label: 'Galones', icon: '🧴' },
  { value: 'metros', label: 'Metros', icon: '📐' },
  { value: 'rollos', label: 'Rollos', icon: '🧻' },
  { value: 'piezas', label: 'Piezas', icon: '🔩' },
  { value: 'resmas', label: 'Resmas', icon: '📄' },
  { value: 'fardos', label: 'Fardos', icon: '📦' },
]

const PACKAGE_UNITS = ['cajas', 'paquetes', 'docenas', 'bolsas', 'rollos', 'resmas', 'fardos']

const DEFAULT_CATEGORIES_LIST = [
  'LIMPIEZA',
  'LIBRERÍA',
  'MANUALIDADES',
  'ABARROTES',
  'ACTIVOS',
  'EVENTOS Y DECORACIÓN',
  'HERRAMIENTAS Y MANTENIMIENTO'
]

// ============================================================
// EXPERT TAXONOMY (Asistente de Inventarios y Logística)
// ============================================================
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'LIMPIEZA': [
    'jabon', 'jabón', 'detergente', 'cloro', 'escoba', 'trapeador', 'mopa', 'limpiador',
    'desinfectante', 'esponja', 'trapo', 'balde', 'cubeta', 'ambientador', 'aromatizante',
    'cepillo', 'guante', 'bolsa basura', 'papel higienico', 'papel higiénico', 'suavizante', 
    'blanqueador', 'pinesol', 'lavaplatos', 'lava trastes', 'quitagrasa', 'removedor', 'lejia', 
    'quimico', 'franela', 'escobillon', 'cera', 'lustramuebles', 'insecticida', 'basurero', 
    'recogedor', 'windex', 'fab', 'rinso', 'pastilla inodoro', 'sanitario', 'gel antibacterial'
  ],
  'LIBRERÍA': [
    'hoja', 'cuaderno', 'boligrafo', 'bolígrafo', 'lapicero', 'marcador', 'sobre', 'folder',
    'lapiz', 'lápiz', 'papel', 'carpeta', 'resaltador', 'corrector', 'grapadora', 'perforadora',
    'regla', 'borrador', 'tinta', 'pluma', 'libro', 'agenda', 'bloc', 'post-it', 'folio',
    'resma', 'toner', 'cartucho', 'oficina', 'clip', 'chincheta', 'cinta adhesiva', 'masking', 
    'sellador', 'grapa', 'cartulina', 'sacapuntas', 'fastener', 'pizarra', 'pliego', 'construccion', 'construcción'
  ],
  'MANUALIDADES': [
    'foamy', 'fomi', 'fomy', 'brillantina', 'papel china', 'lana', 'silicon', 'silicón', 
    'limpiapipas', 'arte', 'pintura', 'acuarela', 'pincel', 'crayón', 'crayon', 'plastilina',
    'yeso', 'pegamento', 'tijera', 'craft', 'fieltro', 'lentejuela', 'pompon', 'hilo', 'aguja', 
    'mariposa', 'ojitos', 'calcomania', 'sticker', 'diamantina', 'madera', 'balsa', 'tempera', 'acuarelas'
  ],
  'ABARROTES': [
    'comestible', 'vajilla', 'vaso', 'cubierto', 'reposteria', 'repostería', 'ingrediente',
    'leche', 'cafe', 'café', 'azucar', 'azúcar', 'arroz', 'frijol', 'harina', 'aceite', 'sal',
    'pasta', 'cereal', 'avena', 'atun', 'atún', 'galleta', 'jugo', 'refresco', 'agua', 'sopa',
    'plato', 'tenedor', 'cuchara', 'cuchillo', 'olla', 'sarten', 'servilleta',
    'consome', 'consomé', 'abarrote', 'abarroteria', 'snack', 'salsa', 'mayonesa', 'ketchup', 
    'mostaza', 'pimienta', 'especias', 'te', 'té', 'infusion', 'miel', 'mermelada', 'pan', 
    'tortilla', 'carne', 'pollo', 'queso', 'jamon', 'embutido', 'verdura', 'fruta', 'crema', 'mantequilla'
  ],
  'ACTIVOS': [
    'equipo', 'electronico', 'electrónico', 'mobiliario', 'silla', 'archivero', 'computadora',
    'laptop', 'monitor', 'impresora', 'escritorio', 'mesa', 'estante', 'locker', 'banco',
    'vitrina', 'pizarron', 'pizarrón', 'proyector', 'televisor', 'tablet', 'telefono', 'celular', 
    'camara', 'microondas', 'refrigerador', 'dispensador', 'ventilador', 'aire acondicionado', 
    'vehiculo', 'carro', 'moto', 'ipad', 'router', 'switch', 'servidor'
  ],
  'EVENTOS Y DECORACIÓN': [
    'globo', 'inflable', 'fiesta', 'liston', 'listón', 'decoracion', 'decoración',
    'guirnalda', 'piñata', 'mantel', 'adorno', 'confeti', 'sorpresa', 'regalo', 'moño', 
    'serpentina', 'vela', 'centro de mesa', 'flor', 'florero', 'invitacion', 'bengala', 'banderin'
  ],
  'HERRAMIENTAS Y MANTENIMIENTO': [
    'alicate', 'destornillador', 'cinta', 'reparacion', 'reparación', 'clavo', 'martillo',
    'llave', 'pinza', 'serrucho', 'taladro', 'broca', 'tornillo', 'tuerca', 'perno', 'nivel',
    'sierra', 'compresor', 'lijadora', 'soldadora', 'cincel', 'mazo', 'cable', 'foco', 'bombillo',
    'tubo', 'pvc', 'cemento', 'thinner', 'aguarras', 'brocha', 'rodillo', 'lampara', 'bateria', 
    'pila', 'extension', 'enchufe', 'interruptor', 'alambre', 'aislante'
  ],
}

function resolveCategory(baseCategory: string, allCategories?: string[]): string {
  if (!allCategories || allCategories.length === 0) return baseCategory;
  if (allCategories.includes(baseCategory)) return baseCategory;
  
  // Si no existe exactamente, buscamos si el usuario la renombró parcialmente
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedBase = normalize(baseCategory);
  const root = normalizedBase.substring(0, 5); // Ej: "abarr", "limpi"
  
  const match = allCategories.find(c => {
    const normalizedC = normalize(c);
    return normalizedC.includes(root);
  });
  
  return match || baseCategory;
}

function detectCategory(name: string, allCategories?: string[]): string | null {
  if (!name || name.length < 3) return null;
  const lower = name.toLowerCase();

  // EXCEPCIÓN 1: Si incluye "EN USO", es ACTIVOS.
  if (lower.includes('en uso')) return resolveCategory('ACTIVOS', allCategories);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedName = normalize(lower);
  
  // Dividimos el nombre del producto en palabras, eliminando números y caracteres especiales
  const nameWords = normalizedName.split(/[\s\-_]+/).filter(w => w.length > 2);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => {
      const normalizedKw = normalize(kw);
      // Coincidencia exacta de palabra (muy seguro)
      if (nameWords.includes(normalizedKw)) return true;
      // Coincidencia parcial si la palabra clave es suficientemente larga para no tener falsos positivos
      if (normalizedKw.length > 4 && normalizedName.includes(normalizedKw)) return true;
      return false;
    })) {
      return resolveCategory(category, allCategories);
    }
  }
  return null;
}

// ============================================================
// INLINE BARCODE RENDERER
// CRITICAL: Must be OUTSIDE the component so memo() works.
// If defined inside, React recreates the function type on every
// render, destroying and remounting the component each time.
// ============================================================
const InlineBarcode = memo(function InlineBarcode({
  value, width = 1, height = 30
}: { value: string; width?: number; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128', width, height, displayValue: false, margin: 2,
        })
      } catch { /* invalid barcode value */ }
    }
  }, [value, width, height])

  if (!value) return <span className="text-xs text-gray-400 italic">Sin código</span>
  return <svg ref={ref} className="inline-block" />
})

export default function InventoryPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'inventory' | 'entry'>('inventory')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [codeError, setCodeError] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [scannedItem, setScannedItem] = useState<any>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printItem, setPrintItem] = useState<InventoryItem | null>(null)
  const [printQuantity, setPrintQuantity] = useState(1)
  // ---- Nuevos estados ----
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false)
  const [batchPrintCategory, setBatchPrintCategory] = useState('')
  const [batchPrintQuantity, setBatchPrintQuantity] = useState(1)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try { 
      const saved = localStorage.getItem('mao_custom_categories')
      if (saved) return JSON.parse(saved)
      return DEFAULT_CATEGORIES_LIST
    } catch { return DEFAULT_CATEGORIES_LIST }
  })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  // Performance: debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterNoBarcode, setFilterNoBarcode] = useState(false)
  // Taxonomy Preview States
  const [showTaxonomyModal, setShowTaxonomyModal] = useState(false)
  const [taxonomyProposals, setTaxonomyProposals] = useState<any[]>([])
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set())
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 80

  const barcodePreviewRef = useRef<SVGSVGElement>(null)
  const barcodePrintRef = useRef<SVGSVGElement>(null)
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category: 'LIBRERÍA',
    stock: 0,
    min_stock: 0,
    price: 0,
    location: '',
    unit_of_measure: 'unidades',
    units_per_package: 1,
    justification: '',
    purpose: '',
  })

  useEffect(() => {
    if (user?.license_id) {
      loadInventory()
    }
  }, [user?.license_id])

  const handleRealtimeChange = useCallback(async () => {
    if (user?.license_id) {
      const data = await getInventory(user.license_id)
      setItems(data || [])
    }
  }, [user?.license_id])

  useRealtimeData('inventory_items', user?.license_id || '', handleRealtimeChange)

  const loadInventory = async () => {
    try {
      if (!user?.license_id) return
      const data = await getInventory(user.license_id)
      setItems(data || [])
    } catch (error) {
      console.error('Error loading inventory:', error)
      toast.error('Error cargando inventario')
    } finally {
      setLoading(false)
    }
  }

  // ---- Debounce: only refilter after 150ms of typing inactivity ----
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1) }, 150)
    return () => clearTimeout(t)
  }, [searchTerm])

  const allCategories = useMemo<string[]>(() => [
    ...customCategories,
    ...items.map(i => i.category).filter(c => !customCategories.includes(c)),
  ].filter((c, idx, arr) => arr.indexOf(c) === idx).sort(), [items, customCategories])

  const filteredItems = useMemo(() => items.filter(item => {
    const itemCode = item.code || item.item_code || ''
    const q = debouncedSearch.toLowerCase()
    const matchSearch = !debouncedSearch ||
      item.name.toLowerCase().includes(q) ||
      itemCode.toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    const matchCategory = !filterCategory || item.category === filterCategory
    const matchLowStock = !filterLowStock || (item.current_stock <= item.minimum_stock)
    const matchNoBarcode = !filterNoBarcode || !item.barcode
    return matchSearch && matchCategory && matchLowStock && matchNoBarcode
  }), [items, debouncedSearch, filterCategory, filterLowStock, filterNoBarcode])

  // Pagination slice — only render PAGE_SIZE rows at a time
  const pagedItems = useMemo(
    () => filteredItems.slice(0, currentPage * PAGE_SIZE),
    [filteredItems, currentPage, PAGE_SIZE]
  )
  const hasMore = filteredItems.length > pagedItems.length

  // Computed stats
  const noBarcodeCount = useMemo(() => items.filter(i => !i.barcode).length, [items])

  const totalValue = items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0)

  const isPackageUnit = PACKAGE_UNITS.includes(formData.unit_of_measure)

  // === CODE VALIDATION ===
  const validateCode = useCallback(async (code: string) => {
    if (!code.trim() || !user?.license_id) {
      setCodeError('')
      return
    }
    setCodeChecking(true)
    const exists = await checkItemCodeExists(user.license_id, code, editingId || undefined)
    setCodeError(exists ? 'Este código ya está en uso' : '')
    setCodeChecking(false)
  }, [user?.license_id, editingId])

  // Debounced code check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.item_code) {
        validateCode(formData.item_code)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [formData.item_code, validateCode])

  // === AUTO-GENERATE CODE ===
  const handleAutoGenerateCode = async () => {
    if (!user?.license_id) return
    try {
      const code = await getNextItemCode(user.license_id, formData.category)
      setFormData(prev => ({ ...prev, item_code: code }))
      setCodeError('')
      toast.success(`Código generado: ${code}`)
    } catch {
      toast.error('Error generando código')
    }
  }

  // === BARCODE PREVIEW ===
  useEffect(() => {
    if (barcodePreviewRef.current && formData.item_code.trim()) {
      try {
        JsBarcode(barcodePreviewRef.current, formData.item_code, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
        })
      } catch {
        // Invalid barcode value, ignore
      }
    }
  }, [formData.item_code])

  // === MODAL HANDLERS ===
  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingId(item.id)
      setFormData({
        item_code: item.code || item.item_code || '',
        name: item.name,
        category: item.category,
        stock: item.current_stock,
        min_stock: item.minimum_stock,
        price: item.unit_cost,
        location: item.location,
        unit_of_measure: item.unit_of_measure || 'unidades',
        units_per_package: item.units_per_package || 1,
        justification: '',
        purpose: '',
      })
    } else {
      setEditingId(null)
      setFormData({
        item_code: '',
        name: '',
        category: 'LIBRERÍA',
        stock: 0,
        min_stock: 0,
        price: 0,
        location: '',
        unit_of_measure: 'unidades',
        units_per_package: 1,
        justification: 'Carga inicial',
        purpose: 'Registro de nuevo producto',
      })
    }
    setCodeError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setCodeError('')
  }

  const handleSave = async () => {
    try {
      if (!formData.item_code.trim()) {
        toast.error('El código es requerido. Usa "Auto-generar" si necesitas uno.')
        return
      }
      if (!formData.name.trim()) {
        toast.error('El nombre es requerido')
        return
      }
      if (codeError) {
        toast.error('El código ya existe, elige otro')
        return
      }
      if (!user?.license_id) return

      const barcodeValue = formData.item_code.trim()

      if (editingId) {
        await updateInventoryItem(editingId, {
          item_code: formData.item_code.trim(),
          name: formData.name,
          category: formData.category,
          stock: formData.stock,
          min_stock: formData.min_stock,
          price: formData.price,
          location: formData.location,
          unit_of_measure: formData.unit_of_measure,
          units_per_package: isPackageUnit ? formData.units_per_package : 1,
          barcode: barcodeValue,
        }, {
          userId: user.id,
          justification: formData.justification,
          purpose: formData.purpose
        })
        toast.success('Item actualizado')
      } else {
        await createInventoryItem({
          license_id: user.license_id,
          ...formData,
          item_code: formData.item_code.trim(),
          units_per_package: isPackageUnit ? formData.units_per_package : 1,
          barcode: barcodeValue,
        })
        toast.success('Item creado')
      }

      await loadInventory()
      handleCloseModal()
    } catch (error: any) {
      console.error('Error saving item:', error)
      if (error?.message?.includes('idx_inventory_item_code_unique')) {
        toast.error('Este código ya está en uso por otro producto')
        setCodeError('Código duplicado detectado')
      } else if (error?.message?.includes('idx_inventory_barcode_unique')) {
        toast.error('Este código de barras ya existe')
      } else {
        toast.error('Error guardando item')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro? Se eliminará el producto y su código de barras.')) return
    try {
      await deleteInventoryItem(id)
      toast.success('Item y código de barras eliminados')
      await loadInventory()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Error eliminando item')
    }
  }

  // === PRINT BARCODE ===
  const handlePrint = (item: InventoryItem) => {
    setPrintItem(item)
    setPrintQuantity(1)
    setShowPrintModal(true)
  }

  useEffect(() => {
    if (showPrintModal && printItem && barcodePrintRef.current) {
      try {
        JsBarcode(barcodePrintRef.current, printItem.barcode || printItem.item_code || '', {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 8,
        })
      } catch {
        // Invalid barcode
      }
    }
  }, [showPrintModal, printItem])

  const executePrint = () => {
    if (!printItem || !barcodePrintRef.current) return

    const barcodeHtml = barcodePrintRef.current.outerHTML
    const labels = Array.from({ length: printQuantity }, () => `
      <div style="page-break-inside:avoid; border:1px dashed #ccc; padding:8px; margin:4px; display:inline-block; text-align:center; width:280px;">
        <p style="font-weight:bold; font-size:13px; margin:0 0 4px;">${printItem.name}</p>
        <p style="font-size:10px; color:#666; margin:0 0 6px;">
          ${printItem.category} | ${printItem.location || 'Sin ubicación'}
        </p>
        ${barcodeHtml}
        <p style="font-size:10px; color:#999; margin:4px 0 0;"></p>
      </div>
    `).join('')

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`
        <!DOCTYPE html><html><head><title>Etiquetas - ${printItem.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; }
          @media print { body { padding: 0; } }
          svg { max-width: 250px; }
        </style></head>
        <body>${labels}</body></html>
      `)
      w.document.close()
      setTimeout(() => { w.print() }, 300)
    }
  }

  // === BATCH BARCODE PRINT ===
  const executeBatchPrint = () => {
    const source = batchPrintCategory
      ? items.filter(i => i.category === batchPrintCategory)
      : items
    const itemsToPrint = source.filter(i => i.barcode || i.item_code || i.code)

    if (itemsToPrint.length === 0) {
      toast.error('No hay items con código en la selección')
      return
    }

    const labels = itemsToPrint.flatMap(item => {
      const codeValue = item.barcode || item.item_code || item.code || ''
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      try {
        JsBarcode(svg, codeValue, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 14, margin: 8 })
      } catch { return [] }
      return Array.from({ length: batchPrintQuantity }, () => `
        <div style="page-break-inside:avoid;border:1px dashed #ccc;padding:8px;margin:4px;display:inline-block;text-align:center;width:280px;">
          <p style="font-weight:bold;font-size:13px;margin:0 0 4px;">${item.name}</p>
          <p style="font-size:10px;color:#666;margin:0 0 6px;">${item.category} | ${item.location || 'Sin ubicación'}</p>
          ${svg.outerHTML}
          <p style="font-size:10px;color:#999;margin:4px 0 0;"></p>
        </div>`)
    }).join('')

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Etiquetas - ${batchPrintCategory || 'Todos'}</title>
        <style>body{font-family:Arial,sans-serif;padding:10px;}@media print{body{padding:0;}}svg{max-width:250px;}</style>
        </head><body>${labels}</body></html>`)
      w.document.close()
      setTimeout(() => { w.print() }, 500)
    }
    setShowBatchPrintModal(false)
  }

  // === CATEGORY MANAGEMENT ===
  const saveNewCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) { toast.error('Escribe un nombre para la categoría'); return }
    if (allCategories.includes(trimmed)) { toast.error('Esa categoría ya existe'); return }
    const updated = [...customCategories, trimmed]
    setCustomCategories(updated)
    localStorage.setItem('mao_custom_categories', JSON.stringify(updated))
    setNewCategoryName('')
    toast.success(`Categoría "${trimmed}" creada`)
  }

  const confirmRename = async () => {
    if (!renamingCategory || !renameValue.trim()) return
    const newName = renameValue.trim().toUpperCase()
    if (newName === renamingCategory) { setRenamingCategory(null); return }
    if (allCategories.includes(newName)) { toast.error('Ese nombre ya existe'); return }

    if (user?.license_id) {
      try {
        toast.loading(`Renombrando a "${newName}"...`, { id: 'rename-cat' })
        await bulkRenameCategory(user.license_id, renamingCategory, newName)
        toast.success(`Categoría renombrada a "${newName}"`, { id: 'rename-cat' })
        await loadInventory()
      } catch (err) {
        toast.error('Error al renombrar categoría', { id: 'rename-cat' })
        return
      }
    }

    const updated = customCategories.map(c => c === renamingCategory ? newName : c)
    if (!updated.includes(newName)) updated.push(newName)
    setCustomCategories(updated)
    localStorage.setItem('mao_custom_categories', JSON.stringify(updated))
    setRenamingCategory(null)
  }

  const deleteCustomCategory = async (cat: string) => {
    const itemsInCat = items.filter(i => i.category === cat)
    if (itemsInCat.length > 0) {
      if (!window.confirm(`⚠️ La categoría "${cat}" tiene ${itemsInCat.length} productos. Si la eliminas, pasarán a estar "SIN CATEGORÍA". ¿Continuar?`)) return
      
      if (user?.license_id) {
        try {
          toast.loading('Reasignando productos...', { id: 'delete-cat' })
          await bulkRenameCategory(user.license_id, cat, 'SIN CATEGORÍA')
          toast.success(`Categoría "${cat}" eliminada`, { id: 'delete-cat' })
          await loadInventory()
        } catch (err) {
          toast.error('Error al eliminar categoría', { id: 'delete-cat' })
          return
        }
      }
    } else {
      if (!window.confirm(`¿Eliminar la categoría vacía "${cat}"?`)) return
    }

    const updated = customCategories.filter(c => c !== cat)
    setCustomCategories(updated)
    localStorage.setItem('mao_custom_categories', JSON.stringify(updated))
  }

  // === BARCODE SCANNER ===
  const startScanner = async () => {
    setShowScanModal(true)
    setScannedItem(null)

    // Use html5-qrcode dynamically
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('barcode-scanner-region')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 100 },
          },
          async (decodedText: string) => {
            // Found barcode
            scanner.stop().catch(() => { })
            scannerRef.current = null

            if (!user?.license_id) return

            toast.loading('Buscando producto...', { id: 'scan-search' })
            const item = await findInventoryItemByBarcode(user.license_id, decodedText)
            toast.dismiss('scan-search')

            if (item) {
              setScannedItem(item)
              toast.success(`Producto encontrado: ${item.name}`)
            } else {
              toast.error(`No se encontró producto con código: ${decodedText}`)
              setScannedItem({ notFound: true, barcode: decodedText })
            }
          },
          () => { } // ignore errors during scanning
        )
      } catch (error) {
        console.error('Scanner error:', error)
        toast.error('Error al iniciar la cámara. Verifica los permisos.')
      }
    }, 300)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => { })
      scannerRef.current = null
    }
    setShowScanModal(false)
    setScannedItem(null)
  }

  // === STOCK DISPLAY HELPER ===
  const getStockDisplay = (item: InventoryItem) => {
    const unit = item.unit_of_measure || 'unidades'
    const upp = item.units_per_package || 1
    const isPkg = PACKAGE_UNITS.includes(unit)

    if (isPkg && upp > 1) {
      const totalIndividual = (item.current_stock || 0) * upp
      return {
        main: `${item.current_stock || 0} ${unit}`,
        detail: `${totalIndividual} uds individuales`,
        perPackage: `${upp} uds/${unit.slice(0, -1)}`,
      }
    }
    return {
      main: `${item.current_stock || 0}`,
      detail: unit !== 'unidades' ? unit : null,
      perPackage: null,
    }
  }

  // === BARCODE AUTO-GENERATOR ===
  const handleGenerateMissingBarcodes = async () => {
    // All items that don't have a real barcode field
    const missing = items.filter(i => !i.barcode)
    if (missing.length === 0) {
      toast.success('Todos los items ya tienen código de barras ✅')
      return
    }

    toast.loading(`Procesando ${missing.length} items en lotes...`, { id: 'gen-bc' })

    // Build a set of all existing codes to guarantee uniqueness
    const usedCodes = new Set(
      items.flatMap(i => [i.barcode, i.item_code, i.code].filter(Boolean) as string[])
    )

    // Para evitar chocar con códigos existentes o consultar la DB por cada item,
    // calculamos en memoria el número más alto por categoría.
    const maxNumberByCategory: Record<string, number> = {}
    
    items.forEach(item => {
      const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      // En el futuro, si importamos CATEGORY_PREFIXES desde supabaseClient, usaríamos eso. Por ahora tomamos las 3 primeras letras.
      const prefix = normalize(item.category).substring(0, 3) || 'GEN'
      const codes = [item.item_code, item.code, item.barcode].filter(Boolean) as string[]
      
      codes.forEach(c => {
        if (c.toUpperCase().startsWith(prefix)) {
          const match = c.match(/(\d+)$/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (!maxNumberByCategory[prefix] || num > maxNumberByCategory[prefix]) {
              maxNumberByCategory[prefix] = num
            }
          }
        }
      })
    })

    // Helper: generate a clean alphanumeric code from category
    const buildCode = (category: string): string => {
      const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      const prefix = normalize(category).substring(0, 3) || 'GEN'
      
      let nextNum = (maxNumberByCategory[prefix] || 0) + 1
      maxNumberByCategory[prefix] = nextNum
      
      let code = `${prefix}-${String(nextNum).padStart(3, '0')}`
      while (usedCodes.has(code)) {
        nextNum++
        maxNumberByCategory[prefix] = nextNum
        code = `${prefix}-${String(nextNum).padStart(3, '0')}`
      }
      usedCodes.add(code)
      return code
    }

    // Build update payloads
    const updates = missing.map((item) => {
      const existingCode = item.item_code || item.code || ''
      const codeValue = existingCode || buildCode(item.category)
      return {
        id: item.id,
        hasExistingCode: !!existingCode,
        payload: {
          barcode: codeValue,
          ...(existingCode ? {} : { item_code: codeValue }),
        },
      }
    })

    // Process in batches of 25 to avoid Supabase rate limits
    const BATCH = 25
    let done = 0
    try {
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH)
        await Promise.all(batch.map(u =>
          updateInventoryItem(u.id, u.payload, {
            userId: user!.id,
            justification: u.hasExistingCode
              ? 'Asignación automática de barcode desde código existente'
              : 'Generación automática de código e barcode',
            purpose: 'Normalización de inventario',
          })
        ))
        done += batch.length
        toast.loading(
          `Procesando... ${done}/${missing.length}`,
          { id: 'gen-bc' }
        )
      }

      const newCodes = updates.filter(u => !u.hasExistingCode).length
      const fromExisting = updates.filter(u => u.hasExistingCode).length
      toast.success(
        `✅ ${missing.length} items procesados: ${newCodes} códigos nuevos generados, ${fromExisting} barcodes asignados desde código existente`,
        { id: 'gen-bc', duration: 5000 }
      )
      await loadInventory()
    } catch (err) {
      console.error('Error generating barcodes:', err)
      toast.error(`Error en lote ${Math.floor(done / BATCH) + 1} — ${done} de ${missing.length} procesados`, { id: 'gen-bc' })
    }
  }

  // === AUTO-CLASSIFY ALL ITEMS (PREVIEW) ===
  const handleAutoClassifyAll = () => {
    if (!user) return
    
    const updates = items.filter(item => {
      const detected = detectCategory(item.name, allCategories)
      return detected && detected !== item.category
    }).map(item => ({
      id: item.id,
      name: item.name,
      oldCategory: item.category,
      newCategory: detectCategory(item.name, allCategories) as string,
      payload: { category: detectCategory(item.name, allCategories) as string }
    }))

    if (updates.length === 0) {
      toast.success('Todos los items ya están clasificados correctamente según la taxonomía.')
      return
    }

    setTaxonomyProposals(updates)
    setSelectedProposals(new Set(updates.map(u => u.id)))
    setShowTaxonomyModal(true)
  }

  const applyTaxonomySelection = async () => {
    if (!user) return
    const updates = taxonomyProposals.filter(u => selectedProposals.has(u.id))
    
    if (updates.length === 0) {
      setShowTaxonomyModal(false)
      return
    }

    setShowTaxonomyModal(false)
    toast.loading(`Clasificando ${updates.length} items...`, { id: 'auto-class' })
    const BATCH = 25
    let done = 0
    try {
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH)
        await Promise.all(batch.map(u =>
          updateInventoryItem(u.id, u.payload, {
            userId: user.id,
            justification: `Re-clasificación automática confirmada de ${u.oldCategory} a ${u.newCategory}`,
            purpose: 'Normalización de inventario con asistente logístico',
          })
        ))
        done += batch.length
        toast.loading(
          `Clasificando... ${done}/${updates.length}`,
          { id: 'auto-class' }
        )
      }
      toast.success(`✅ ${updates.length} items clasificados correctamente`, { id: 'auto-class', duration: 5000 })
      await loadInventory()
    } catch (err) {
      console.error('Error auto-classifying:', err)
      toast.error('Error durante la clasificación masiva', { id: 'auto-class' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Gestión de Inventario</h1>
          <p className="text-gray-600 mt-1">Administra, escanea e imprime etiquetas de inventario</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'inventory' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            📋 Inventario Actual
          </button>
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'entry' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            📥 Registrar Ingreso
          </button>
        </div>
      </div>

      {activeTab === 'entry' ? (
        <InventoryEntryTab />
      ) : (
        <>
          {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <p className="text-sm text-gray-600">Total de Items</p>
          <p className="text-3xl font-bold text-primary mt-2">{items.length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Valor Total</p>
          <p className="text-3xl font-bold text-success mt-2">Q {totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Stock Bajo</p>
          <p className="text-3xl font-bold text-warning mt-2">{items.filter(i => i.is_low_stock || (i.current_stock <= i.minimum_stock)).length}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">Con Barcode</p>
          <p className="text-3xl font-bold text-primary mt-2">{items.filter(i => i.barcode).length}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="space-y-3">
        {/* Row 1: Search + main actions */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, código, categoría o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base pl-10"
            />
          </div>
          <Button variant="secondary" size="md" onClick={startScanner}>
            <Camera size={20} className="mr-2" />
            Escanear
          </Button>
          <Button variant="primary" size="md" onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Nuevo Item
          </Button>
        </div>

        {/* Row 2: Filters + batch actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-base"
          >
            <option value="">🗂️ Todas las categorías</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterLowStock(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
              filterLowStock
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700'
            }`}
          >
            <Filter size={16} />
            ⚠️ Stock Bajo
            {filterLowStock && (
              <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">
                {items.filter(i => i.current_stock <= i.minimum_stock).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterNoBarcode(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
              filterNoBarcode
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700'
            }`}
          >
            <Barcode size={16} />
            Sin Código de Barras
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterNoBarcode ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'}`}>
              {noBarcodeCount}
            </span>
          </button>

          {/* Auto-generate barcodes button — visible only when no-barcode filter is ON */}
          {filterNoBarcode && noBarcodeCount > 0 && (
            <button
              onClick={handleGenerateMissingBarcodes}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500 bg-green-600 text-white hover:bg-green-700 font-medium text-sm transition-colors shadow-sm"
            >
              <Barcode size={16} />
              ⚡ Generar {noBarcodeCount} códigos automáticamente
            </button>
          )}

          <button
            onClick={() => { setBatchPrintCategory(filterCategory); setShowBatchPrintModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 font-medium text-sm transition-colors"
          >
            <Layers size={16} />
            Imprimir en Lote
          </button>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-green-50 hover:border-green-400 hover:text-green-700 font-medium text-sm transition-colors"
          >
            <Tag size={16} />
            Categorías
          </button>

          {(searchTerm || filterCategory || filterLowStock) && (
            <button
              onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterLowStock(false); setFilterNoBarcode(false) }}
              className="text-sm text-red-600 hover:text-red-800 underline px-2"
            >
              Limpiar filtros
            </button>
          )}

          <span className="text-sm text-gray-400 ml-auto">
            {filteredItems.length} de {items.length} items
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Mínimo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Ubicación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedItems.map((item) => {
                  const stockInfo = getStockDisplay(item)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {item.code || item.item_code || <span className="text-gray-400">Sin código</span>}
                      </td>
                      <td className="px-4 py-3">
                        {item.barcode ? (
                          <InlineBarcode value={item.barcode} width={0.8} height={24} />
                        ) : item.item_code ? (
                          <div className="flex flex-col gap-0.5">
                            <InlineBarcode value={item.item_code} width={0.8} height={24} />
                            <span className="text-[10px] text-orange-500 font-medium">⚠️ usando código</span>
                          </div>
                        ) : (
                          <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded font-medium">❌ Sin barcode</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <span className={`font-semibold ${(item.current_stock || 0) <= (item.minimum_stock || 0) ? 'text-error' : 'text-gray-900'}`}>
                            {stockInfo.main}
                          </span>
                          {stockInfo.detail && (
                            <p className="text-xs text-blue-600 mt-0.5">{stockInfo.detail}</p>
                          )}
                          {stockInfo.perPackage && (
                            <p className="text-xs text-gray-400 mt-0.5">{stockInfo.perPackage}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.minimum_stock || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Q {(item.unit_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="text-gray-500 hover:bg-gray-100 px-2 py-1 rounded"
                            title="Imprimir etiqueta"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="text-primary hover:bg-blue-50 px-2 py-1 rounded"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-error hover:bg-red-50 px-2 py-1 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'No hay items con los filtros actuales'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-gray-500 mb-2">
                Mostrando <strong>{pagedItems.length}</strong> de <strong>{filteredItems.length}</strong> items
              </p>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm font-medium"
              >
                Cargar más ({filteredItems.length - pagedItems.length} restantes)
              </button>
            </div>
          )}
        </div>
      )}


      {/* ====== CREATE/EDIT MODAL ====== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Item' : 'Nuevo Item'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Code with auto-generate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Hash size={14} className="inline mr-1" />
                  Código *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={formData.item_code}
                      onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                      className={`input-base font-mono ${codeError ? 'border-red-500 bg-red-50' : ''}`}
                      placeholder="Ej: LIB-001"
                    />
                    {codeChecking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Verificando...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 text-sm whitespace-nowrap"
                    title="Generar código automáticamente"
                  >
                    <RefreshCw size={14} />
                    Auto
                  </button>
                </div>
                {codeError && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {codeError}</p>
                )}
              </div>

              {/* Barcode Preview */}
              {formData.item_code.trim() && (
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <Barcode size={12} /> Vista previa del código de barras
                  </p>
                  <svg ref={barcodePreviewRef} className="mx-auto" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base"
                  placeholder="Ej: Lapiceros Azules"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-base flex-1"
                  >
                    {allCategories.map(cat => {
                      return (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const detected = detectCategory(formData.name, allCategories)
                      if (detected) {
                        setFormData(prev => ({ ...prev, category: detected }))
                        toast.success(`Categoría asignada automáticamente: ${detected}`)
                      } else {
                        toast.error('No se pudo identificar una categoría para este nombre')
                      }
                    }}
                    className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors"
                    title="Asignar categoría sugerida según el nombre"
                  >
                    🤖 Auto-Clasificar
                  </button>
                </div>
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Package size={14} className="inline mr-1" />
                  Unidad de Medida
                </label>
                <select
                  value={formData.unit_of_measure}
                  onChange={(e) => {
                    const newUnit = e.target.value
                    setFormData({
                      ...formData,
                      unit_of_measure: newUnit,
                      units_per_package: PACKAGE_UNITS.includes(newUnit) ? formData.units_per_package : 1,
                    })
                  }}
                  className="input-base"
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Units per Package */}
              {isPackageUnit && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    📦 Unidades individuales por {formData.unit_of_measure.slice(0, -1)}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.units_per_package}
                    onChange={(e) => setFormData({ ...formData, units_per_package: parseInt(e.target.value) || 1 })}
                    className="input-base"
                    placeholder={`Ej: 24 unidades por ${formData.unit_of_measure.slice(0, -1)}`}
                  />
                  {formData.stock > 0 && formData.units_per_package > 1 && (
                    <div className="mt-2 bg-white rounded-md p-2 border border-blue-100">
                      <p className="text-xs text-blue-700">
                        <strong>{formData.stock}</strong> {formData.unit_of_measure} × <strong>{formData.units_per_package}</strong> uds = {' '}
                        <span className="text-blue-900 font-bold text-sm">
                          {formData.stock * formData.units_per_package} unidades individuales
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock ({formData.unit_of_measure})
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="input-base"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                    className="input-base"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (Q)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="input-base"
                  min="0"
                  step="0.01"
                />
                {isPackageUnit && formData.units_per_package > 1 && formData.price > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Precio por unidad individual: <strong>Q {(formData.price / formData.units_per_package).toFixed(2)}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-base"
                  placeholder="Ej: Estante A-1"
                />
              </div>

              {/* Trazabilidad fields */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trazabilidad (Por qué y Para qué)</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justificación (Por qué se cambia el stock?)</label>
                  <input
                    type="text"
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    className="input-base bg-white"
                    placeholder="Ej: Ajuste de inventario físico, Ingreso por compra, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Propósito (Para qué / Destino)</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="input-base bg-white"
                    placeholder="Ej: Reposición de almacén central, Consumo interno, etc."
                  />
                </div>
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
                  disabled={!!codeError || codeChecking}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== PRINT MODAL ====== */}
      {showPrintModal && printItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Printer size={20} /> Imprimir Etiqueta
              </h2>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 text-center mb-4">
              <p className="font-bold text-lg">{printItem.name}</p>
              <p className="text-sm text-gray-500 mb-2">{printItem.category} | {printItem.location || 'Sin ubicación'}</p>
              <svg ref={barcodePrintRef} className="mx-auto" />
              <p className="text-xs text-gray-400 mt-2">
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de etiquetas</label>
              <input
                type="number"
                min="1"
                max="50"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                className="input-base w-32"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={executePrint}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Imprimir {printQuantity > 1 ? `(${printQuantity})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SCAN MODAL ====== */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Camera size={20} /> Escanear Código de Barras
              </h2>
              <button onClick={stopScanner} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {!scannedItem && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Apunta la cámara al código de barras del producto
                </p>
                <div
                  id="barcode-scanner-region"
                  ref={scannerContainerRef}
                  className="w-full rounded-lg overflow-hidden border-2 border-blue-300"
                  style={{ minHeight: 280 }}
                />
              </>
            )}

            {/* Scanned Result */}
            {scannedItem && !scannedItem.notFound && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-2">
                <p className="text-green-800 font-bold text-lg">✅ Producto Encontrado</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Código</p>
                    <p className="font-mono font-bold">{scannedItem.item_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nombre</p>
                    <p className="font-bold">{scannedItem.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Categoría</p>
                    <p>{scannedItem.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stock</p>
                    <p className={`font-bold ${(scannedItem.current_stock || 0) <= (scannedItem.minimum_stock || 0) ? 'text-red-600' : 'text-green-700'}`}>
                      {scannedItem.current_stock} {scannedItem.unit_of_measure || 'uds'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Precio</p>
                    <p className="font-bold">Q {(scannedItem.unit_cost || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ubicación</p>
                    <p>{scannedItem.location || '—'}</p>
                  </div>
                  {scannedItem.units_per_package > 1 && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Unidades/paquete</p>
                      <p className="text-blue-700 font-bold">
                        {scannedItem.units_per_package} uds/{(scannedItem.unit_of_measure || 'unidad').slice(0, -1)}
                        {' '}= {scannedItem.current_stock * scannedItem.units_per_package} uds totales
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setScannedItem(null); startScanner() }}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm"
                  >
                    Escanear otro
                  </button>
                  <button
                    onClick={() => {
                      stopScanner()
                      const item = items.find(i => i.id === scannedItem.id)
                      if (item) handleOpenModal(item)
                    }}
                    className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm"
                  >
                    Editar producto
                  </button>
                </div>
              </div>
            )}

            {scannedItem?.notFound && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
                <p className="text-red-800 font-bold">❌ Producto no encontrado</p>
                <p className="text-red-600 text-sm mt-1 font-mono">{scannedItem.barcode}</p>
                <p className="text-gray-500 text-xs mt-2">Este código no está registrado en el inventario</p>
                <button
                  onClick={() => { setScannedItem(null); startScanner() }}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ====== BATCH PRINT MODAL ====== */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers size={20} /> Imprimir Etiquetas en Lote
              </h2>
              <button onClick={() => setShowBatchPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (vacío = todas)</label>
                <select value={batchPrintCategory} onChange={(e) => setBatchPrintCategory(e.target.value)} className="input-base">
                  <option value="">🗂️ Todas las categorías</option>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copias por producto</label>
                <input type="number" min="1" max="20" value={batchPrintQuantity}
                  onChange={(e) => setBatchPrintQuantity(parseInt(e.target.value) || 1)}
                  className="input-base w-32" />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                {(() => {
                  const src = batchPrintCategory ? items.filter(i => i.category === batchPrintCategory) : items
                  const cnt = src.filter(i => i.barcode || i.item_code || i.code).length
                  return <><strong>{cnt}</strong> productos × <strong>{batchPrintQuantity}</strong> copias = <strong>{cnt * batchPrintQuantity}</strong> etiquetas</>
                })()}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBatchPrintModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={executeBatchPrint} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center gap-2">
                  <Printer size={16} /> Imprimir Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== CATEGORY MANAGEMENT MODAL ====== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Tag size={20} /> Gestionar Categorías</h2>
              <button onClick={() => { setShowCategoryModal(false); setRenamingCategory(null) }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="mb-5 bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-1">
                🤖 Asistente Logístico
              </h3>
              <p className="text-xs text-indigo-700 mb-3">
                Aplica la taxonomía automáticamente a todos los productos del inventario basados en su nombre.
              </p>
              <button 
                onClick={handleAutoClassifyAll}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex justify-center items-center gap-2 shadow-sm transition-colors"
              >
                Aplicar taxonomía al inventario actual
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">➕ Nueva Categoría</label>
              <div className="flex gap-2">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()}
                  placeholder="Ej: Tecnología, Deportes..." className="input-base flex-1" />
                <button onClick={saveNewCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">Crear</button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Todas las Categorías</p>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                {allCategories.map(cat => (
                  <div key={cat} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    {renamingCategory === cat ? (
                      <>
                        <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                          className="input-base flex-1 py-1 text-sm uppercase" autoFocus />
                        <button onClick={confirmRename} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button>
                        <button onClick={() => setRenamingCategory(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm flex-1 font-medium text-gray-700">🏷️ {cat}</span>
                        <button onClick={() => { setRenamingCategory(cat); setRenameValue(cat) }}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded" title="Renombrar"><Edit size={14} /></button>
                        <button onClick={() => deleteCustomCategory(cat)}
                          className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t">
              <button onClick={() => { setShowCategoryModal(false); setRenamingCategory(null) }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAXONOMY PREVIEW MODAL ====== */}
      {showTaxonomyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle size={24} className="text-blue-600" />
                Sugerencias de Taxonomía
              </h2>
              <button onClick={() => setShowTaxonomyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Se han encontrado <strong>{taxonomyProposals.length}</strong> productos que podrían estar mal categorizados. 
              Selecciona cuáles deseas que el asistente corrija automáticamente:
            </p>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600"
                        checked={selectedProposals.size === taxonomyProposals.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedProposals(new Set(taxonomyProposals.map(p => p.id)))
                          else setSelectedProposals(new Set())
                        }}
                      />
                    </th>
                    <th className="p-3">Producto</th>
                    <th className="p-3 text-red-600">Categoría Actual</th>
                    <th className="p-3 text-green-600">Nueva Sugerencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {taxonomyProposals.map((prop) => (
                    <tr key={prop.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-600"
                          checked={selectedProposals.has(prop.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedProposals)
                            if (e.target.checked) newSet.add(prop.id)
                            else newSet.delete(prop.id)
                            setSelectedProposals(newSet)
                          }}
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-900">{prop.name}</td>
                      <td className="p-3 line-through text-gray-500">{prop.oldCategory}</td>
                      <td className="p-3 text-green-700 font-semibold flex items-center gap-1">
                        <ArrowRight size={14} /> {prop.newCategory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-3 pt-4 border-t">
              <button 
                onClick={() => setShowTaxonomyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button 
                onClick={applyTaxonomySelection}
                disabled={selectedProposals.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                Aplicar {selectedProposals.size} cambios
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
