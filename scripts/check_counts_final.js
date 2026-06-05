import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkData() {
    const tables = ['requisitions', 'purchase_requests', 'purchase_orders', 'express_purchase_orders']

    for (const table of tables) {
        const { data } = await supabase.from(table).select('status')
        const counts = data?.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1
            return acc
        }, {})
        console.log(`Tabla: ${table}`)
        console.log(counts)
        console.log('---')
    }
}

checkData()
