const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_PREFIXES = {
  'LIMPIEZA': 'LIM',
  'LIBRERÍA': 'LIB',
  'MANUALIDADES': 'MAN',
  'ABARROTES': 'ABA',
  'HERRAMIENTAS Y MANTENIMIENTO': 'HER',
  'EVENTOS Y DECORACION': 'EVE',
  'ACTIVOS': 'ACT',
  'TECNOLOGÍA': 'TEC',
  'BOTIQUÍN': 'BOT',
  'IMPRESOS Y ROTULACIÓN': 'IMP',
  'OTROS': 'OTR',
};

async function run() {
  console.log('Obteniendo todo el inventario...');
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }

  console.log(`Se encontraron ${items.length} productos.`);

  // Mapear categorías
  const itemsPorCategoria = {};

  for (let item of items) {
    let cat = item.category || 'OTROS';
    const catLower = cat.toLowerCase();

    // Mover Alimentos a ABARROTES
    if (catLower.includes('alimento') || catLower.includes('comida') || catLower.includes('abarrot')) {
      cat = 'ABARROTES';
    }
    // Mover Papelería a LIBRERÍA
    else if (catLower.includes('papeleria') || catLower.includes('papelería') || catLower === 'librería' || catLower === 'libreria') {
      cat = 'LIBRERÍA';
    }

    if (!itemsPorCategoria[cat]) {
      itemsPorCategoria[cat] = [];
    }
    itemsPorCategoria[cat].push(item);
  }

  let actualizados = 0;

  // Actualizar categorías y generar códigos secuenciales
  for (const [catName, categoryItems] of Object.entries(itemsPorCategoria)) {
    // Buscar prefijo (haciendo match por substrings si no es exacto)
    let prefix = 'OTR';
    const catNameNormalized = catName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const [key, val] of Object.entries(CATEGORY_PREFIXES)) {
      const keyNorm = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (catNameNormalized.includes(keyNorm) || keyNorm.includes(catNameNormalized.substring(0,4))) {
        prefix = val;
        break;
      }
    }

    console.log(`\nProcesando categoría: ${catName} (Prefijo: ${prefix}) - ${categoryItems.length} ítems`);

    let correlativo = 1;
    for (const item of categoryItems) {
      const numStr = correlativo.toString().padStart(3, '0');
      const newCode = `${prefix}-${numStr}`;
      
      const { error: updErr } = await supabase
        .from('inventory_items')
        .update({
          category: catName,
          item_code: newCode,
          barcode: newCode // También actualizamos el barcode real
        })
        .eq('id', item.id);

      if (updErr) {
        console.error(`Error actualizando ${item.name}:`, updErr);
      } else {
        process.stdout.write('.');
        actualizados++;
      }
      correlativo++;
    }
  }

  console.log(`\n\n¡Proceso completado! Se actualizaron ${actualizados} productos.`);
}

run();
