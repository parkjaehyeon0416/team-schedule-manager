import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ★ v11.1.1 추가
import AppNavigator from './src/navigation/AppNavigator';

// GestureHandlerRootView: gesture-handler 라이브러리 필수 래퍼
//   → 앱 최상단에 감싸야 스와이프·터치 기능이 정상 작동합니다
// SafeAreaProvider: 노치/펀치홀/상태바 영역을 자동으로 피하게 도와주는 컨텍스트 공급
//   → 자식 컴포넌트의 SafeAreaView가 정상 작동하려면 반드시 필요합니다 (★ v11.1.1)
// PaperProvider: react-native-paper의 테마·Portal·모달 시스템 공급
//   → Portal, Modal, Dialog 등 컴포넌트 사용 시 반드시 필요합니다
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
