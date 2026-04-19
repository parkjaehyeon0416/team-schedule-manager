import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

// GestureHandlerRootView: gesture-handler 라이브러리 필수 래퍼
// 앱 최상단에 감싸야 스와이프·터치 기능이 정상 작동합니다
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
