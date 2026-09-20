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

type LegalDocType = 'terms' | 'privacy';

export default function LegalDocumentScreen() {
  const route = useRoute<any>();
  const type: LegalDocType = route.params?.type ?? 'terms';

  const title = type === 'terms' ? '이용약관' : '개인정보 처리방침';
  const content = type === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY;

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
