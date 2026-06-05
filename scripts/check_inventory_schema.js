import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkSchema() {
    console.log('--- COLUMNAS DE inventory_items ---')
    const { data, error } = await supabase.rpc('get_table_columns', { table_name_input: 'inventory_items' })

    if (error) {
        // Si la RPC no existe, probamos consulta directa a information_schema
        const { data: cols, error: colError } = await supabase
            .from('inventory_items')
            .select('*')
            .limit(1)

        if (colError) console.error('Error:', colError)
        else console.log('Columnas encontradas:', Object.keys(cols[0] || {}))
    } else {
        console.log(data)
    }
}

checkSchema()
