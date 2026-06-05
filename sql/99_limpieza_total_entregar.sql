-- ==============================================================================
-- SCRIPT DE LIMPIEZA TOTAL PARA ENTREGA DEL SISTEMA (CLEAN SLATE)
-- ==============================================================================
-- Este script elimina de forma segura todo el historial transaccional
-- (requisiciones, órdenes, entregas e inventario) SIN borrar usuarios,
-- centros de costo, roles, presupuestos ni proveedores.
-- 
-- ADVERTENCIA: Esta acción NO se puede deshacer.
-- ==============================================================================

-- 1. Eliminar Movimientos y Entregas (Hijos)
DELETE FROM inventory_movements;
DELETE FROM delivery_items;
DELETE FROM deliveries;

-- 2. Eliminar Notificaciones
DELETE FROM email_notifications;
DELETE FROM notifications;

-- 3. Eliminar Historial de Requisiciones (Pedidos de maestros)
DELETE FROM requisition_items;
DELETE FROM requisitions;

-- 4. Eliminar Historial de Órdenes de Compra y Solicitudes
DELETE FROM express_order_items;
DELETE FROM express_orders;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM purchase_request_items;
DELETE FROM purchase_requests;

-- 5. Eliminar Catálogo de Inventario (El maestro principal)
-- Se hace al final porque muchas de las tablas anteriores dependen de estos IDs.
DELETE FROM inventory_items;

-- ==============================================================================
-- FIN DEL SCRIPT. 
-- Tu sistema ahora está limpio y listo para registrar el inventario real.
-- ==============================================================================
