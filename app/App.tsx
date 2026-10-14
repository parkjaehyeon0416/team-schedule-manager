import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ★ v11.1.1 추가
import AppNavigator from './src/navigation/AppNavigator';
import PlanLockedSheet from './src/components/PlanLockedSheet';

// GestureHandlerRootView: gesture-handler 라이브러리 필수 래퍼
//   → 앱 최상단에 감싸야 스와이프·터치 기능이 정상 작동합니다
// SafeAreaProvider: 노치/펀치홀/상태바 영역을 자동으로 피하게 도와주는 컨텍스트 공급
//   → 자식 컴포넌트의 SafeAreaView가 정상 작동하려면 반드시 필요합니다 (★ v11.1.1)
// PaperProvider: react-native-paper의 테마·Portal·모달 시스템 공급
//   → Portal, Modal, Dialog 등 컴포넌트 사용 시 반드시 필요합니다
// StatusBar: ★ v18.68 — 앱 전체 기본 상태바 = 어두운 시계·아이콘(앱이 거의 전부 밝은 배경)
//   예전엔 지정이 없어 흰 아이콘이라 밝은 화면에서 안 보였음(안드로이드 15+는 앱이 상태바 뒤까지 그려짐).
//   iOS도 'default'면 기기 다크 모드일 때 흰 아이콘이 되므로 dark-content로 고정.
//   backgroundColor는 안드로이드 14 이하에서만 쓰임(15+는 상태바가 투명). 위쪽이 어두운 화면은 FocusStatusBar로 덮어씀
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaProvider>
        <PaperProvider>
          <AppNavigator />
          {/* ★ v18.48 — 무료 한도에 걸리면 어느 화면에서든 뜨는 잠금 안내 시트 */}
          <PlanLockedSheet />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
