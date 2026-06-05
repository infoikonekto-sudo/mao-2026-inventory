
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Hardcode if needed or read from process
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rfylaw8re.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('Trying to read .env file manually...')
    const fs = require('fs')
    try {
        const envConfig = fs.readFileSync('.env', 'utf8')
        for (const line of envConfig.split('\n')) {
            const [key, value] = line.split('=')
            if (key && value) {
                process.env[key.trim()] = value.trim()
            }
        }
    } catch (e) {
        console.error('Could not read .env file')
    }
}

const finalUrl = process.env.VITE_SUPABASE_URL || 'https://rfylaw8re.supabase.co'
const finalKey = process.env.VITE_SUPABASE_ANON_KEY

if (!finalKey) {
    console.error('Still missing VITE_SUPABASE_ANON_KEY. Please provide it.')
    process.exit(1)
}

const supabase = createClient(finalUrl, finalKey)

async function debugOrder() {
    console.log('Fetching order ORD-2026-0018...')
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

    if (order.cost_centers) {
        console.log('--- COST CENTER INFO ---')
        console.log('CC ID:', order.cost_centers.id)
        console.log('Name:', order.cost_centers.name)
        console.log('Budget Spent:', order.cost_centers.budget_spent)
    } else {
        console.log('!!! NO LINKED COST CENTER FOUND !!!')
    }
}

debugOrder()
