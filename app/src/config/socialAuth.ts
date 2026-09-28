// ★ v18.18 — 구글 로그인용 OAuth 2.0 "웹 클라이언트" ID (Android 클라이언트 ID 아님!)
// Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서
// "웹 애플리케이션" 유형으로 만든 클라이언트의 ID를 넣어야 함.
// (안드로이드에서 로그인해도 idToken의 검증 주체는 이 웹 클라이언트가 됨 — 서버의
//  GOOGLE_CLIENT_IDS env 값과 반드시 동일해야 서버에서 토큰 검증이 통과함)
export const GOOGLE_WEB_CLIENT_ID = 'REPLACE_WITH_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';
