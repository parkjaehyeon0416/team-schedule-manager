/**
 * ★ v18.70 — Modal 안에서 화면 아래에 붙는 판(아래 시트·사진 보기 아래 버튼 줄 등)의 틀.
 *   기기 하단 바(안드로이드 뒤로·홈·최근 / 제스처 바, iOS 홈 인디케이터)와 겹치는 높이만큼 아래 여백을 더함
 *   (style의 paddingBottom + 겹친 높이 → 버튼이 바 위로 올라옴. 겹치지 않으면 그대로).
 *
 *   Modal 안에서 useSafeAreaInsets()를 쓰지 않는 이유: 그 값은 앱 화면(바깥 창) 기준이라 따로 뜨는 Modal 창과 안 맞을 수 있음.
 *   안드로이드는 버전·Modal 설정(statusBarTranslucent 등)에 따라 시스템이 Modal 내용을 이미 바 위로 올려 그리기도 해서
 *   그 값을 그대로 더하면 두 번 띄워짐. SafeAreaView는 자기가 그려진 창에서 실제로 겹친 만큼을 직접 재므로 어느 경우든 맞음
 *   (Modal 밖의 일반 화면은 AppNavigator 화면 틀·하단 탭이 insets.bottom으로 처리).
 *
 *   ★ v18.71 — iOS는 예외: Modal 안의 SafeAreaView가 겹친 높이를 0으로 재서(새 아키텍처) 시트 버튼이 홈 인디케이터에 붙었음
 *   (아이폰 시뮬레이터 점검 — 업데이트 안내·본인 확인·팀원 메뉴 시트). iOS Modal은 늘 앱 화면 전체를 덮는 같은 창이라
 *   앱 화면 기준 insets.bottom이 그대로 맞음 → style의 아래 여백 + insets.bottom으로 직접 더함.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge, type SafeAreaViewProps } from 'react-native-safe-area-context';

const BOTTOM: readonly Edge[] = ['bottom'];

export default function ModalBottomSafeArea(props: Omit<SafeAreaViewProps, 'edges' | 'mode'>) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') {
    const flat = StyleSheet.flatten(props.style) || {};
    const base = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0;
    return <View {...props} style={[props.style, { paddingBottom: (typeof base === 'number' ? base : 0) + insets.bottom }]} />;
  }
  return <SafeAreaView {...props} edges={BOTTOM} />;
}

/**
 * ★ v18.70 QA — 어두운 반투명 배경이 있는 Modal(아래 시트·확인 창·선택 창)에 붙이는 속성: <Modal {...MODAL_UNDER_SYSTEM_BARS} …>
 *   안드로이드에서 Modal 창을 기기 상단 바(시계)·하단 바 뒤까지 그리게 함 → 어두운 배경이 화면 끝까지 덮음.
 *   (이게 없으면 Modal 창이 바를 피해 그려져서 어두운 배경이 바 앞에서 끊기고 바 칸만 하얗게 남았음)
 *   흰 판은 ModalBottomSafeArea가 바와 겹친 높이만큼 아래 여백을 더해서 버튼은 바 위, 판 바탕은 바 뒤까지 깔림.
 *   iOS는 원래 화면 전체라 영향 없음.
 *   ※ 입력칸이 있는 Modal에는 쓰지 말 것 — 바 뒤까지 그리는 창은 안드로이드가 키보드만큼 줄여 주지 않아
 *     입력칸·버튼이 키보드에 가려짐(앱 정보 회원 탈퇴 · ReauthSheet · 팀 공지 쓰기 시트는 그래서 예전 그대로)
 *   ※ 검은 사진 보기 Modal에도 쓰지 말 것 — 이때 바 버튼 색이 밝은 화면용(어두운 버튼)이라 검은 바탕에서 안 보임
 */
export const MODAL_UNDER_SYSTEM_BARS = { statusBarTranslucent: true, navigationBarTranslucent: true } as const;
