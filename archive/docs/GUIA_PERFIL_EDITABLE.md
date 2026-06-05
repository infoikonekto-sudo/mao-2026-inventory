-- ============================================================
-- GUÍA: CARGAR FOTO DE PERFIL
-- ============================================================

## 📋 PASOS ANTES DE USAR:

### 1. Ejecuta este SQL en Supabase SQL Editor
-- Agregar columnas para perfil editable
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Verificar que existan las columnas
SELECT id, full_name, email, city, bio, profile_photo_url 
FROM public.users LIMIT 1;

---

## 🖼️ CÓMO USAR EN LA APP:

### Pasos:
1. **Login** con tu código (ej: ADMIN-18128df19c1e)
2. **Click en "Mi Perfil"** (parte superior derecha)
3. **Click en "✏️ Editar perfil"**
4. **Click en la foto/cámara** para subir una nueva
5. **Selecciona la imagen** (JPG, PNG, WebP - máx 2MB)
6. **La foto se guarda automáticamente** ✅

### Bonus:
- **Para eliminar la foto:** Click en ❌ rojo mientras editas
- **Para cambiar otros datos:** Email, teléfono, ciudad, biografía
- **Guardar cambios:** Click en "Guardar" o se guarda automáticamente la foto

---

## 🔧 CAMBIOS REALIZADOS EN EL CÓDIGO:

### ProfilePage.tsx:
✅ Las fotos se guardan INMEDIATAMENTE en Supabase (no espera al botón Guardar)
✅ Se muestra confirmación cuando se guarda la foto
✅ Se puede eliminar la foto con botón ❌
✅ Carga los datos reales del usuario autenticado
✅ Conectado a useAuthStore (usuario real)
✅ Guardado en BD con Supabase

### Limitaciones técnicas:
- Las fotos se guardan como base64 (máx 2MB)
- Ideal para fotos de perfil pequeñas
- Si necesitas fotos más grandes, migrar a Supabase Storage

---

## ⚠️ SI LA FOTO NO SE VE:

### Opción 1: Verificar en SQL que se guardó
SELECT id, full_name, profile_photo_url 
FROM public.users 
WHERE full_name = 'Tu Nombre' 
LIMIT 1;

-- Si profile_photo_url es NULL, la foto no se guardó

### Opción 2: Limpia el navegador
- Presiona F12 (abre DevTools)
- Limpia cache (Ctrl+Shift+Del)
- Recarga la página

### Opción 3: Revisa la consola
- Abre F12
- Pestaña "Console"
- Si hay errores, cópialos y envía

---

## ✨ FEATURES COMPLETADOS:

✅ Editar nombre, email, teléfono, ciudad, biografía
✅ Subir/cambiar/eliminar foto de perfil
✅ Datos guardados automáticamente en Supabase
✅ Solo el usuario puede editar su perfil
✅ Confirmación visual al guardar
✅ Sin "Cambiar contraseña" ni "Ver preferencias"
✅ Ver historial de actividad

