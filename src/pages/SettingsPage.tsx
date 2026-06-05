import { useState } from 'react'
import { Save, Bell, Lock, Globe, Palette } from 'lucide-react'
import { Button, Alert } from '@/components/ui'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    schoolName: 'Colegio Manos a la Obra',
    email: 'administrador@colegio.com',
    phone: '+502 XXXX-XXXX',
    timezone: 'America/Guatemala',
    language: 'es',
    currency: 'GTQ',
    notifications: true,
    emailNotifications: true,
    autoBackup: true,
    backupFrequency: 'daily',
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  })

  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuración</h1>
        <p className="text-gray-600 mt-1">Ajustes del sistema y preferencias</p>
      </div>

      {saved && (
        <Alert type="success">
          ✅ Configuración guardada exitosamente
        </Alert>
      )}

      {/* General Settings */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <Globe size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Institución</label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Principal</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
            <select value={settings.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="input-base">
              <option>America/Guatemala</option>
              <option>America/New_York</option>
              <option>America/Mexico_City</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
            <select value={settings.language} onChange={(e) => handleChange('language', e.target.value)} className="input-base">
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="input-base">
              <option value="GTQ">Quetzal (Q)</option>
              <option value="USD">Dólar ($)</option>
              <option value="MXN">Peso Mexicano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <Palette size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Apariencia</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)} className="input-base">
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Fecha</label>
            <select value={settings.dateFormat} onChange={(e) => handleChange('dateFormat', e.target.value)} className="input-base">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Hora</label>
            <select value={settings.timeFormat} onChange={(e) => handleChange('timeFormat', e.target.value)} className="input-base">
              <option value="24h">24 horas</option>
              <option value="12h">12 horas (AM/PM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <Bell size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleChange('notifications', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Notificaciones en la aplicación</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleChange('emailNotifications', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Notificaciones por email</span>
          </label>
        </div>
      </div>

      {/* Backup */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <Lock size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Respaldo</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => handleChange('autoBackup', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Respaldo automático habilitado</span>
          </label>

          {settings.autoBackup && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de respaldo</label>
              <select value={settings.backupFrequency} onChange={(e) => handleChange('backupFrequency', e.target.value)} className="input-base">
                <option value="hourly">Cada hora</option>
                <option value="daily">Diariamente</option>
                <option value="weekly">Semanalmente</option>
                <option value="monthly">Mensualmente</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
          📦 <strong>Último respaldo:</strong> 15/01/2026 23:45:00
        </div>

        <Button variant="secondary" className="w-full">
          🔄 Hacer respaldo ahora
        </Button>
      </div>

      {/* Security */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <Lock size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
        </div>

        <p className="text-sm text-gray-600 mb-3">Gestiona la seguridad de tu cuenta</p>

        <Button variant="secondary" className="w-full">
          🔑 Cambiar contraseña
        </Button>
        <Button variant="secondary" className="w-full">
          📋 Ver sesiones activas
        </Button>
        <Button variant="secondary" className="w-full">
          🚪 Cerrar todas las sesiones
        </Button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4">
        <Button variant="primary" onClick={handleSave}>
          <Save size={20} className="mr-2" />
          Guardar cambios
        </Button>
        <Button variant="secondary">
          Cancelar
        </Button>
      </div>
    </div>
  )
}
