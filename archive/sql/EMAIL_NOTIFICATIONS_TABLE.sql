-- Crear tabla de notificaciones por email
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  related_id UUID,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
);

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent ON email_notifications(sent);
CREATE INDEX IF NOT EXISTS idx_email_notifications_license_id ON email_notifications(license_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_notification_type ON email_notifications(notification_type);

-- Habilitar RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Política de lectura: cualquier usuario autenticado puede ver sus propias notificaciones
CREATE POLICY "Users can view email notifications for their license" ON email_notifications
  FOR SELECT
  USING (
    license_id = (SELECT license_id FROM users WHERE id = auth.uid())
  );

-- Política de inserción: solo los sistemas autenticados pueden crear notificaciones
CREATE POLICY "System can create email notifications" ON email_notifications
  FOR INSERT
  WITH CHECK (
    license_id = (SELECT license_id FROM users WHERE id = auth.uid())
  );

-- Política de actualización: solo los administradores pueden actualizar
CREATE POLICY "Admins can update email notifications" ON email_notifications
  FOR UPDATE
  USING (
    license_id = (SELECT license_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT ON email_notifications TO authenticated;
GRANT INSERT ON email_notifications TO authenticated;
GRANT UPDATE ON email_notifications TO authenticated;
