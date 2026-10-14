// ★ v18.43 — 앱 버전 표시 (스플래시·앱 정보·고객 문의 기기 정보)
// ★ v18.69 — 설치된 앱의 실제 버전(versionName / CFBundleShortVersionString, react-native-device-info)을 씀.
//   네이티브 모듈이 없는 빌드·테스트에서만 아래 글자를 씀 → 배포할 때 build.gradle versionName·iOS MARKETING_VERSION과 같이 올릴 것
import { getAppVersion } from '../utils/appVersionInfo';

export const APP_VERSION = getAppVersion() ?? '1.1.0';
