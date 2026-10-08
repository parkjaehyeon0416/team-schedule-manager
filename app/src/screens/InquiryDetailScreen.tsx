/**
 * 문의 상세 — DESIGN-CANVAS 기준, INQUIRY_DETAIL.dc.html (★ v18.43)
 * 답변이 있으면 열어본 순간 서버에 "확인함"으로 기록됨(내정보 "답변 N건" 줄어듦).
 * 디자인의 답변 속 "팀 상세로 이동" 버튼은 예시 문구라 넣지 않음(운영자가 화면 링크를 지정하는 기능 없음).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getInquiry, sendInquiryFeedback, INQUIRY_CATEGORY_LABEL } from '../api/inquiryApi';
import type { InquiryDetail } from '../api/inquiryApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

export default function InquiryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: number = route.params.id;
  const [item, setItem] = useState<InquiryDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFailed(false);
      getInquiry(id).then(setItem).catch(() => setFailed(true));
    }, [id]),
  );

  if (!item) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="문의 상세" />
        <View style={styles.center}>
          {failed ? <Text style={styles.muted}>문의를 불러오지 못했어요.</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </View>
    );
  }

  const answered = item.status === 'answered';
  const giveFeedback = (helpful: boolean) => {
    setItem({ ...item, helpful });
    sendInquiryFeedback(item.id, helpful).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="문의 상세" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#EEF2F7' }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{INQUIRY_CATEGORY_LABEL[item.category]}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: answered ? '#E2F8F4' : '#FFF2E2' }]}>
              <Text style={[styles.badgeText, { color: answered ? '#0B8574' : '#B95E00' }]}>{answered ? '답변 완료' : '답변 대기'}</Text>
            </View>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.muted}>{dayjs(item.created_at).format('YYYY.MM.DD HH:mm')} 접수</Text>
          <Text style={styles.body}>{item.content}</Text>
          {item.files.length > 0 && (
            <View style={styles.photoRow}>
              {item.files.map(path => (
                <Pressable key={path} onPress={() => setViewing(path)}>
                  <Image source={{ uri: `${SERVER_BASE_URL}${path}` }} style={styles.photo} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {answered ? (
          <View style={styles.answerBox}>
            <View style={styles.answerHead}>
              <Image source={ICONS.logo} style={styles.logo} />
              <View>
                <Text style={styles.answerName}>현장메이트 고객지원</Text>
                {!!item.answered_at && <Text style={styles.muted}>{dayjs(item.answered_at).format('YYYY.MM.DD HH:mm')} 답변</Text>}
              </View>
            </View>
            <Text style={styles.body}>{item.answer}</Text>
          </View>
        ) : (
          <View style={styles.waitBox}>
            <Text style={styles.waitText}>답변을 준비하고 있어요. 평일 10:00~18:00 순서대로 답변드려요.</Text>
          </View>
        )}

        {answered && (
          <View style={[styles.card, { gap: 10 }]}>
            {item.helpful === true ? (
              <Text style={styles.feedbackTitle}>의견 고마워요! 더 나은 현장메이트가 될게요.</Text>
            ) : (
              <>
                <Text style={styles.feedbackTitle}>답변이 도움이 되었나요?</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={[styles.fbBtn, styles.fbBtnSoft]} onPress={() => giveFeedback(true)}>
                    <Text style={styles.fbBtnText}>도움이 됐어요</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.fbBtn, styles.fbBtnLine]}
                    onPress={() => {
                      if (item.helpful !== false) giveFeedback(false);
                      navigation.navigate('InquiryCreate', { category: item.category, title: `[추가 문의] ${item.title}`.slice(0, 100) });
                    }}
                  >
                    <Text style={styles.fbBtnText}>더 궁금해요</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!viewing} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)} accessibilityLabel="닫기">
          {viewing && <Image source={{ uri: `${SERVER_BASE_URL}${viewing}` }} style={styles.viewerImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const shadow = { shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, padding: 16, gap: 8, ...shadow },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 7, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '800', lineHeight: 25, color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textSecondary },
  body: { fontSize: 14, lineHeight: 24, color: colors.textPrimary },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  photo: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#EEF2F7' },

  answerBox: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#F1F8FF', borderWidth: 1, borderColor: '#CFE3FA' },
  answerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 32, height: 32, resizeMode: 'contain' },
  answerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  waitBox: { padding: 16, borderRadius: 16, backgroundColor: '#FFF8EE', borderWidth: 1, borderColor: '#FBE3C2' },
  waitText: { fontSize: 13, lineHeight: 20, color: '#8A4A00' },

  feedbackTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', color: colors.textPrimary },
  fbBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fbBtnSoft: { backgroundColor: '#EAF4FF' },
  fbBtnLine: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFB' },
  fbBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },

  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
});
