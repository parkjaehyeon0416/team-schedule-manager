// 웹 버전과 동일하되 persist에 AsyncStorage 사용

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: number
  name: string
  email: string
  role: { name: string }
  team_id: number | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()()
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      // setAuth(): 로그인 성공 시 상태 저장
      setAuth: (user, token) => set({ user, token, isLoggedIn: true }),
      // clearAuth(): 로그아웃 시 상태 초기화
      clearAuth: () => set({ user: null, token: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage',
      // ★ 웹과 다른 점: localStorage 대신 AsyncStorage 사용
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
