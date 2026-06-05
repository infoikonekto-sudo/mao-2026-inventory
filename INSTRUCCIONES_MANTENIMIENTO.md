# 🛠️ Guía de Mantenimiento y Control de Versiones - MAO 2026

Este archivo sirve como referencia rápida para el desarrollo, despliegue y seguimiento de cambios en el proyecto.

## 🚀 Comandos Rápidos

| Acción | Comando |
| :--- | :--- |
| **Desarrollo Local** | `npm run dev` |
| **Validar Tipado** | `npm run type-check` |
| **Construir Proyecto** | `npm run build` |
| **Desplegar a Vercel** | `npx vercel --prod` |

---

## 📌 Estructura del Proyecto

- `/src/pages`: Páginas principales de la aplicación.
- `/src/components`: Componentes reutilizables de UI.
- `/src/services`: Conexión con Supabase y APIs externas.
- `/src/stores`: Gestión de estado (Zustand).
- `/sql`: Scripts de base de datos y lógica de backend.

---

## 📜 Historial de Versiones (Changelog)

### v0.1.1 (2026-05-01) - *Actual*
- **Fix**: Corrección de errores críticos de TypeScript que impedían el despliegue.
- **Fix**: Implementación de `handleExport` en `ProfessionalReportsPage.tsx`.
- **Fix**: Corrección de lógica de filtros en `InventoryMovementsPage.tsx`.
- **Cleanup**: Eliminación de importaciones y variables no utilizadas en múltiples archivos.
- **Deploy**: Despliegue exitoso a Vercel ([mao-2026.vercel.app](https://mao-2026.vercel.app)).

### v0.1.0 (2026-05-01)
- Versión base del sistema de inventario MAO 2026.
- Integración con Supabase para gestión de almacén.
- Reportes profesionales en PDF y Excel.

---

## 🛠️ Instrucciones para Modificaciones Rápidas

1. **Antes de Desplegar**: Siempre ejecuta `npm run build` localmente para asegurarte de que no haya errores de TypeScript.
2. **Nuevos Reportes**: Si agregas una categoría en `ProfessionalReportsPage.tsx`, recuerda actualizar la interfaz `ReportData` para evitar errores de compilación.
3. **Vercel**: Si el token expira, usa `npx vercel login` para volver a autenticarte.

---

*Última actualización: 1 de mayo de 2026*
