import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { count: moveCount, error: e1 } = await supabase.from('inventory_movements').select('*', { count: 'exact', head: true });
  console.log('inventory_movements count:', moveCount, e1?.message || 'OK');

  const { data: vw, error: e2 } = await supabase.from('vw_inventory_movements_detail').select('*').limit(5);
  console.log('vw_inventory_movements_detail length:', vw?.length, e2?.message || 'OK');
  if (e2) console.error(e2);
}
check();
