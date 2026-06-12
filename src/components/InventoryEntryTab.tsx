import React, { useState, useMemo, useEffect } from 'react'
import { Plus, Search, CheckCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui'
import { getInventory, createInventoryItem, updateInventoryStock, checkItemCodeExists, getNextItemCode } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  item_code?: string
  name: string
  category: string
  current_stock: number
  unit_cost: number
  unit_of_measure?: string
}

export default function InventoryEntryTab() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  
  // Entry Form State
  const [quantity, setQuantity] = useState<number>(1)
  const [unitCost, setUnitCost] = useState<number>(0)
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [isNewItem, setIsNewItem] = useState(false)
  
  // New Item State
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('LIBRERÍA')
  const [newItemUnit, setNewItemUnit] = useState('unidades')
  const [newItemMinStock] = useState(5)

  useEffect(() => {
    loadItems()
  }, [user?.license_id])

  const loadItems = async () => {
    if (!user?.license_id) return
    const data = await getInventory(user.license_id)
    setItems(data || [])
  }

  const filteredItems = useMemo(() => {
    if (!searchTerm) return []
    const term = searchTerm.toLowerCase()
    return items.filter(i => 
      i.name.toLowerCase().includes(term) || 
      (i.item_code && i.item_code.toLowerCase().includes(term))
    ).slice(0, 10)
  }, [items, searchTerm])

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setUnitCost(item.unit_cost || 0)
    setSearchTerm('')
    setIsNewItem(false)
  }

  const handleCreateNew = () => {
    setIsNewItem(true)
    setSelectedItem(null)
    setSearchTerm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.license_id) return

    try {
      toast.loading('Procesando ingreso...', { id: 'entry' })
      let itemId = selectedItem?.id

      if (isNewItem) {
        if (!newItemName) {
          toast.error('Nombre del producto requerido', { id: 'entry' })
          return
        }

        // Generate Code
        const prefix = newItemCategory.substring(0, 3).toUpperCase()
        let code = await getNextItemCode(user.license_id, prefix)
        let isTaken = await checkItemCodeExists(user.license_id, code)
        let num = parseInt(code.split('-')[1])
        while (isTaken) {
          num++
          code = `${prefix}-${String(num).padStart(3, '0')}`
          isTaken = await checkItemCodeExists(user.license_id, code)
        }

        const newItem = await createInventoryItem({
          license_id: user.license_id,
          item_code: code,
          name: newItemName,
          category: newItemCategory,
          min_stock: newItemMinStock,
          price: unitCost,
          location: 'Bodega Principal',
          unit_of_measure: newItemUnit,
          units_per_package: 1,
          stock: 0 // Will be updated by movement
        })

        if (!newItem) throw new Error('Failed to create item')
        itemId = newItem.id
      }

      if (!itemId) throw new Error('No item selected')

      // 1. Update Stock & Record Movement
      await updateInventoryStock(itemId, quantity, 'add', {
        licenseId: user.license_id,
        userId: user.id,
        relatedType: supplier ? 'supplier' : undefined,
        notes: `${notes} ${supplier ? `(Proveedor: ${supplier})` : ''}`.trim(),
        justification: `Ingreso de inventario`,
        purpose: 'Reabastecimiento'
      })

      // 2. Update unit cost if changed (only updates unit_cost, not stock)
      if (unitCost > 0) {
        const { supabase } = await import('@/services/supabaseClient')
        await supabase
          .from('inventory_items')
          .update({ unit_cost: unitCost })
          .eq('id', itemId)
      }

      toast.success('Ingreso registrado correctamente', { id: 'entry' })
      
      // Reset form
      setQuantity(1)
      setUnitCost(0)
      setSupplier('')
      setNotes('')
      setSelectedItem(null)
      setIsNewItem(false)
      setNewItemName('')
      loadItems()

    } catch (error) {
      console.error(error)
      toast.error('Error al registrar ingreso', { id: 'entry' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="text-primary" />
          Registrar Ingreso de Producto
        </h2>

        {/* Selection Area */}
        {!selectedItem && !isNewItem && (
          <div className="space-y-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar producto existente en inventario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all text-lg"
              />
            </div>
            
            {searchTerm && filteredItems.length > 0 && (
              <div className="bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.item_code} • {item.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">Stock: {item.current_stock}</div>
                      <div className="text-xs text-gray-500">Q {item.unit_cost?.toFixed(2)} c/u</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm && filteredItems.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No se encontró ningún producto.
              </div>
            )}

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm font-medium text-gray-400 uppercase">O crear nuevo</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <Button variant="secondary" className="w-full py-3" onClick={handleCreateNew}>
              <Plus size={20} className="mr-2" />
              Crear Nuevo Producto y Registrar Ingreso
            </Button>
          </div>
        )}

        {/* Selected Item Preview */}
        {selectedItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 block">Producto Seleccionado</span>
              <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Stock actual: <span className="font-bold text-blue-700">{selectedItem.current_stock}</span> {selectedItem.unit_of_measure}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
              Cambiar
            </Button>
          </div>
        )}

        {/* New Item Form */}
        {isNewItem && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider block">Creando Nuevo Producto</span>
              <Button variant="secondary" size="sm" onClick={() => setIsNewItem(false)}>Cancelar</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="input-base"
                  placeholder="Ej: Resma de Papel Tamaño Carta"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} className="input-base">
                  <option value="LIBRERÍA">Librería</option>
                  <option value="LIMPIEZA">Limpieza</option>
                  <option value="ABARROTES">Abarrotes</option>
                  <option value="HERRAMIENTAS Y MANTENIMIENTO">Herramientas</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                <select value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="input-base">
                  <option value="unidades">Unidades</option>
                  <option value="cajas">Cajas</option>
                  <option value="resmas">Resmas</option>
                  <option value="galones">Galones</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Common Entry Form */}
        {(selectedItem || isNewItem) && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Ingresar</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full text-2xl p-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  className="w-full text-2xl p-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor / Factura (Opcional)</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="input-base"
                  placeholder="Ej: Distribuidora El Sol - Factura #12345"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Observaciones</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-base min-h-[80px]"
                  placeholder="Detalles adicionales del ingreso..."
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
              <span className="text-gray-600 font-medium">Valor Total del Ingreso:</span>
              <span className="text-2xl font-black text-gray-900">Q {(quantity * unitCost).toFixed(2)}</span>
            </div>

            <Button type="submit" variant="primary" className="w-full py-4 text-lg">
              <CheckCircle size={24} className="mr-2" />
              Confirmar Ingreso de Inventario
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
