import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper'; // ← 추가
import AppNavigator from './src/navigation/AppNavigator';

// GestureHandlerRootView: gesture-handler 라이브러리 필수 래퍼
//   → 앱 최상단에 감싸야 스와이프·터치 기능이 정상 작동합니다
// PaperProvider: react-native-paper의 테마·Portal·모달 시스템 공급
//   → Portal, Modal, Dialog 등 컴포넌트 사용 시 반드시 필요합니다
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <AppNavigator />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
