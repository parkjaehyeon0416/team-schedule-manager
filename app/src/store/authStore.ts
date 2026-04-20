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
  isLoading: boolean; // ★ 추가 — 앱 시작 시 토큰 복원 중인지 여부
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreAuth: () => Promise<void>; // ★ 추가 — 앱 시작 시 토큰 복원
}

export const useAuthStore = create<AuthState>()(set => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true, // 앱 시작 시 '복원 중' 상태로 시작

  // 로그인 성공 시 호출 — 토큰 영구 저장 + 메모리 상태 업데이트
  setAuth: async (user: User, token: string) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user)); // ★ 사용자 정보도 저장
    set({ user, token, isLoggedIn: true, isLoading: false });
  },

  // 로그아웃 — 저장소 비우기 + 메모리 상태 리셋
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, isLoggedIn: false, isLoading: false });
  },

  // ★ 앱 시작 시 AsyncStorage에서 저장된 로그인 정보 복원
  //   AppNavigator에서 최초 1회 호출
  restoreAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');

      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ user, token, isLoggedIn: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.warn('로그인 정보 복원 실패:', e);
      set({ isLoading: false });
    }
  },
}));
