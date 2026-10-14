/**
 * ★ v18.68 — 화면별 상태바 아이콘 색
 *   앱 전체 기본값은 App.tsx의 <StatusBar barStyle="dark-content">(어두운 아이콘, 앱이 거의 전부 밝은 배경).
 *   위쪽이 어두운 화면만 아래 둘로 밝은 아이콘(light-content)으로 바꿈.
 */
import { useCallback, useEffect, useRef } from 'react';
import { StatusBar, StatusBarProps } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * 이 화면이 보이는 동안(포커스)만 적용되는 <StatusBar>.
 *   native-stack은 뒤에 깔린 화면도 마운트된 채 남아 있어서 그냥 <StatusBar>를 두면
 *   그 위로 쌓인 밝은 화면에도 값이 남음 → 포커스일 때만 렌더링(React Navigation 문서의 FocusAwareStatusBar 방식)
 */
export function FocusStatusBar(props: StatusBarProps) {
  const isFocused = useIsFocused();
  return isFocused ? <StatusBar {...props} /> : null;
}

/**
 * 검은 사진 뷰어처럼 화면 전체를 덮는 어두운 Modal용 — 열려 있는 동안 밝은 아이콘.
 *   안드로이드 Modal 창은 "뜨는 순간" 앱 창의 아이콘 색을 복사해 가서 Modal 안에 <StatusBar>를 두면 늦음.
 *   그래서 돌려주는 함수를 여는 쪽(사진 누를 때)에서 상태를 바꾸기 '전에' 불러 줌.
 *   닫히면(open=false) · 화면이 사라지면 원래 색으로 되돌림.
 */
export function useLightStatusBarWhile(open: boolean): () => void {
  const entry = useRef<StatusBarProps | null>(null);

  const enter = useCallback(() => {
    if (!entry.current) entry.current = StatusBar.pushStackEntry({ barStyle: 'light-content' });
  }, []);

  useEffect(() => {
    if (open) {
      enter(); // 여는 함수를 안 거친 경우 대비(이때는 조금 늦을 수 있음)
    } else if (entry.current) {
      StatusBar.popStackEntry(entry.current);
      entry.current = null;
    }
  }, [open, enter]);

  useEffect(() => () => {
    if (entry.current) StatusBar.popStackEntry(entry.current);
    entry.current = null;
  }, []);

  return enter;
}
