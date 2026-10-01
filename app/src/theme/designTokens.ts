// ═══════════════════════════════════════════════════════════════
// 📄 designTokens.ts — WorkMate UI 스펙(workmate_ai_ui_spec_v3) 기반 디자인 토큰
//   화면을 하나씩 이 토큰으로 재단장하는 중. design-tokens.json을 그대로 포팅함.
// ═══════════════════════════════════════════════════════════════
export const colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#06C28F',
  accent: '#FFB547',
  background: '#F4F7FF',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#06C28F',
  warning: '#FFB547',
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const shadow = {
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
};
