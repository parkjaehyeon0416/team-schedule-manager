import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// ★ v18.38 — 앱이 꺼져 있거나 백그라운드일 때 온 푸시. 알림 표시는 시스템이 해주므로 여기선 할 일 없음
//   (등록해두지 않으면 Firebase가 경고를 남김)
setBackgroundMessageHandler(getMessaging(), async () => {});

AppRegistry.registerComponent(appName, () => App);
