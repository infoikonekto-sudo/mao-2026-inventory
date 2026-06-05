import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkData() {
    console.log('--- REQUISICIONES (Inventory) ---')
    const { data: reqs } = await supabase.from('requisitions').select('requisition_number, status')
    console.log(reqs)

    console.log('\n--- SOLICITUDES DE COMPRA (Purchase Requests) ---')
    const { data: preqs } = await supabase.from('purchase_requests').select('request_number, status')
    console.log(preqs)

    console.log('\n--- ÓRDENES DE COMPRA (Purchase Orders) ---')
    const { data: orders } = await supabase.from('purchase_orders').select('order_number, status')
    console.log(orders)
}

checkData()
