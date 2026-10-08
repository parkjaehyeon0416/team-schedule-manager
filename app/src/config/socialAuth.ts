// ★ v18.18 — 구글 로그인용 OAuth 2.0 "웹 클라이언트" ID (Android 클라이언트 ID 아님!)
// Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서
// "웹 애플리케이션" 유형으로 만든 클라이언트의 ID를 넣어야 함.
// (안드로이드에서 로그인해도 idToken의 검증 주체는 이 웹 클라이언트가 됨 — 서버의
//  GOOGLE_CLIENT_IDS env 값과 반드시 동일해야 서버에서 토큰 검증이 통과함)
export const GOOGLE_WEB_CLIENT_ID = '1023041336646-fm6coc15cm6j53latrupdl07n1cfmmng.apps.googleusercontent.com';

// ★ v18.46 — 아이폰용 "iOS" 유형 클라이언트 ID (번들 ID com.workmatekr.app으로 발급, v18.59).
//   발급받으면 여기에 넣고, ios/app/Info.plist의 URL 스킴에 "역순 클라이언트 ID"도 추가해야 함.
//   비어 있으면 아이폰에서 구글 로그인만 안 되고 나머지는 정상.
export const GOOGLE_IOS_CLIENT_ID = '1023041336646-u664fl7m4gfst4jo130sfacilh1tainp.apps.googleusercontent.com';
