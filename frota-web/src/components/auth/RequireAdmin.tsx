import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
