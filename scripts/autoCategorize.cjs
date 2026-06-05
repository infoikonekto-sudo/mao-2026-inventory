const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const TAXONOMY = [
  'LIMPIEZA',
  'PAPELERÍA',
  'MANUALIDADES',
  'COCINA Y ALIMENTOS',
  'HERRAMIENTAS Y MANTENIMIENTO',
  'EVENTOS Y DECORACIÓN',
  'ACTIVOS',
  'TECNOLOGÍA',
  'BOTIQUÍN',
  'IMPRESOS Y ROTULACIÓN',
  'OTROS'
];

const CATEGORY_PREFIXES = {
  'LIMPIEZA': 'LIM',
  'PAPELERÍA': 'PAP',
  'MANUALIDADES': 'MAN',
  'COCINA Y ALIMENTOS': 'COC',
  'HERRAMIENTAS Y MANTENIMIENTO': 'HER',
  'EVENTOS Y DECORACIÓN': 'EVE',
  'ACTIVOS': 'ACT',
  'TECNOLOGÍA': 'TEC',
  'BOTIQUÍN': 'BOT',
  'IMPRESOS Y ROTULACIÓN': 'IMP',
  'OTROS': 'OTR',
  'Librería': 'LIB' // Fallback
};

// Hardcoded logic engine based on item name keywords
function categorizeItem(name) {
  const n = name.toLowerCase();
  
  if (n.match(/acetona|limpia|visol|swipol|basura|escoba|trapeador|gel|jabon|jabón|toalla|microfibra|sanitaria|húmeda/)) return 'LIMPIEZA';
  if (n.match(/sellos|teaching|calculadora|cuaderno|lapiz|lápiz|lapicero|goma|sacagrapa|cuchilla|contact|papel|hoja|carpeta|clip|tinta|marcador|resaltador/)) return 'PAPELERÍA';
  if (n.match(/foamy|tempera|témpera|brillantina|lana|pintura|pincel|hilo|yute|lazo/)) return 'MANUALIDADES';
  if (n.match(/percoladora|hielera|taza|microondas|aluminio|ziploc|chia|chía|miel|vinagre|palillo|maizena|colorante|lenteja|espagueti|pincho|maseca/)) return 'COCINA Y ALIMENTOS';
  if (n.match(/herramienta|caja.*herramienta|destornillador|pinza|alicate|bateria|batería|martillo|clavo|tornillo|engrapadora.*pared|stanley|destapador/)) return 'HERRAMIENTAS Y MANTENIMIENTO';
  if (n.match(/botarga|pelota|inflable|sombrero|anillo|pulsera|perinola|burbuja/)) return 'EVENTOS Y DECORACIÓN';
  if (n.match(/pizarra|pizarron|escritorio|silla|mesa/)) return 'ACTIVOS';
  if (n.match(/computadora|mouse|teclado|cable/)) return 'TECNOLOGÍA';
  if (n.match(/alcohol|algodon|algodón|curita|venda|bicarbonato|glicerina/)) return 'BOTIQUÍN';
  if (n.match(/impreso|rotulo|rótulo|gafete/)) return 'IMPRESOS Y ROTULACIÓN';
  
  return 'OTROS';
}

async function run() {
  console.log('Iniciando script masivo de categorización y códigos...');
  
  let { data: items, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, name, category, item_code')
    .limit(2000);

  if (fetchErr) {
    console.error('Error fetching:', fetchErr);
    return;
  }

  let updatedCount = 0;
  
  for (const item of items) {
    // Determine target category
    let newCategory = item.category;
    if (item.category === 'Librería' || item.category === 'OTROS' || !item.category) {
      newCategory = categorizeItem(item.name);
    }
    
    // Check code prefix
    const expectedPrefix = CATEGORY_PREFIXES[newCategory] || 'OTR';
    let newCode = item.item_code;
    
    if (!item.item_code || item.item_code.startsWith('LIB-')) {
      // Re-generate code using new prefix + numeric suffix of old code
      // If old code is LIB-A1M001, extract A1M001
      if (item.item_code && item.item_code.includes('-')) {
        const parts = item.item_code.split('-');
        parts[0] = expectedPrefix;
        newCode = parts.join('-');
      } else {
         newCode = `${expectedPrefix}-` + Math.floor(Math.random()*10000);
      }
    } else {
        // If it starts with another prefix but the category changed?
        const currentPrefix = item.item_code.split('-')[0];
        if (currentPrefix !== expectedPrefix) {
           const parts = item.item_code.split('-');
           parts[0] = expectedPrefix;
           newCode = parts.join('-');
        }
    }

    if (newCategory !== item.category || newCode !== item.item_code) {
      console.log(`Actualizando [${item.name}]: ${item.category}(${item.item_code}) -> ${newCategory}(${newCode})`);
      const { error } = await supabase
        .from('inventory_items')
        .update({ category: newCategory, item_code: newCode })
        .eq('id', item.id);
        
      if (error) {
        console.error('Error al actualizar:', item.name, error);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`¡Proceso completado! Se actualizaron ${updatedCount} productos.`);
}

run();
