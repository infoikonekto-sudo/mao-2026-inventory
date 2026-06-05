import { useState, useRef, useEffect } from 'react'
import { Mail, Phone, MapPin, Calendar, Shield, Save, Camera, X, Loader, User as UserIcon, Lock, Key, CheckCircle, Activity, Bell } from 'lucide-react'
import { Alert } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabaseClient'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, setUser } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity'>('profile')

  const [profile, setProfile] = useState<any>(null)
  const [edited, setEdited] = useState<any>(null)
  const [, setSaved] = useState(false)
  const [, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const { data, error: queryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (queryError) throw queryError

        const profileData = {
          id: data.id,
          name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          role: data.role || '',
          joinDate: new Date(data.created_at).toLocaleDateString('es-GT'),
          bio: data.bio || '',
          city: data.city || '',
          profilePhotoUrl: data.profile_photo_url || null,
          authCode: data.auth_code || '',
        }

        setProfile(profileData)
        setEdited(profileData)
        setError('')
      } catch (err: any) {
        console.error('Error al cargar perfil:', err)
        setError('No se pudo cargar el perfil')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id])

  const handleChange = (field: string, value: any) => {
    setEdited((prev: any) => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (máx 2MB para base64)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe pesar más de 2MB')
      return
    }

    setUploadingPhoto(true)
    try {
      // Convertir a base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const photoUrl = event.target?.result as string

        try {
          // Guardar inmediatamente en la BD
          const { error: updateError } = await supabase
            .from('users')
            .update({ profile_photo_url: photoUrl })
            .eq('id', profile.id)

          if (updateError) throw updateError

          // Actualizar estado local
          setEdited((prev: any) => ({ ...prev, profilePhotoUrl: photoUrl }))
          // Actualizar store global
          if (user) {
            setUser({ ...user, profile_photo_url: photoUrl })
          }

          // Mostrar confirmación
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        } catch (error) {
          console.error('Error al guardar foto:', error)
          alert('Error al guardar la foto')
        } finally {
          setUploadingPhoto(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error al subir foto:', error)
      setUploadingPhoto(false)
      alert('Error al procesar la imagen')
    }
  }

  const handleSave = async () => {
    if (!profile?.id) return

    setSaving(true)
    try {
      const updateData = {
        full_name: edited.name,
        email: edited.email,
        phone: edited.phone,
        department: edited.department,
        city: edited.city,
        bio: edited.bio,
        profile_photo_url: edited.profilePhotoUrl,
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...edited })

      // Actualizar store global
      if (user) {
        setUser({
          ...user,
          full_name: edited.name,
          email: edited.email,
          phone: edited.phone,
          department: edited.department,
          city: edited.city,
          bio: edited.bio,
          profile_photo_url: edited.profilePhotoUrl
        })
      }

      setSaved(true)
      setIsEditing(false)
      setError('')
      toast.success('Perfil actualizado correctamente', { position: 'top-right' })
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error('Error al guardar perfil:', err)
      setError('Error al guardar los cambios')
      toast.error('No se pudo guardar el perfil', { position: 'top-right' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }
    if (passwordData.new.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      })
      if (error) throw error

      toast.success('Contraseña actualizada con éxito')
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      console.error('Error cambiando contraseña', err)
      toast.error(err.message || 'Error al cambiar la contraseña')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-3" size={32} />
          <p>Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">👤 Mi Perfil</h1>
        <Alert type="error">No se pudo cargar tu perfil</Alert>
      </div>
    )
  }

  const displayData = isEditing ? edited : profile

  return (
    <div className="space-y-6 md:p-4 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-200">
            <UserIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Tu Perfil y Ajustes</h1>
            <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Gestiona tu información personal, seguridad y preferencias</p>
          </div>
        </div>
      </div>


      {/* Profile Header Card */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Avatar */}
          <div className="relative group mx-auto md:mx-0">
            {displayData.profilePhotoUrl ? (
              <img
                src={displayData.profilePhotoUrl}
                alt="Foto de perfil"
                className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center text-5xl text-white font-black shadow-xl">
                {displayData.name?.charAt(0) || displayData.avatar || 'U'}
              </div>
            )}
            {isEditing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 hover:scale-110 transition-transform disabled:opacity-50"
                  title="Cambiar foto de perfil"
                >
                  <Camera size={20} />
                </button>
                {displayData.profilePhotoUrl && (
                  <button
                    onClick={async () => {
                      if (!profile?.id) return
                      try {
                        const { error } = await supabase.from('users').update({ profile_photo_url: null }).eq('id', profile.id)
                        if (error) throw error
                        setEdited((prev: any) => ({ ...prev, profilePhotoUrl: null }))
                        setProfile((prev: any) => ({ ...prev, profilePhotoUrl: null }))
                        if (user) setUser({ ...user, profile_photo_url: undefined })
                        toast.success('Foto eliminada')
                      } catch (err) {
                        toast.error('Error al eliminar la foto')
                      }
                    }}
                    className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-xl shadow-lg hover:bg-red-600 hover:scale-110 transition-transform"
                    title="Eliminar foto"
                  >
                    <X size={16} />
                  </button>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 rounded-[2rem] flex items-center justify-center backdrop-blur-sm">
                    <Loader className="animate-spin text-white" size={24} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-widest mb-3 border border-indigo-100">
              <Shield size={14} />
              {displayData.role}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{displayData.name}</h2>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <MapPin size={16} className="text-blue-500" />
                {displayData.department}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <Calendar size={16} className="text-blue-500" />
                Desde {displayData.joinDate}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full md:w-auto flex justify-center mt-4 md:mt-0">
            {!isEditing ? (
              <button 
                onClick={() => {
                  setActiveTab('profile')
                  setIsEditing(true)
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 hover:scale-105 transition-all shadow-lg"
              >
                Editar Perfil
              </button>
            ) : (
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-200"
                >
                  {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEdited({ ...profile })
                    setIsEditing(false)
                  }}
                  disabled={saving}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 rounded-[1rem] font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <UserIcon size={18} />
          Información Personal
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 py-3 rounded-[1rem] font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'security' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <Lock size={18} />
          Seguridad y Ajustes
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-6 py-3 rounded-[1rem] font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'activity' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <Activity size={18} />
          Mi Actividad
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Mail className="text-blue-500" /> Datos de Contacto
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                  {isEditing ? (
                    <input type="email" value={edited.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" />
                  ) : (
                    <div className="flex items-center gap-3 text-gray-900 font-semibold p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <Mail size={18} className="text-blue-500" />
                      {displayData.email}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teléfono</label>
                  {isEditing ? (
                    <input type="tel" value={edited.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" />
                  ) : (
                    <div className="flex items-center gap-3 text-gray-900 font-semibold p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <Phone size={18} className="text-blue-500" />
                      {displayData.phone || 'No registrado'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ciudad / Sede</label>
                  {isEditing ? (
                    <input type="text" value={edited.city} onChange={(e) => handleChange('city', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" />
                  ) : (
                    <div className="flex items-center gap-3 text-gray-900 font-semibold p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <MapPin size={18} className="text-blue-500" />
                      {displayData.city || 'No registrada'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6">Acerca de mí</h3>
              {isEditing ? (
                <textarea
                  value={edited.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Escribe una breve descripción sobre tu rol y responsabilidades..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 resize-none"
                  rows={4}
                />
              ) : (
                <p className="text-gray-700 font-medium p-4 bg-gray-50/50 rounded-xl leading-relaxed italic border border-gray-100 min-h-[100px]">
                  "{displayData.bio || 'Sin descripción disponible.'}"
                </p>
              )}
            </div>
          </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          {/* Quick Info Summary */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield size={100} />
            </div>
            <h3 className="font-black uppercase tracking-widest text-xs mb-6 opacity-80">Identificación de Sistema</h3>
            <div className="space-y-4 relative z-10">
              <div>
                <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">ID Acceso (Código)</p>
                <div className="font-mono text-xl font-black bg-white/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm">
                  {displayData.authCode}
                </div>
              </div>
              <div className="pt-4 border-t border-white/20">
                <p className="text-blue-200 text-xs uppercase font-bold tracking-wider mb-1">Estado de Cuenta</p>
                <div className="flex items-center gap-2 text-green-300 font-black">
                  <CheckCircle size={18} /> Activa y Verificada
                </div>
              </div>
            </div>
          </div>

          {/* Activity Mini-widget */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
              <Activity className="text-purple-500" size={16} /> Resumen Rápido
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-500">Sesión Actual</span>
                <span className="text-sm font-black text-green-600 bg-green-50 px-2 py-1 rounded-md">En línea</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-500">Requisiciones mes</span>
                <span className="text-sm font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md">8 creadas</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Cambiar Contraseña */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Key className="text-indigo-500" /> Cambiar Contraseña
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-6">Asegúrate de usar una contraseña fuerte y no compartirla con nadie más de la institución.</p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirmar Nueva Contraseña</label>
                <input 
                  type="password"
                  required
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="Repite tu nueva contraseña"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900" 
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading || !passwordData.new || !passwordData.confirm}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
              >
                {passwordLoading ? <Loader size={18} className="animate-spin" /> : <Lock size={18} />}
                Actualizar Contraseña
              </button>
            </form>
          </div>

          {/* Notificaciones */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Bell className="text-amber-500" /> Preferencias
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-900">Alertas por Correo</h4>
                  <p className="text-xs font-medium text-gray-500 mt-1">Recibir aviso al aprobar solicitudes</p>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-blue-500 cursor-pointer shadow-inner">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-6"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-900">Alertas de Inventario</h4>
                  <p className="text-xs font-medium text-gray-500 mt-1">Notificar cuando un producto esté listo</p>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-blue-500 cursor-pointer shadow-inner">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-black text-gray-800">Historial en Construcción</h3>
          <p className="text-gray-500 mt-2 font-medium">Pronto podrás ver aquí un registro detallado de todas tus interacciones en el sistema MAO 2026.</p>
        </div>
      )}
    </div>
  )
}
