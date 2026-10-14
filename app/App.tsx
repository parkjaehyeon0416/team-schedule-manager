import React, { useEffect } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ★ v11.1.1 추가
import AppNavigator from './src/navigation/AppNavigator';
import PlanLockedSheet from './src/components/PlanLockedSheet';
import AppUpdateSheet from './src/components/AppUpdateSheet';
import AppUpdateRequiredScreen from './src/screens/AppUpdateRequiredScreen';
import { useAppUpdateStore } from './src/store/appUpdateStore';
import { usePlanLockStore } from './src/store/planLockStore';
import {
  dismissOptionalUpdate,
  fillRequiredDetails,
  openAppUpdate,
  startOptionalUpdate,
  useAppUpdateCheck,
  useUpdateChannel,
} from './src/utils/appUpdate';

// ★ v18.69 — 앱 업데이트 안내(강제·선택). 앱 시작(로그인 복원과 동시에)·다시 앞으로 올 때 버전 확인.
//   - 강제(required): 앱 화면(AppNavigator)·잠금 시트 대신 업데이트 화면만 그림. 스플래시 중에도 바로 바뀌고,
//     뒤로 가기 = 앱 나가기(화면은 안 닫힘). 한 번 required면 이번 실행 동안 안 풀림(appUpdateStore)
//     ※ Modal로 띄우지 않음: 아이폰은 이미 다른 Modal(화면별 시트·잠금 시트·닫히는 중인 선택 시트)이 떠 있으면
//       새 Modal을 못 띄우고 다시 시도도 안 함 → 426 처리기가 요청을 붙잡아 둔 채 화면이 멈춘 것처럼 보였음.
//       앱 화면을 통째로 바꾸면 다른 Modal은 전부 내려가고, 띄울 필요 없이 바로 보임
//   - 선택(optional): 스플래시가 끝난 뒤 닫을 수 있는 시트("나중에"는 이번 실행 동안만 숨김 → 앱을 새로 켜거나
//     30분 넘게 뒤에 있다 돌아오면 다시 뜸)
//   화면 모양: AppUpdateRequiredScreen(디자인 APP_UPDATE_REQUIRED / _APK) · AppUpdateSheet(APP_UPDATE_OPTIONAL)
//     스토어/APK 모양은 설치 경로(useUpdateChannel — [업데이트]가 여는 곳과 같은 기준)로 고름
function AppUpdateRequiredHost() {
  const info = useAppUpdateStore(s => s.info);
  const channel = useUpdateChannel();

  useEffect(() => {
    usePlanLockStore.getState().hide(); // 잠금 시트 상태도 정리(시트 자체는 이미 안 그림)
    fillRequiredDetails(); // 426으로 막혔는데 최신 버전·스토어 주소를 모르면 버전 확인으로 채움
    // 안드로이드 뒤로 가기 = 앱 나가기(업데이트 화면은 안 닫힘). 아이폰엔 뒤로 가기 버튼이 없음
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <AppUpdateRequiredScreen
      currentVersion={info?.currentVersion ?? null}
      latestVersion={info?.latestVersion ?? null}
      notes={info?.notes}
      channel={channel}
      onUpdate={() => openAppUpdate(useAppUpdateStore.getState().info)}
    />
  );
}

function AppUpdateOptionalHost() {
  const visible = useAppUpdateStore(s => s.status === 'optional' && s.promptReady);
  const info = useAppUpdateStore(s => s.info);
  const channel = useUpdateChannel();
  return (
    <AppUpdateSheet
      visible={visible}
      currentVersion={info?.currentVersion ?? null}
      latestVersion={info?.latestVersion ?? null}
      notes={info?.notes}
      channel={channel}
      onUpdate={startOptionalUpdate}
      onLater={dismissOptionalUpdate}
    />
  );
}

// 앱 본문: 강제 업데이트면 업데이트 화면만, 아니면 평소 화면 + 안내 시트들
function AppBody() {
  useAppUpdateCheck(); // 강제 화면으로 바뀌어도 계속 붙어 있도록 여기(항상 그려지는 곳)에 둠
  const required = useAppUpdateStore(s => s.status === 'required');

  if (required) return <AppUpdateRequiredHost />;

  return (
    <>
      <AppNavigator />
      {/* ★ v18.48 — 무료 한도에 걸리면 어느 화면에서든 뜨는 잠금 안내 시트 */}
      <PlanLockedSheet />
      {/* ★ v18.69 — 선택 업데이트 안내 시트 */}
      <AppUpdateOptionalHost />
    </>
  );
}

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
          {/* ★ v18.69 — 강제 업데이트면 앱 화면 대신 업데이트 화면(AppBody 참고) */}
          <AppBody />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
