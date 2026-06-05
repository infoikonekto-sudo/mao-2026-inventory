import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkCounts() {
    console.log('--- DIAGNÓSTICO DE CONTEOS ---')

    const { data: reqs, error: reqError } = await supabase
        .from('requisitions')
        .select('id, status, requisition_number')

    if (reqError) console.error('Error reqs:', reqError)
    else {
        console.log('Requisiciones por estado:')
        const counts = reqs.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1
            return acc
        }, {})
        console.log(counts)
    }

    const { data: orders, error: orderError } = await supabase
        .from('purchase_orders')
        .select('id, status, order_number')

    if (orderError) console.error('Error orders:', orderError)
    else {
        console.log('Órdenes por estado:')
        const counts = orders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1
            return acc
        }, {})
        console.log(counts)
    }

    const { data: express, error: expressError } = await supabase
        .from('express_purchase_orders')
        .select('id, status, order_number')

    if (expressError) console.error('Error express:', expressError)
    else {
        console.log('Órdenes Express por estado:')
        const counts = express.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1
            return acc
        }, {})
        console.log(counts)
    }
}

checkCounts()
