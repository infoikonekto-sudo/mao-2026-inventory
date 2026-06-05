# 🧪 GUÍA DE PRUEBA - PROFESOR REALTIME Y DASHBOARD PERSONALIZADO

**Objetivo:** Validar que los cambios implementados funcionan correctamente en producción

**Tiempo total:** ~15 minutos

---

## ✅ CHECKLIST PRE-PRUEBA

- [ ] Sistema compilado sin errores: `npm run build` ✓
- [ ] SQL #1, #2, #3 ejecutados en Supabase
- [ ] Usuarios de prueba creados (1 PROFESOR, 1 JEFE_COMPRAS, 1 ADMIN)
- [ ] Navegador limpio (sin caché): Ctrl+Shift+Del → Clear all
- [ ] Servidor corriendo: `npm run dev`

---

## 📋 TEST 1: Dashboard Personalizado para PROFESOR

### Paso 1.1: Login como PROFESOR
```
1. Ve a http://localhost:5173
2. Click "Login"
3. Email: profesor@institucion.edu.gt (o tu usuario profesor)
4. Password: [contraseña correcta]
5. Click "Sign In"
```

### Paso 1.2: Verificar Dashboard
**Resultado esperado:**
- [ ] Encabezado dice "Dashboard Personal"
- [ ] Subtítulo: "Resumen de tus requisiciones y solicitudes de compra"
- [ ] Muestra 4 tarjetas de REQUISICIONES (Total, Pendientes, Aprobadas, Rechazadas)
- [ ] Muestra 4 tarjetas de SOLICITUDES (Total, Pendientes, Aprobadas, Rechazadas)
- [ ] Muestra 2 gráficos PieChart (uno de requisiciones, uno de solicitudes)
- [ ] Muestra 1 gráfico LineChart (timeline últimos 7 días)
- [ ] Muestra "Acciones Rápidas" con links a Requisiciones/Solicitudes

**Resultado incorrecto:**
- ❌ Ve AdminDashboard (con Inventario, Órdenes, Usuarios, Auditoría, etc)
- ❌ No muestra gráficos
- ❌ Muestra datos de otros profesores

### Paso 1.3: Verificar datos personalizados
**Comprobar que:**
- [ ] Números mostrados coinciden con requisiciones del profesor (no global)
- [ ] Si profesor tiene 5 requisiciones → Total debe ser 5 (no 500)
- [ ] Si 2 son aprobadas → Card "Aprobadas" muestra 2
- [ ] Timeline muestra actividad solo del profesor

---

## 📋 TEST 2: Notificaciones en Tiempo Real (SIN RECARGAR)

### Paso 2.1: Preparar datos
```
1. Profesor: Crear 1 REQUISICIÓN (quantity: 20)
   a. Click "Requisiciones" en sidebar
   b. Click "Nueva Requisición"
   c. Agregar item (p.ej. "Papel A4")
   d. Cantidad: 20
   e. Click "Crear"
   f. Verificar que aparece en tabla con status "Pendiente"
   g. NOTA: NO RECARGAR PÁGINA
```

### Paso 2.2: Cambiar rol a JEFE_COMPRAS
```
1. Abrir NUEVA PESTAÑA en navegador (Ctrl+T)
2. Ve a http://localhost:5173
3. Click "Logout" (arriba a derecha) - esto cierra sesión anterior
4. Login como JEFE_COMPRAS
   a. Email: jefe@institucion.edu.gt
   b. Password: [correcta]
5. Click "Requisiciones"
```

### Paso 2.3: Aprobar requisición
```
1. Buscar la requisición del profesor (REQ-XXXX con status "Pendiente")
2. Click botón VERDE "Aprobar"
3. Esperar 1 segundo
4. Verificar toast verde: "Requisición aprobada exitosamente"
```

### Paso 2.4: Volver a pestaña del PROFESOR
```
1. Click TAB #1 (la del profesor)
2. En "Requisiciones Page" sin recargar (F5)
3. Verificar que fila cambió:
   - [ ] Status: "Pendiente" → "Aprobada"
   - [ ] Color: Amarillo → Verde
   - [ ] Tiempo: INSTANTÁNEO (menos de 1 segundo)
4. Verificar campanita:
   - [ ] Arriba a derecha: número rojo (unread count)
   - [ ] Click campanita
   - [ ] Debe mostrar: "Requisición aprobada"

**✅ TEST PASADO:** Estado cambió SIN recargar
**❌ TEST FALLIDO:** Tuvo que recargar para ver cambio
```

### Paso 2.5: Test alternativo - RECHAZAR
```
1. Profesor: Crear OTRA requisición
2. En pestaña JEFE: Rechazar requisición
3. En pestaña PROFESOR sin recargar:
   - Status debe cambiar a "Rechazada"
   - Color debe ser ROJO
   - Campanita debe notificar

**✅ TEST PASADO:** Todo cambió automáticamente
```

---

## 📋 TEST 3: Notificaciones por Correo (OPCIONAL)

**Pre-requisito:** SendGrid configurado en `.env.local`

### Paso 3.1: Preparar
```
1. Crear requisición como PROFESOR
2. Jefe aprueba
3. Esperar 5-10 segundos (email processor)
4. Revisar correo del profesor
```

### Paso 3.2: Verificar email
**Debe contener:**
- [ ] Subject: "Requisición REQ-XXXX - APROBADA"
- [ ] Cuerpo: "Tu requisición fue aprobada"
- [ ] Link a dashboard (opcional)

**✅ TEST PASADO:** Email recibido con información correcta
**❌ TEST FALLIDO:** No recibe email (revisa `.env.local` SendGrid API key)

---

## 📋 TEST 4: Gráficos en Dashboard

### Paso 4.1: Crear múltiples requisiciones
```
Como PROFESOR, crear 5 requisiciones con diferentes estados:
- 2 pendientes (crear)
- 2 aprobadas (crear, luego jefe aprueba)
- 1 rechazada (crear, luego jefe rechaza)
```

### Paso 4.2: Verificar Dashboard
```
1. Profesor: Click Dashboard (o / en sidebar)
2. Verificar PieChart de Requisiciones:
   - [ ] Muestra: Aprobadas: 2, Pendientes: 2, Rechazadas: 1
   - [ ] Colores correctos: Verde (aprobadas), Amarillo (pendientes), Rojo (rechazadas)
3. Verificar Timeline:
   - [ ] Muestra actividad de los últimos 7 días
   - [ ] Peaks en días cuando se crearon requisiciones
```

---

## 📋 TEST 5: Diferencia entre ROLES

### Paso 5.1: Login como ADMIN
```
1. Nueva pestaña
2. Login como ADMIN
3. Click Dashboard
```

### Paso 5.2: Comparar Dashboards
**ADMIN ve:**
- [ ] AdminDashboard
- [ ] Muestra: Inventario, Órdenes, Usuarios, Auditoría, Reportes, etc
- [ ] Gráficos globales (todos los usuarios)

**PROFESOR ve:**
- [ ] ProfessorDashboard
- [ ] Muestra: Solo Requisiciones, Solicitudes de Compra
- [ ] Gráficos personalizados (solo datos del profesor)
- [ ] No ve: Auditoría, Usuarios, Órdenes de otros, etc

**✅ TEST PASADO:** Dashboards son diferentes
**❌ TEST FALLIDO:** Ambos ven lo mismo

---

## 📋 TEST 6: Performance (Realtime Update Speed)

### Paso 6.1: Medir velocidad
```
1. Profesor: Abrir Requisiciones page
2. Jefe: Abrir misma requisición
3. Jefe: Click Aprobar
4. Profesor: CONTAR SEGUNDOS hasta que status cambia
5. Anotar tiempo
```

**Resultado esperado:** < 1 segundo (típicamente 200-500ms)
**Resultado aceptable:** < 2 segundos
**Resultado malo:** > 5 segundos (revisa conexión)

---

## 📋 TEST 7: Purchase Requests Realtime

**Nota:** Idéntico a Requisiciones pero con Solicitudes de Compra

```
1. Profesor: Crear Solicitud de Compra
2. Jefe: Aprobar
3. Profesor: Verificar que cambió automáticamente SIN recargar
4. Verificar notificación en campanita
```

---

## 🐛 TROUBLESHOOTING

### Problema: Dashboard sigue mostrando AdminDashboard para profesor
**Soluciones:**
1. Verificar role en BD: `SELECT role FROM users WHERE id = 'profesor-id'`
2. Debe ser exactamente `'profesor'` (minúsculas, sin espacios)
3. Limpiar caché: Ctrl+Shift+Del
4. Recargar página: Ctrl+Shift+R

### Problema: Notificaciones no actualizan automáticamente
**Soluciones:**
1. Verificar Supabase Realtime habilitado:
   - Supabase → Project Settings → Realtime
   - Tabla `requisitions` debe estar en "Realtime enabled"
2. Verificar SQL #1 ejecutado (crea requisition_items)
3. Verificar SQL #2 ejecutado (crea políticas)
4. Revisar browser console (F12 → Console) por errores

### Problema: Campanita no muestra notificación
**Soluciones:**
1. Verificar tabla `notifications` existe
2. Verificar SQL #1 ejecutado correctamente
3. Revisar base de datos:
   ```sql
   SELECT * FROM notifications WHERE recipient_user_id = 'tu-usuario-id'
   ORDER BY created_at DESC LIMIT 5;
   ```

### Problema: Gráficos no cargan / son vacíos
**Soluciones:**
1. Profesor debe tener al menos 1 requisición/solicitud
2. Verificar datos:
   ```sql
   SELECT COUNT(*) FROM requisitions WHERE user_id = 'profesor-id';
   SELECT COUNT(*) FROM purchase_requests WHERE user_id = 'profesor-id';
   ```

---

## ✅ MATRIZ DE ACEPTACIÓN

| Test | Esperado | Resultado | ¿PASÓ? |
|------|----------|-----------|--------|
| 1.1 - Dashboard carga | ProfessorDashboard | | ☐ |
| 1.2 - Widgets correctos | 4+4 cards + 3 charts | | ☐ |
| 1.3 - Datos personalizados | Solo profesor | | ☐ |
| 2.1 - Requisición crea | Aparece en tabla | | ☐ |
| 2.4 - Realtime actualiza | SIN recargar, <1seg | | ☐ |
| 2.5 - Campanita notifica | Muestra mensaje | | ☐ |
| 3.1 - Email enviado | Recibido (si SendGrid) | | ☐ |
| 4.1 - PieCharts muestran | Datos correctos | | ☐ |
| 5.1 - Admin vs Profesor | Dashboards diferentes | | ☐ |
| 6.1 - Speed < 1 segundo | Medido y ✓ | | ☐ |
| 7.1 - Purchase requests | Mismo flujo que req | | ☐ |

**Total Pasado:** ___/11

**Criterio de Aceptación:** Mínimo 10/11 PASADO

---

## 📞 REPORTAR BUGS

Si encuentras algún problema:

1. **Screenshot:** Captura el error
2. **Browser console:** F12 → Console → Copiar error completo
3. **Pasos:** Describe exactamente qué hiciste
4. **Database:** Compartir resultado de queries SQL si aplica
5. **Tiempo:** Nota cuándo ocurrió

---

## 🎉 PRÓXIMO PASO DESPUÉS DE VALIDAR

Una vez que todos los tests pasen:

```
✅ Compilación: OK
✅ Tests: 10/11 PASADO
✅ Realtime: Funciona <1 segundo
✅ Dashboard: Personalizado por rol

→ LISTO PARA PRODUCCIÓN

Ejecutar:
  npm run build
  Desplegar dist/ a servidor
```

