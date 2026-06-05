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

export default function LoginPageSimple() {
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0066cc 0%, #003366 100%)'
    }}>
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
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 10, position: 'relative' }}>
        {/* Logo y Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {/* Logo con efecto neon */}
          <div className="neon-logo-glow" style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #00ccff, #0066cc)',
            borderRadius: '50%',
            padding: '8px',
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.6)'
          }}>
            <img 
              src="/logo-mao.png" 
              alt="Logo MAO" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
                background: 'white',
                padding: '8px'
              }}
            />
          </div>
          
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '10px',
            textShadow: '0 0 20px rgba(34, 211, 238, 0.8)',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}>
            MAO 2026
          </h1>
          <p style={{ 
            color: '#00d9ff', 
            fontSize: '18px',
            textShadow: '0 0 10px rgba(34, 211, 238, 0.5)'
          }}>
            Sistema de Inventario y Compras
          </p>
          <p style={{ 
            color: '#00b8cc', 
            fontSize: '14px',
            marginTop: '8px'
          }}>
            Colegio Manos a la Obra
          </p>
        </div>

        {/* Formulario con efecto vidrio */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="neon-pulse" style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '15px',
            padding: '40px',
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.2)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: '#00d9ff', 
                fontSize: '14px', 
                marginBottom: '10px',
                fontWeight: '600'
              }}>
                Código de Autenticación
              </label>
              <input
                {...register('authCode')}
                type="text"
                placeholder="Ej: PROF-4X9K-2M1L"
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0, 102, 204, 0.1)',
                  border: '2px solid rgba(34, 211, 238, 0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  animation: 'pulse-glow 3s ease-in-out infinite'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00d9ff'
                  e.currentTarget.style.background = 'rgba(0, 102, 204, 0.2)'
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(34, 211, 238, 0.3)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)'
                  e.currentTarget.style.background = 'rgba(0, 102, 204, 0.1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              {errors.authCode && (
                <p style={{ color: '#ff6b6b', fontSize: '13px', marginTop: '6px' }}>
                  {errors.authCode.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #00d9ff, #0066cc)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 0 15px rgba(34, 211, 238, 0.5), inset 0 0 5px rgba(34, 211, 238, 0.3)',
                transition: 'all 0.3s ease',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.boxShadow = '0 0 25px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.5), inset 0 0 10px rgba(34, 211, 238, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 211, 238, 0.5), inset 0 0 5px rgba(34, 211, 238, 0.3)')}
            >
              {isLoading ? '⟳ Iniciando sesión...' : '🔓 Iniciar Sesión'}
            </button>
          </div>

          <div style={{ marginTop: '30px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', textAlign: 'center', lineHeight: '1.6' }}>
            <p>
              ¿No tienes código de autenticación?
            </p>
            <p style={{ marginTop: '8px', color: 'rgba(0, 217, 255, 0.7)', fontSize: '11px' }}>
              Contacta al administrador del sistema para obtener tu código único de acceso.
            </p>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        fontSize: '12px', 
        color: 'rgba(0, 217, 255, 0.6)', 
        position: 'absolute', 
        bottom: '16px', 
        width: '100%'
      }}>
        <p>© 2026 Colegio Manos a la Obra - Todos los derechos reservados</p>
      </div>
    </div>
  )
}

