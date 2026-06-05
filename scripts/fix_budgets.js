
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// 1. Read .env manually
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    }
} catch (err) {
    supabaseUrl = process.env.VITE_SUPABASE_URL;
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBudgets() {
    console.log('🔄 Starting Budget Sync...');

    // 1. Fetch Orders
    const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('cost_center_id, total_amount, status')
        .not('cost_center_id', 'is', null)
        .gt('total_amount', 0);

    if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
    }

    // 2. Calculate Totals
    const totals = {};
    orders.forEach(order => {
        // Exclude rejected/cancelled if necessary. Screenshot showed 'COMPLETADA'
        if (order.status === 'rechazada' || order.status === 'cancelada') return;

        if (!totals[order.cost_center_id]) totals[order.cost_center_id] = 0;
        totals[order.cost_center_id] += order.total_amount;
    });

    console.log(`Found ${Object.keys(totals).length} cost centers with spending.`);

    // 3. Update Cost Centers
    for (const [id, amount] of Object.entries(totals)) {
        console.log(`Updating CC ${id} -> Q${amount}`);

        const { error: updateError } = await supabase
            .from('cost_centers')
            .update({ budget_spent: amount })
            .eq('id', id);

        if (updateError) console.error(`Failed to update ${id}:`, updateError);
    }

    // 4. Zero out others?
    // Optional: fetch all CCs and zero those not in `totals`. 
    // For safety, I'll skip zeroing out for now unless requested, to avoid accidental overwrites of other manual data if any.
    // actually, if the discrepancy is 500 but should be 8500, this script will fix it to 8500.

    console.log('✅ Sync Complete');
}

syncBudgets();
