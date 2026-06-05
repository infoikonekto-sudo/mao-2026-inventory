import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Faltan variables de entorno')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkSchema() {
    console.log('--- Verificando esquema en Supabase ---')

    // Nota: information_schema suele estar oculto para ANON, pero intentaremos
    // Si falla, es probable que no tengamos acceso directo via REST.
    const { data, error } = await supabase
        .from('columns')
        .select('column_name, data_type, table_name')
        .in('table_name', ['inventory_items', 'requisition_items', 'inventory_movements'])
        .in('column_name', ['current_stock', 'minimum_stock', 'quantity', 'quantity_delivered', 'quantity_requested'])
        .order('table_name', { ascending: true })

    if (error) {
        console.error('Error al consultar esquema (es probable que RLS bloquee information_schema para la clave ANON):', error)

        // Intento alternativo: Obtener un registro de cada tabla para ver tipos inferidos (aunque JS no diferencia entre int y float mucho)
        console.log('\n--- Intento alternativo: Consultando muestras de datos ---')

        for (const table of ['inventory_items', 'requisition_items', 'inventory_movements']) {
            const { data: sample, error: sampleError } = await supabase.from(table).select('*').limit(1)
            if (sampleError) {
                console.error(`Error en tabla ${table}:`, sampleError.message)
            } else if (sample && sample.length > 0) {
                console.log(`\nMuestra de ${table}:`, JSON.stringify(sample[0], null, 2))
            } else {
                console.log(`\nLa tabla ${table} está vacía.`)
            }
        }
    } else {
        console.table(data)
    }
}

checkSchema()
