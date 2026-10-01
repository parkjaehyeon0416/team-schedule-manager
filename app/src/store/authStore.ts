import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  team_id: number | null;
  // ★ v18.23 — 프로필/연락처 공유
  phone?: string | null;
  avatar_color?: string;
  avatar_image_path?: string | null;
  kakao_talk_id?: string | null;
  role?: { id: number; name: string };
  team?: { id: number; name: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean; // ★ 추가 — 앱 시작 시 토큰 복원 중인지 여부
  setAuth: (user: User, token: string, persist?: boolean) => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>; // ★ v18.23 — 프로필 수정 후 로컬 상태 갱신
  logout: () => Promise<void>;
  restoreAuth: () => Promise<void>; // ★ 추가 — 앱 시작 시 토큰 복원
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true, // 앱 시작 시 '복원 중' 상태로 시작

  // 로그인 성공 시 호출 — 토큰 저장 + 메모리 상태 업데이트
  //   ★ persist=false("로그인 상태 유지" 체크 해제) — AsyncStorage에 안 남겨서
  //   앱을 재시작하면 다시 로그인해야 함(메모리 상태로만 이번 세션 유지).
  setAuth: async (user: User, token: string, persist: boolean = true) => {
    if (persist) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    set({ user, token, isLoggedIn: true, isLoading: false });
  },

  // ★ v18.23 — 프로필 수정(PUT /profile, 아바타 업로드) 응답으로 받은 최신
  //   user 정보를 메모리+저장소에 반영. 서버 응답 전체(user.fresh())를 그대로
  //   넘기면 되고, 부분 필드만 와도 기존 값과 merge됨.
  updateUser: async (partial: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const merged = { ...current, ...partial };
    await AsyncStorage.setItem('user', JSON.stringify(merged));
    set({ user: merged });
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
