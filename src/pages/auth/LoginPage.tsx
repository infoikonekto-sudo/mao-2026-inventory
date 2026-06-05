import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { authenticateUser } from '@/services/supabaseClient'
import { VALIDATION_MESSAGES } from '@/constants'

const loginSchema = z.object({
  authCode: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .regex(/^[A-Z0-9-]+$/, 'Código de autenticación inválido'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Generador de partículas neon
const generateParticles = () => {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 6,
  }))
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [particles] = useState(generateParticles())
  const { setUser, setLicense, setLoading } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoading(true)

    try {
      // Consultar Supabase
      const userData = await authenticateUser(data.authCode)

      // Extraer licencia
      const license = userData.licenses

      setUser(userData)
      setLicense(license)
      toast.success('Sesión iniciada correctamente')
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Código de autenticación inválido o usuario inactivo')
    } finally {
      setIsLoading(false)
      setLoading(false)
    }
  }

  return (
    <div className="neon-login-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Partículas flotantes neon */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="neon-particle fixed pointer-events-none bg-cyan-400"
          style={{
            left: `${particle.left}%`,
            bottom: '-10px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float-up ${particle.duration}s ease-in infinite`,
            animationDelay: `${particle.delay}s`,
            opacity: 0.3,
            boxShadow: '0 0 10px rgba(34, 211, 238, 0.8)',
          }}
        />
      ))}

      {/* Contenedor principal */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo y Encabezado */}
        <div className="text-center mb-8">
          {/* Logo con efecto neon */}
          <div className="neon-logo-glow w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600 p-1">
            <img
              src="/logo-mao.png"
              alt="Logo MAO"
              className="w-full h-full object-contain rounded-full bg-white p-2"
            />
          </div>

          <h1 className="text-4xl font-bold text-white mb-2 neon-pulse drop-shadow-lg">
            MAO 2026
          </h1>
          <p className="text-cyan-300 text-lg font-semibold drop-shadow-md">
            Sistema de Inventario y Compras
          </p>
          <p className="text-cyan-200 text-sm mt-2 drop-shadow-sm">
            Colegio Manos a la Obra
          </p>
        </div>

        {/* Formulario de Login con efecto vidrio */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-cyan-400/30 neon-pulse">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Campo de Código de Autenticación */}
            <div>
              <label htmlFor="authCode" className="block text-sm font-medium text-cyan-300 mb-2">
                Código de Autenticación
              </label>
              <input
                {...register('authCode')}
                id="authCode"
                type="text"
                placeholder="Ej: PROF-4X9K-2M1L"
                className="w-full px-4 py-3 bg-blue-900/20 border-2 border-cyan-400/50 rounded-lg focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20 transition-all placeholder-cyan-600/50 text-white uppercase"
                disabled={isLoading}
                autoFocus
              />
              {errors.authCode && (
                <p className="text-red-400 text-sm mt-1 drop-shadow-md">{errors.authCode.message}</p>
              )}
            </div>

            {/* Botón de Envío con efecto neon */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-cyan-400/50 transition-all duration-300 disabled:opacity-50 uppercase tracking-wide flex items-center justify-center gap-2"
              style={{
                boxShadow: '0 0 15px rgba(34, 211, 238, 0.5), inset 0 0 5px rgba(34, 211, 238, 0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Iniciando sesión...
                </>
              ) : (
                '🔓 Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Información de Ayuda */}
          <div className="mt-6 pt-6 border-t border-cyan-400/20">
            <p className="text-xs text-cyan-300 text-center mb-3">
              ¿No tienes código de autenticación?
            </p>
            <button
              onClick={() => navigate('/test-users')}
              className="w-full px-4 py-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-all border border-cyan-400/30 hover:border-cyan-300 uppercase"
            >
              🧪 Ver usuarios de prueba
            </button>
            <p className="text-xs text-cyan-400/70 text-center mt-3">
              Contacta al administrador del sistema para obtener tu código único de acceso.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-cyan-300/70">
          <p>© 2026 Colegio Manos a la Obra - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
