import { useState, useEffect } from 'react'
import { Upload, Download, RotateCcw, Eye, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabaseClient'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface InventoryRow {
  [key: string]: any
}

interface ImportHistory {
  id: string
  filename: string
  total_rows: number
  success_rows: number
  error_rows: number
  status: string
  created_at: string
  can_undo: boolean
}

interface ColumnMapping {
  id: string
  mapping_name: string
  mapping_config: any
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export default function InventoryImportPage() {
  const { user, license } = useAuthStore()
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload')
  const [rawData, setRawData] = useState<InventoryRow[]>([])
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [savedMappings, setSavedMappings] = useState<ColumnMapping[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([])
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<any>(null)
  const [selectedMapping, setSelectedMapping] = useState<string>('')
  const [saveMappingName, setSaveMappingName] = useState('')

  const requiredFields = ['Código', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Costo Unitario']
  const optionalFields = ['Item Code', 'Código de Barras', 'Ubicación', 'Descripción', 'Unidad de Medida', 'Unidades por Paquete']

  useEffect(() => {
    loadSavedMappings()
    loadImportHistory()
  }, [])

  const loadSavedMappings = async () => {
    try {
      if (!license?.id) return
      const { data, error } = await supabase
        .from('inventory_column_mappings')
        .select('*')
        .eq('license_id', license.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedMappings(data || [])
    } catch (error) {
      console.error('Error loading mappings:', error)
    }
  }

  const loadImportHistory = async () => {
    try {
      if (!license?.id) return
      const { data, error } = await supabase
        .from('inventory_imports')
        .select('*')
        .eq('license_id', license.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setImportHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(worksheet) as InventoryRow[]

      if (rows.length === 0) {
        toast.error('El archivo está vacío')
        return
      }

      setRawData(rows)
      setFileColumns(Object.keys(rows[0]))
      setStep('mapping')
      toast.success(`${rows.length} filas cargadas`)
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error al leer el archivo')
    }
  }

  const autoMapColumns = () => {
    const mapping: Record<string, string> = {}

    fileColumns.forEach(col => {
      const colLower = col.toLowerCase()
      if (colLower.includes('código') || colLower.includes('code')) mapping[col] = 'Código'
      else if (colLower.includes('nombre') || colLower.includes('name')) mapping[col] = 'Nombre'
      else if (colLower.includes('categoría') || colLower.includes('category')) mapping[col] = 'Categoría'
      else if (colLower.includes('stock actual') || colLower.includes('current stock')) mapping[col] = 'Stock Actual'
      else if (colLower.includes('stock mínimo') || colLower.includes('min')) mapping[col] = 'Stock Mínimo'
      else if (colLower.includes('costo') || colLower.includes('price') || colLower.includes('cost')) mapping[col] = 'Costo Unitario'
      else if (colLower.includes('ubicación') || colLower.includes('location')) mapping[col] = 'Ubicación'
      else if (colLower.includes('descripción') || colLower.includes('description')) mapping[col] = 'Descripción'
      else if (colLower.includes('unidad') || colLower.includes('u.m') || colLower.includes('medida')) mapping[col] = 'Unidad de Medida'
      else if (colLower.includes('paquete') || colLower.includes('package') || colLower.includes('unidades por')) mapping[col] = 'Unidades por Paquete'
      else if (colLower.includes('item code') || colLower.includes('código it') || colLower.includes('serial')) mapping[col] = 'Item Code'
      else if (colLower.includes('bar') || colLower.includes('ean') || colLower.includes('barras')) mapping[col] = 'Código de Barras'
    })

    setColumnMapping(mapping)
  }

  const validateData = () => {
    const errors: ValidationError[] = []
    const mappedValues = Object.values(columnMapping)

    // Verificar que todos los campos requeridos estén mapeados
    requiredFields.forEach(field => {
      if (!mappedValues.includes(field)) {
        errors.push({
          row: 0,
          field,
          message: `Campo requerido no mapeado: ${field}`,
        })
      }
    })

    // Validar datos de cada fila
    rawData.forEach((row, idx) => {
      const mappedRow: Record<string, any> = {}

      Object.entries(columnMapping).forEach(([fileCol, dbField]) => {
        if (dbField) mappedRow[dbField] = row[fileCol]
      })

      // Validar requeridos
      if (!mappedRow['Código'] || String(mappedRow['Código']).trim() === '') {
        errors.push({ row: idx + 2, field: 'Código', message: 'Código es requerido' })
      }
      if (!mappedRow['Nombre'] || String(mappedRow['Nombre']).trim() === '') {
        errors.push({ row: idx + 2, field: 'Nombre', message: 'Nombre es requerido' })
      }
      if (!mappedRow['Categoría']) {
        errors.push({ row: idx + 2, field: 'Categoría', message: 'Categoría es requerida' })
      }

      // Validar números
      if (isNaN(Number(mappedRow['Stock Actual']))) {
        errors.push({ row: idx + 2, field: 'Stock Actual', message: 'Debe ser un número' })
      }
      if (isNaN(Number(mappedRow['Stock Mínimo']))) {
        errors.push({ row: idx + 2, field: 'Stock Mínimo', message: 'Debe ser un número' })
      }
      if (isNaN(Number(mappedRow['Costo Unitario']))) {
        errors.push({ row: idx + 2, field: 'Costo Unitario', message: 'Debe ser un número' })
      }
      if (mappedRow['Unidades por Paquete'] && isNaN(Number(mappedRow['Unidades por Paquete']))) {
        errors.push({ row: idx + 2, field: 'Unidades por Paquete', message: 'Debe ser un número' })
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleMappingSave = () => {
    if (validateData()) {
      setStep('preview')
    }
  }

  const handleApplySavedMapping = (mapping: ColumnMapping) => {
    setColumnMapping(mapping.mapping_config)
    setSelectedMapping(mapping.id)
    toast.success(`Mapeo "${mapping.mapping_name}" aplicado`)
  }

  const handleImport = async () => {
    if (!license?.id || !user?.id) return

    setStep('importing')
    setProgress(0)

    try {
      // Crear registro de importación en Supabase
      const { data: importData, error: importError } = await supabase
        .from('inventory_imports')
        .insert([{
          license_id: license.id,
          imported_by: user.id,
          filename: 'bulk_import',
          total_rows: rawData.length,
          status: 'en_progreso',
          mapping_used: columnMapping,
        }])
        .select()
        .single()

      if (importError) throw importError

      const importId = importData.id
      let successCount = 0
      let errorCount = 0
      const insertedIds: string[] = []
      const errorDetails: any[] = []

      // Importar en lotes (batch de 50)
      const batchSize = 50
      for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize)
        const itemsToInsert = batch
          .map((row, idx) => {
            try {
              const mappedRow: Record<string, any> = {}
              Object.entries(columnMapping).forEach(([fileCol, dbField]) => {
                if (dbField) mappedRow[dbField] = row[fileCol]
              })

              // Validación rápida
              if (!mappedRow['Código'] || !mappedRow['Nombre']) {
                throw new Error('Código o Nombre faltante')
              }

              return {
                license_id: license.id,
                code: String(mappedRow['Código']).trim(),
                name: String(mappedRow['Nombre']).trim(),
                category: mappedRow['Categoría'] || 'Otros',
                current_stock: Number(mappedRow['Stock Actual']) || 0,
                minimum_stock: Number(mappedRow['Stock Mínimo']) || 0,
                unit_cost: Number(mappedRow['Costo Unitario']) || 0,
                location: mappedRow['Ubicación'] || '',
                description: mappedRow['Descripción'] || '',
                unit_of_measure: mappedRow['Unidad de Medida'] || 'unidades',
                units_per_package: Number(mappedRow['Unidades por Paquete']) || 1,
                item_code: mappedRow['Item Code'] ? String(mappedRow['Item Code']).trim() : null,
                barcode: mappedRow['Código de Barras'] ? String(mappedRow['Código de Barras']).trim() : null,
              }
            } catch (error: any) {
              errorCount++
              errorDetails.push({
                row: i + idx + 2,
                error: error.message,
                data: row,
              })
              return null
            }
          })
          .filter(item => item !== null)

        if (itemsToInsert.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from('inventory_items')
            .upsert(itemsToInsert, { onConflict: 'code' })
            .select('id')

          if (insertError) throw insertError
          successCount += itemsToInsert.length
          if (inserted) {
            insertedIds.push(...inserted.map(i => i.id))
          }
        }

        // Actualizar progreso
        setProgress(Math.min(100, ((i + batchSize) / rawData.length) * 100))
      }

      // Guardar información de deshacer
      await supabase
        .from('inventory_imports')
        .update({
          status: 'completada',
          success_rows: successCount,
          error_rows: errorCount,
          completed_at: new Date().toISOString(),
          undo_data: { item_ids: insertedIds },
          can_undo: true,
        })
        .eq('id', importId)

      // Guardar errores
      for (const error of errorDetails) {
        await supabase
          .from('inventory_import_errors')
          .insert([{
            import_id: importId,
            row_number: error.row,
            error_message: error.error,
            error_type: 'validation',
            row_data: error.data,
          }])
      }

      setImportResults({
        importId,
        totalRows: rawData.length,
        successRows: successCount,
        errorRows: errorCount,
        errors: errorDetails,
      })

      setProgress(100)
      setStep('results')
      await loadImportHistory()
      toast.success(`Importación completada: ${successCount} items agregados`)
    } catch (error) {
      console.error('Error importing:', error)
      toast.error('Error durante la importación')
      setStep('preview')
    }
  }

  const handleUndo = async (importId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres deshacer esta importación?')) return

    try {
      // Obtener datos de importación
      const { data: importData, error: fetchError } = await supabase
        .from('inventory_imports')
        .select('*')
        .eq('id', importId)
        .single()

      if (fetchError) throw fetchError

      const itemIds = importData.undo_data?.item_ids || []
      if (itemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .in('id', itemIds)

        if (deleteError) throw deleteError
      }

      // Actualizar estado
      await supabase
        .from('inventory_imports')
        .update({ can_undo: false, status: 'deshecha' })
        .eq('id', importId)

      await loadImportHistory()
      toast.success('Importación deshecha exitosamente')
    } catch (error) {
      console.error('Error undoing import:', error)
      toast.error('Error al deshacer la importación')
    }
  }

  const handleDownloadTemplate = () => {
    const template = [
      {
        'Código': 'LIB001',
        'Nombre': 'Cuadernos A4',
        'Categoría': 'Librería',
        'Stock Actual': 50,
        'Stock Mínimo': 10,
        'Costo Unitario': 5000,
        'Ubicación': 'Estante A-1',
        'Descripción': 'Cuadernos rayados de 100 hojas',
        'Unidad de Medida': 'cajas',
        'Unidades por Paquete': 12,
        'Item Code': 'IT-001',
        'Código de Barras': '741123456789',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario')
    XLSX.writeFile(workbook, 'Plantilla_Inventario.xlsx')
    toast.success('Plantilla descargada')
  }

  if (!user?.role || (user.role !== 'jefe_compras' && user.role !== 'admin')) {
    return <div className="text-center py-10 text-error">⛔ Solo Jefes de Compra y Administradores pueden importar inventario</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📥 Importación de Inventario (Enterprise)</h1>
        <p className="text-gray-600 mt-1">Carga inventario en masa desde Excel con validación avanzada</p>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Acciones */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              <Download size={20} />
              Descargar Plantilla
            </button>
            <label className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer">
              <Upload size={20} />
              <span>Seleccionar Archivo</span>
              <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Historial */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">📋 Historial de Importaciones</h2>
            {importHistory.length === 0 ? (
              <p className="text-gray-600">No hay importaciones previas</p>
            ) : (
              <div className="space-y-3">
                {importHistory.map(imp => (
                  <div key={imp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-semibold">{imp.filename}</p>
                      <p className="text-sm text-gray-600">
                        {imp.success_rows}/{imp.total_rows} items | {new Date(imp.created_at).toLocaleDateString('es-CO')}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${imp.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {imp.status === 'completada' ? '✅ Completada' : '🔄 ' + imp.status}
                        </span>
                        {imp.error_rows > 0 && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">❌ {imp.error_rows} errores</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Ver detalles
                          setStep('results')
                          setImportResults({
                            importId: imp.id,
                            totalRows: imp.total_rows,
                            successRows: imp.success_rows,
                            errorRows: imp.error_rows,
                          })
                        }}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded"
                      >
                        <Eye size={16} />
                      </button>
                      {imp.can_undo && (
                        <button
                          onClick={() => handleUndo(imp.id)}
                          className="text-red-600 hover:bg-red-50 px-3 py-2 rounded"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {step === 'mapping' && (
        <div className="space-y-6">
          {/* Mapeos Guardados */}
          {savedMappings.length > 0 && (
            <div className="card p-6 bg-blue-50 border border-blue-200">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Settings size={18} /> Mapeos Guardados
              </h3>
              <div className="flex gap-2 flex-wrap">
                {savedMappings.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleApplySavedMapping(m)}
                    className={`px-4 py-2 rounded border-2 transition ${selectedMapping === m.id
                      ? 'border-blue-600 bg-blue-100 text-blue-800'
                      : 'border-blue-200 hover:border-blue-400'
                      }`}
                  >
                    📌 {m.mapping_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Mapeo */}
          <div className="flex gap-3">
            <button
              onClick={autoMapColumns}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              🤖 Auto-mapear Columnas
            </button>
            <button
              onClick={() => {
                setColumnMapping({})
                toast.success('Mapeo limpiado')
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              🗑️ Limpiar Mapeo
            </button>
          </div>

          {/* Tabla de Mapeo */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b font-bold">Mapeo de Columnas</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Columna en Archivo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Mapear a</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fileColumns.map(col => (
                    <tr key={col} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm">{col}</td>
                      <td className="px-6 py-4">
                        <select
                          value={columnMapping[col] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                        >
                          <option value="">-- No mapear --</option>
                          <optgroup label="Requeridos (*)">
                            {requiredFields.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Opcionales">
                            {optionalFields.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {requiredFields.includes(columnMapping[col]) && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Requerido</span>}
                        {optionalFields.includes(columnMapping[col]) && <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Opcional</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validación */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-red-900 mb-3">❌ Errores de Validación ({validationErrors.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {validationErrors.slice(0, 10).map((err, idx) => (
                  <div key={idx} className="text-sm text-red-800">
                    {err.row > 1 ? `Fila ${err.row}: ` : ''}
                    <strong>{err.field}</strong> - {err.message}
                  </div>
                ))}
                {validationErrors.length > 10 && (
                  <div className="text-sm text-red-800">
                    ... y {validationErrors.length - 10} errores más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              onClick={handleMappingSave}
              className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              ✓ Continuar a Vista Previa
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Vista Previa de Datos */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b font-bold">Vista Previa de {rawData.length} Filas</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {[...requiredFields, 'Unidad de Medida', 'Unidades por Paquete', 'Item Code', 'Código de Barras'].map(f => (
                      <th key={f} className="px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rawData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {[...requiredFields, 'Unidad de Medida', 'Unidades por Paquete', 'Item Code', 'Código de Barras'].map(f => {
                        const fileCol = Object.keys(columnMapping).find(k => columnMapping[k] === f)
                        return (
                          <td key={f} className="px-6 py-4 text-sm text-gray-900">
                            {fileCol ? row[fileCol] : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawData.length > 10 && (
              <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                ... mostrando 10 de {rawData.length} filas
              </div>
            )}
          </div>

          {/* Guardar Mapeo */}
          <div className="card p-6 bg-blue-50 border border-blue-200">
            <h3 className="font-bold mb-3">💾 Guardar Mapeo para Próximas Importaciones</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nombre del mapeo (ej: Mapeo Estándar)"
                value={saveMappingName}
                onChange={(e) => setSaveMappingName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={async () => {
                  if (!saveMappingName) {
                    toast.error('Escribe un nombre para el mapeo')
                    return
                  }
                  try {
                    await supabase
                      .from('inventory_column_mappings')
                      .insert([{
                        license_id: license?.id,
                        created_by: user?.id,
                        mapping_name: saveMappingName,
                        mapping_config: columnMapping,
                      }])
                    setSaveMappingName('')
                    await loadSavedMappings()
                    toast.success('Mapeo guardado')
                  } catch (error) {
                    toast.error('Error guardando mapeo')
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                💾 Guardar
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-600">Total de Filas</p>
              <p className="text-3xl font-bold text-primary mt-2">{rawData.length}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-600">Campos Requeridos</p>
              <p className="text-3xl font-bold text-success mt-2">{Object.values(columnMapping).filter(v => requiredFields.includes(v)).length}/{requiredFields.length}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-600">Estimado (OK)</p>
              <p className="text-3xl font-bold text-info mt-2">~{Math.round((rawData.length * 95) / 100)}</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('mapping')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Ajustar Mapeo
            </button>
            <button
              onClick={handleImport}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
            >
              ✓ Iniciar Importación
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING */}
      {step === 'importing' && (
        <div className="card p-12 text-center space-y-6">
          <div className="text-6xl animate-spin">⚙️</div>
          <h2 className="text-2xl font-bold">Importando {rawData.length} items...</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-600">{Math.round(progress)}% completado</p>
        </div>
      )}

      {/* STEP 5: RESULTS */}
      {step === 'results' && importResults && (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-6">
              <p className="text-sm text-gray-600">Total Procesado</p>
              <p className="text-3xl font-bold text-primary mt-2">{importResults.totalRows}</p>
            </div>
            <div className="card p-6 bg-green-50">
              <p className="text-sm text-gray-600">Éxito</p>
              <p className="text-3xl font-bold text-green-600 mt-2">✅ {importResults.successRows}</p>
            </div>
            <div className="card p-6 bg-red-50">
              <p className="text-sm text-gray-600">Errores</p>
              <p className="text-3xl font-bold text-red-600 mt-2">❌ {importResults.errorRows}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-gray-600">Tasa Éxito</p>
              <p className="text-3xl font-bold text-info mt-2">{Math.round((importResults.successRows / importResults.totalRows) * 100)}%</p>
            </div>
          </div>

          {/* Errores Detallados */}
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="card p-6 bg-red-50 border border-red-200">
              <h3 className="font-bold text-red-900 mb-4">📋 Reporte de Errores ({importResults.errors.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {importResults.errors.map((err: any, idx: number) => (
                  <div key={idx} className="text-sm p-2 bg-white rounded border-l-4 border-red-500">
                    <strong>Fila {err.row}:</strong> {err.error}
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  const errorText = importResults.errors
                    .map((e: any) => `Fila ${e.row}: ${e.error}`)
                    .join('\n')
                  const element = document.createElement('a')
                  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(errorText))
                  element.setAttribute('download', 'errores_importacion.txt')
                  element.style.display = 'none'
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                  toast.success('Reporte de errores descargado')
                }}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                📥 Descargar Reporte de Errores
              </button>
            </div>
          )}

          {/* Botones Finales */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('upload')
                setRawData([])
                setFileColumns([])
                setColumnMapping({})
                setValidationErrors([])
              }}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold"
            >
              ↻ Nueva Importación
            </button>
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Ir a Historial
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
