// ═══════════════════════════════════════════════════════════════
// 📄 src/screens/LegalDocumentScreen.tsx
//   이용약관 / 개인정보 처리방침 화면
//   - route.params.type: 'terms' | 'privacy'
//   - 정적 텍스트 표시 전용 (API 호출 없음)
//
//   ★ 표시되는 내용은 실제 사업자 정보 없이 작성된 일반 템플릿입니다.
//   [대괄호] 부분은 실제 배포 전 반드시 회사 정보로 교체해야 합니다.
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../constants/legalDocuments';

// ★ v18.70 — 위치기반서비스 이용약관은 뺌(앱이 기기 위치를 쓰지 않음)
type LegalDocType = 'terms' | 'privacy';

const TITLES: Record<LegalDocType, string> = {
  terms: '이용약관',
  privacy: '개인정보 처리방침',
};
const CONTENTS: Record<LegalDocType, string> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
};

export default function LegalDocumentScreen() {
  const route = useRoute<any>();
  // 알 수 없는 값(옛 'location' 등)이 오면 이용약관을 보여 줌
  const type: LegalDocType = route.params?.type === 'privacy' ? 'privacy' : 'terms';

  const title = TITLES[type];
  const content = CONTENTS[type];

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={title} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.body}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 20, paddingBottom: 40 },
  body: {
    fontSize: 13,
    lineHeight: 22,
    color: '#333',
  },
});
