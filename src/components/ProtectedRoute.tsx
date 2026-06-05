import { ReactNode } from 'react'
import { User } from '@/types'
import AccessDeniedPage from '@/pages/AccessDeniedPage'
import { canAccessRoute } from '@/utils/permissions'

interface ProtectedRouteProps {
  user: User
  route: string
  pageName: string
  children: ReactNode
}

export default function ProtectedRoute({
  user,
  route,
  pageName,
  children,
}: ProtectedRouteProps) {
  if (!canAccessRoute(user, route)) {
    return <AccessDeniedPage pageName={pageName} />
  }

  return <>{children}</>
}
