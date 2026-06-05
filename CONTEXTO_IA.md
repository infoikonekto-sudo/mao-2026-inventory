# CONTEXTO DEL PROYECTO MAO 2026 PARA IA

> **Instrucción para la Inteligencia Artificial que lee este archivo:**
> Estás asumiendo el rol de desarrollador principal del sistema "MAO 2026". Tu objetivo es asistir al usuario (Jefe de Compras / Administrador) a mantener, escalar y mejorar esta plataforma web. Lee toda la documentación a continuación para entender la arquitectura y lógica de negocio antes de sugerir cualquier cambio.

## 1. Resumen del Proyecto
- **Nombre:** MAO 2026 (Sistema de Control de Inventario, Compras y Entregas)
- **Framework Principal:** React 18 con TypeScript + Vite.
- **Estilos:** Tailwind CSS + Lucide React (Iconografía).
- **Backend/Base de Datos:** Supabase (PostgreSQL + Autenticación + Storage).
- **Despliegue:** Vercel (`mao-2026.vercel.app`).

## 2. Roles y Permisos (Sistema de Autenticación)
El sistema utiliza `authStore.ts` (Zustand) para manejar la sesión actual. Los roles disponibles en el enum `Role` son:
- `ADMIN`: Acceso total.
- `CHIEF`: Jefe de compras. Acceso a inventario global, reportes profesionales, presupuestos y órdenes de compra.
- `PROFESSOR`: Usuario final. Solo puede ver su dashboard, solicitar material y ver sus propios movimientos.
- `RECEPCION`: (Ventana de Entrega) Despacha material físico.

## 3. Arquitectura de Base de Datos Principal (Supabase)
Las funciones clave que conectan con Supabase están en `src/services/supabaseClient.ts`.
Tablas principales:
- `inventory_items`: Catálogo de productos. Usa correlativos automáticos (`item_code` como `[PREFIJO]-[NUMERO]`, ej. `LIM-025`).
- `inventory_movements`: Entradas y salidas del inventario.
- `requisitions` y `requisition_items`: Solicitudes de material (hechas por profesores/empleados). Tienen estados como PENDING, APPROVED, REJECTED, DELIVERED.
- `cost_centers` y `budgets`: Control financiero para descontar de presupuestos al aprobar solicitudes o compras.
- `purchase_requests` y `purchase_orders`: Flujo de abastecimiento.

## 4. Funcionalidades Clave y Lógica Reciente
- **Generación de Códigos de Barras:** Se utiliza `JsBarcode`. Los códigos nunca se repiten. Al crear un ítem, el sistema consulta `inventory_items` buscando el último número de la misma categoría (ej. busca `ABA-%`) y le suma +1 de forma robusta.
- **Gestión de Categorías Inteligente:** Si un usuario renombra una categoría, el sistema ejecuta un `UPDATE` masivo en toda la base de datos (`bulkRenameCategory`).
- **Taxonomía con IA:** Hay una función `detectCategory` que realiza un análisis léxico de las palabras del producto ("consome", "maggi") y sugiere una categoría ("COCINA Y ALIMENTOS"). Si el usuario lo aprueba en el modal `TaxonomyPreview`, migra los ítems.
- **Exportaciones PDF/Excel:** Se usa `jspdf-autotable` para PDFs corporativos y `xlsx` para hojas de cálculo. Centralizado en `src/utils/exportUtils.ts` y en `ProfessionalReportsPage.tsx`.

## 5. Reglas de Desarrollo para la IA
1. **Nunca sobrescribir lógica de códigos:** Al generar o autogenerar códigos (`getNextItemCode`), asegúrate de respetar la consulta `ilike` que previene duplicados.
2. **TypeScript Estricto:** Evita usar `any`.
3. **Persistencia y Realtime:** Usa el hook personalizado `useRealtimeData` para mantener la interfaz actualizada cuando otros usuarios modifican la base de datos.
4. **Archivos a evitar:** No toques `index.css` a menos que sea estrictamente necesario para variables root. Todo se hace con clases de Tailwind.

## 6. Scripts Locales
Para correr el proyecto localmente, el usuario ejecuta:
```bash
npm run dev
```
Para construir (Build) a producción:
```bash
npm run build
```

---
*Este documento fue autogenerado para mantener la persistencia de contexto entre diferentes entornos de desarrollo y asistentes de IA.*
