import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { 
    History, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Search, 
    Filter, 
    Tag, 
    HelpCircle, 
    Info,
    RefreshCw,
    LayoutGrid,
    Clock
} from 'lucide-react'

interface InventoryMovement {
  id: string
  item_name: string
  item_code: string
  change: number
  type: 'entrada' | 'salida'
  related_type_label: string
  user_name: string
  notes: string
  justification: string
  purpose: string
  created_at: string
}

export default function InventoryMovementsPage() {
  const { user } = useAuthStore()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'entrada' | 'salida' | 'all'>('all')
  const [filterItem, setFilterItem] = useState('')

  useEffect(() => {
    loadMovements()
  }, [user?.license_id])

  async function loadMovements() {
    if (!user?.license_id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vw_inventory_movements_detail')
        .select('*')
        .eq('license_id', user.license_id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setMovements(data || [])
    } catch (err) {
      console.error('Error loading movements:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = movements.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false
    if (filterItem && !m.item_name.toLowerCase().includes(filterItem.toLowerCase()) && !m.item_code.toLowerCase().includes(filterItem.toLowerCase())) return false
    return true
  })

  const stats = {
    total: movements.length,
    entries: movements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.change, 0),
    exits: movements.filter(m => m.type === 'salida').reduce((sum, m) => sum + m.change, 0),
    countEntries: movements.filter(m => m.type === 'entrada').length,
    countExits: movements.filter(m => m.type === 'salida').length,
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100">
                <History size={32} />
            </div>
            Trazabilidad de Inventario
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Historial detallado de cada entrada y salida del almacén</p>
        </div>
        <button 
            onClick={loadMovements}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-600 shadow-sm"
        >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualizar Datos
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative group overflow-hidden bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <LayoutGrid size={120} />
            </div>
            <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Actividad Total</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-gray-900">{stats.total}</span>
                    <span className="text-sm font-bold text-gray-400">registros</span>
                </div>
                <div className="mt-4 h-1 w-12 bg-blue-500 rounded-full"></div>
            </div>
        </div>

        <div className="relative group overflow-hidden bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-xl shadow-emerald-100/20 hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                <ArrowUpCircle size={120} />
            </div>
            <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Entradas (Stock +)</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-emerald-700">{Math.round(stats.entries)}</span>
                    <span className="text-sm font-bold text-emerald-500">unidades en {stats.countEntries} op.</span>
                </div>
                <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full"></div>
            </div>
        </div>

        <div className="relative group overflow-hidden bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-100/20 hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] text-rose-600 group-hover:scale-110 transition-transform duration-500">
                <ArrowDownCircle size={120} />
            </div>
            <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Salidas (Stock -)</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-rose-700">{Math.round(stats.exits)}</span>
                    <span className="text-sm font-bold text-rose-500">unidades en {stats.countExits} op.</span>
                </div>
                <div className="mt-4 h-1 w-12 bg-rose-500 rounded-full"></div>
            </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-end bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Buscador Inteligente</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre de producto o código..."
              value={filterItem}
              onChange={e => setFilterItem(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
            />
          </div>
        </div>
        
        <div className="w-full lg:w-64 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Filtrar por Flujo</label>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 appearance-none font-bold text-gray-600"
            >
                <option value="all">Todos los Movimientos</option>
                <option value="entrada">Solo Entradas (+)</option>
                <option value="salida">Solo Salidas (-)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sincronizando Historial...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
            <div className="p-6 bg-gray-50 rounded-full text-gray-200">
                <History size={64} />
            </div>
            <div>
                <p className="text-xl font-bold text-gray-800">No se encontraron movimientos</p>
                <p className="text-gray-400">Intenta ajustar los filtros de búsqueda</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporalidad</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Artículo / Producto</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Magnitud</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Referencia y Contexto</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 text-gray-400 rounded-lg group-hover:bg-white transition-colors">
                            <Clock size={16} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">{new Date(m.created_at).toLocaleDateString('es-GT')}</div>
                            <div className="text-[10px] text-gray-400 font-bold">{new Date(m.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className="font-black text-gray-800 text-base flex items-center gap-2">
                            {m.item_name}
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">{m.item_code}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <Tag size={10} className="text-gray-300" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{m.related_type_label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`text-2xl font-black tabular-nums ${m.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'entrada' ? '+' : '-'}{Math.round(m.change)}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unidades</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${m.type === 'entrada'
                        ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100'
                        : 'bg-rose-100 text-rose-700 shadow-sm shadow-rose-100'
                        }`}>
                        {m.type === 'entrada' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                        {m.type === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                            <HelpCircle size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                            <div className="text-xs font-bold text-gray-700 leading-tight line-clamp-2">{m.justification || 'Sin justificación registrada'}</div>
                        </div>
                        {m.purpose && (
                            <div className="flex items-start gap-2">
                                <Info size={14} className="text-blue-300 mt-0.5 flex-shrink-0" />
                                <div className="text-[10px] text-blue-600 font-medium italic">{m.purpose}</div>
                            </div>
                        )}
                        {m.notes && (
                            <div className="text-[10px] text-gray-400 pl-6 border-l border-gray-100 mt-2">{m.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-xs font-black">
                            {m.user_name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="text-xs font-bold text-gray-600">{m.user_name || 'Sistema'}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
