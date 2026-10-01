// ═══════════════════════════════════════════════════════════════
// 📄 src/constants/ossLicenses.ts — APP_INFO "오픈소스 라이선스" 목록
//   package.json dependencies 기준 정리(2026-10-02). 새 라이브러리 추가 시 같이 갱신할 것.
// ═══════════════════════════════════════════════════════════════

export interface OssLicenseEntry {
  name: string;
  license: string;
}

export const OSS_LICENSES: OssLicenseEntry[] = [
  { name: 'React', license: 'MIT' },
  { name: 'React Native', license: 'MIT' },
  { name: '@react-navigation/native', license: 'MIT' },
  { name: '@react-navigation/native-stack', license: 'MIT' },
  { name: '@react-navigation/bottom-tabs', license: 'MIT' },
  { name: '@react-navigation/drawer', license: 'MIT' },
  { name: '@tanstack/react-query', license: 'MIT' },
  { name: 'zustand', license: 'MIT' },
  { name: 'axios', license: 'MIT' },
  { name: 'dayjs', license: 'MIT' },
  { name: 'react-native-paper', license: 'MIT' },
  { name: 'react-native-vector-icons', license: 'MIT' },
  { name: 'react-native-linear-gradient', license: 'MIT' },
  { name: 'react-native-gesture-handler', license: 'MIT' },
  { name: 'react-native-reanimated', license: 'MIT' },
  { name: 'react-native-screens', license: 'MIT' },
  { name: 'react-native-safe-area-context', license: 'MIT' },
  { name: 'react-native-calendars', license: 'MIT' },
  { name: 'react-native-image-picker', license: 'MIT' },
  { name: 'react-native-webview', license: 'MIT' },
  { name: '@react-native-async-storage/async-storage', license: 'MIT' },
  { name: '@react-native-clipboard/clipboard', license: 'MIT' },
  { name: '@react-native-community/datetimepicker', license: 'MIT' },
  { name: '@react-native-google-signin/google-signin', license: 'MIT' },
  { name: '@react-native-seoul/kakao-login', license: 'MIT' },
];
