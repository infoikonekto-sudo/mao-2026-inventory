
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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
    console.log('Could not read .env locally, trying process.env');
    supabaseUrl = process.env.VITE_SUPABASE_URL;
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

console.log('URL:', supabaseUrl);
// console.log('KEY:', supabaseKey); // Don't print key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching order ORD-2026-0018...');
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number, total_amount, cost_center_id, cost_centers(id, name, budget_spent)')
        .eq('order_number', 'ORD-2026-0018')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('DATA:', JSON.stringify(data, null, 2));
    }
}

run();
