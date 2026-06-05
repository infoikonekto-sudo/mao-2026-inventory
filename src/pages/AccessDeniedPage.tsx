import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

interface AccessDeniedPageProps {
  pageName?: string
}

export default function AccessDeniedPage({ pageName = 'esta página' }: AccessDeniedPageProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-6 rounded-full">
              <AlertCircle size={48} className="text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            No tienes permiso para acceder a <strong>{pageName}</strong>.
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Esta acción está restringida según tu rol de usuario. Contacta al administrador si crees que es un error.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Volver al Dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Atrás
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Si persiste el problema, contacta: admin@colegio.com
        </p>
      </div>
    </div>
  )
}
