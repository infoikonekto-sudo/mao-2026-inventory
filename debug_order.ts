
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

// Manually load envs if dotenv fails (fallback)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfylaw8re.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugOrder() {
    const { data: order, error } = await supabase
        .from('purchase_orders')
        .select('*, cost_centers(*)')
        .eq('order_number', 'ORD-2026-0018')
        .single()

    if (error) {
        console.error('Error fetching order:', error)
        return
    }

    console.log('--- ORDER DEBUG INFO ---')
    console.log('ID:', order.id)
    console.log('Order Number:', order.order_number)
    console.log('Total Amount:', order.total_amount)
    console.log('Cost Center ID:', order.cost_center_id)
    console.log('Requests ID:', order.purchase_request_id)

    if (order.cost_centers) {
        console.log('--- COST CENTER INFO ---')
        console.log('Name:', order.cost_centers.name)
        console.log('Budget Spent:', order.cost_centers.budget_spent)
    } else {
        console.log('!!! NO LINKED COST CENTER FOUND !!!')
    }
}

debugOrder()
