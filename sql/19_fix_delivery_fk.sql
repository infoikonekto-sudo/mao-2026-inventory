-- FIX: ELIMINAR RESTRICCIÓN DE CLAVE FORÁNEA EN DELIVERIES
-- El error indica que el usuario que intenta registrar la entrega no existe en la tabla a la que apunta la FK.
-- Para evitar bloqueos, eliminaremos la restricción de integridad referencial estricta en 'delivered_by'.
-- Esto permite guardar el ID del usuario de auth sin obligar a que exista en una tabla específica de 'users' pública sincronizada.

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_delivered_by_fkey;

-- Opcional: Si existiera otra restricción con nombre automático, intentamos eliminarla también si apunta a public.users
-- (Esto es preventivo, ignorar si falla)
-- ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_delivered_by_fkey1;
