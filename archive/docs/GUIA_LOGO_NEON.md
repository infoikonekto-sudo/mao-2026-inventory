# 🎨 GUÍA: INTEGRACIÓN DEL LOGO Y FONDO NEON

## ✨ Cambios Implementados

### 1. Login Page - Fondo Neon Animado
**Archivo:** `src/pages/auth/LoginPage.tsx`

**Características:**
- ✅ Logo del colegio en círculo con efecto neon
- ✅ Fondo animado azul marino → azul celeste con transiciones suaves
- ✅ Partículas flotantes luminosas
- ✅ Formulario con efecto vidrio (glassmorphism)
- ✅ Botones con efecto neon glow
- ✅ Animaciones únicas y personalizadas

**Animaciones CSS:**
```css
.neon-login-bg       /* Fondo con cambio de color gradual */
.neon-particle       /* Partículas flotantes */
.neon-logo-glow      /* Resplandor del logo */
.neon-pulse          /* Pulsación suave */
```

---

### 2. Logo en Reportes Profesionales
**Archivo:** `src/pages/ProfessionalReportsPage.tsx`

**Cambios:**
1. **Encabezado HTML del reporte** - Incluye logo + datos de institución
2. **PDF generado** - Logo en la esquina superior izquierda
3. **Numeración de páginas** - Pie de página con info de institución

**Código del encabezado:**
```tsx
<div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-blue-600">
  <img src="/logo mao.png" alt="Logo MAO" className="w-16 h-16" />
  <div>
    <h1 className="text-2xl font-bold text-blue-900">MAO 2026</h1>
    <p className="text-sm text-gray-600">Colegio Manos a la Obra</p>
  </div>
</div>
```

---

### 3. Logo en Reportes Generales
**Archivo:** `src/pages/ReportsPage.tsx`

**Cambios:**
- Encabezado con logo integrado
- Diseño profesional con gradiente azul-cian
- Información de institución visible

---

### 4. Componente Reutilizable
**Archivo:** `src/components/PageHeader.tsx` (NUEVO)

**Uso en cualquier página:**
```tsx
import PageHeader from '@/components/PageHeader'

export default function MiPagina() {
  return (
    <>
      <PageHeader 
        title="Mi Página"
        description="Descripción del contenido"
        icon="📊"
        showLogo={true}
      />
      {/* resto del contenido */}
    </>
  )
}
```

---

## 🎨 Estilos Neon Agregados

### Animaciones en `src/index.css`:

1. **color-shift** - Transición gradual de colores azul marino a azul celeste
2. **float-up** - Partículas que flotan hacia arriba
3. **neon-glow** - Resplandor del logo
4. **pulse-glow** - Pulsación suave del formulario

### Clases CSS Personalizadas:

```css
.neon-login-bg      /* Contenedor principal del login */
.neon-particle      /* Partículas individuales */
.neon-logo-glow     /* Logo con efecto neon */
.neon-pulse         /* Elementos pulsantes */
```

---

## 📂 Estructura de Archivos

```
public/
├── logo mao.png          ← Logo de la institución

src/
├── pages/
│  ├── auth/
│  │  └── LoginPage.tsx         ✨ ACTUALIZADO - Neon + Logo
│  ├── ProfessionalReportsPage.tsx   ✨ ACTUALIZADO - Logo en PDF
│  ├── ReportsPage.tsx              ✨ ACTUALIZADO - Logo visible
│
├── components/
│  └── PageHeader.tsx       🆕 NUEVO - Componente reutilizable
│
└── index.css               ✨ ACTUALIZADO - Animaciones neon
```

---

## 🚀 Cómo Usar el Logo en Nuevas Páginas

### Opción 1: Usar el componente PageHeader
```tsx
import PageHeader from '@/components/PageHeader'

export default function MiReporte() {
  return (
    <>
      <PageHeader 
        title="Mi Reporte"
        description="Descripción"
        icon="📋"
        showLogo={true}
      />
      {/* contenido */}
    </>
  )
}
```

### Opción 2: Usar el logo directamente
```tsx
<img src="/logo mao.png" alt="Logo MAO" className="w-16 h-16 object-contain" />
```

---

## 🎨 Paleta de Colores Neon

| Elemento | Color | CSS |
|----------|-------|-----|
| Fondo Base | Azul Marino | `#001233` |
| Accent 1 | Azul Oscuro | `#003366` |
| Accent 2 | Azul Brillante | `#0066cc` |
| Neon | Cyan/Cian | `#00ccff` |
| Glow | Cyan 400 | `rgb(34, 211, 238)` |

---

## 📊 PDFs Generados

Los PDFs ahora incluyen:
- ✅ Logo en encabezado
- ✅ Título profesional
- ✅ Información de institución
- ✅ Pie de página con numeración
- ✅ Datos completos del reporte

**Ejemplo:**
```
┌─────────────────────────────────────┐
│  [LOGO]  MAO 2026 - REPORTE        │
│          Colegio Manos a la Obra    │
├─────────────────────────────────────┤
│ Reporte de Requisiciones            │
│ Fecha: 28 de enero de 2026          │
│ Usuario: Admin                      │
│ Hora: 14:30:45                      │
├─────────────────────────────────────┤
│ [CONTENIDO DEL REPORTE]             │
│                                     │
│ Tabla de datos...                   │
├─────────────────────────────────────┤
│ © 2026 Colegio Manos a la Obra      │
│ Página 1 de 5                       │
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Verificación

- ✅ Logo aparece en login
- ✅ Fondo neon animado en login
- ✅ Partículas flotantes visibles
- ✅ Logo en PDFs de reportes
- ✅ Logo en página de reportes general
- ✅ Componente PageHeader funcional
- ✅ Estilos neon en index.css
- ✅ Animaciones suaves sin lag

---

## 🔧 Troubleshooting

### Logo no aparece
**Solución:** Asegurar que `/logo mao.png` existe en `public/` o raíz del proyecto

### Animaciones no funcionan
**Solución:** Verificar que `index.css` tenga las clases neon

### PDF sin logo
**Solución:** Usar ruta absoluta o verificar CORS en servidor

---

## 📝 Notas Técnicas

1. **Logo en PDF:** Se carga dinámicamente con `Image()` y se incrusta en el PDF
2. **Animaciones:** Usadas con CSS puro (sin librerías externas)
3. **Performance:** Partículas optimizadas con `pointer-events: none`
4. **Responsive:** Funciona en mobile, tablet y desktop

---

## 🎯 Próximos Pasos Opcionales

1. Agregar logo a más páginas con `PageHeader`
2. Crear variantes del fondo neon (verde, púrpura, etc.)
3. Agregar logo a otros exportes (CSV, JSON)
4. Crear marca de agua con logo en reportes
5. Agregar sonido al login (opcional)

