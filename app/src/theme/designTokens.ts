// ═══════════════════════════════════════════════════════════════
// 📄 designTokens.ts — WorkMate DESIGN-CANVAS 기준 디자인 토큰 (v18.31)
//   claude.ai/artifact/QD41RYo8jRrRZ5vWbxQWS2 (HOME/SCHEDULE_MONTH/MY_HOME/
//   NOTIFICATIONS/AUTH_*.dc.html)에서 실제 쓰인 색상을 그대로 포팅함.
//   그라데이션 버튼(linear-gradient(180deg,#2492FF,#0A6CE0))은 네이티브
//   그라데이션 라이브러리가 없어 단색(deepBlue)으로 근사함.
// ═══════════════════════════════════════════════════════════════
export const colors = {
  primary: '#168BFF', // brandBlue — 아이콘/포인트
  primaryDark: '#0A6CE0', // deepBlue — 버튼/활성 탭/링크
  primaryLight: '#2492FF', // 그라데이션 상단색(그라데이션 미지원 시 참고용)
  secondary: '#0B9C8A', // teal
  accent: '#FF9E2C', // orange
  accentDark: '#E07E00',
  background: '#F7FBFF',
  surface: '#FFFFFF',
  textPrimary: '#102A56', // navyText
  textSecondary: '#5F7290',
  muted: '#8FA3BF', // 아이콘/placeholder
  border: '#DDEAF7', // 입력창 테두리
  borderCard: '#E6F0FA', // 카드 테두리
  borderHairline: '#EDF3FA', // 리스트 구분선
  danger: '#E5484D',
  dangerBg: '#FFF2F2',
  dangerBorder: '#FFD5D6',
  success: '#0B9C8A',
  successBg: '#DFF8F4',
  warning: '#E07E00',
  warningBg: '#FFF1DE',
  linkHover: '#0757B8',
};

export const radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 18,
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
  h1: { fontSize: 22, fontWeight: '800' as const },
  h2: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const shadow = {
  card: {
    shadowColor: '#102A56',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0A6CE0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 6,
  },
};
