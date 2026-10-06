import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import App from './App';
import { name as appName } from './app.json';

// 요일 등 날짜 글자를 한국어로 (예: (Fri) → (금))
dayjs.locale('ko');

// ★ v18.38 — 앱이 꺼져 있거나 백그라운드일 때 온 푸시. 알림 표시는 시스템이 해주므로 여기선 할 일 없음
//   (등록해두지 않으면 Firebase가 경고를 남김)
//   ★ v18.46 — 아이폰은 Firebase 설정 파일(GoogleService-Info.plist)을 넣기 전엔 Firebase가 없어서
//   여기서 예외가 나면 앱 전체가 흰 화면으로 멈춤 → 실패해도 앱은 뜨도록 감쌈
try {
  setBackgroundMessageHandler(getMessaging(), async () => {});
} catch (e) {
  console.warn('푸시 백그라운드 핸들러 등록 생략:', e?.message);
}

AppRegistry.registerComponent(appName, () => App);
