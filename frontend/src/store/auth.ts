import { TAuthUser } from '@/types/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TState = {
  authUser: TAuthUser
  isActive: boolean
}

type TAction = {
  setAuthUser: (data: TAuthUser) => void
  cleanAuthUser: () => void
}

export const useAuth = create<TState & TAction>()(
  persist(
    (set) => ({
      authUser: {
        email: '',
        access_token: '',
      },
      isActive: false,
      setAuthUser: (data: TAuthUser) => {
        set({ authUser: data, isActive: true })
      },
      cleanAuthUser: () => {
        set({ authUser: { access_token: '', email: '' }, isActive: false })
      },
    }),
    { name: 'authUser' },
  ),
)
