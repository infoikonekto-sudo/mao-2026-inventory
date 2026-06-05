import { create } from 'zustand'
import { User, License } from '@/types'

interface AuthState {
  user: User | null
  license: License | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setLicense: (license: License | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  license: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  setLicense: (license) => set({ license }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, license: null, error: null }),
}))
