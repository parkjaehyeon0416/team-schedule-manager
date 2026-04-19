import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role?: { id: number; name: string };
  team?: { id: number; name: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ★ Zustand v5에서는 async 함수를 바깥으로 빼야 해요
export const useAuthStore = create<AuthState>()(set => ({
  user: null,
  token: null,
  isLoggedIn: false,

  setAuth: async (user: User, token: string) => {
    await AsyncStorage.setItem('token', token);
    set({ user, token, isLoggedIn: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, token: null, isLoggedIn: false });
  },
}));
