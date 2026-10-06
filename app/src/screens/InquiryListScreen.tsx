/**
 * 고객 문의 목록 — DESIGN-CANVAS 기준, INQUIRY_LIST.dc.html (★ v18.43)
 * 내정보 "고객 문의", 앱 정보 "문의하기"에서 진입.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getMyInquiries, INQUIRY_CATEGORY_LABEL } from '../api/inquiryApi';
import type { InquirySummary } from '../api/inquiryApi';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

export default function InquiryListScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<InquirySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getMyInquiries()
        .then(r => setItems(r.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, []),
  );

  const pending = items.filter(i => i.status === 'pending').length;
  const answered = items.length - pending;
  const tabs = [`전체 ${items.length}`, `답변 대기 ${pending}`, `답변 완료 ${answered}`];
  const key = [null, 'pending', 'answered'][tab];
  const list = items.filter(i => !key || i.status === key);

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="고객 문의" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.askCard} onPress={() => navigation.navigate('InquiryCreate')}>
          <Image source={ICONS.megaphone} style={styles.askIcon} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.askTitle}>궁금한 점이 있으신가요?</Text>
            <Text style={styles.askSub}>평일 10:00~18:00 순서대로 답변드려요</Text>
          </View>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={styles.askBtn}>
            <Text style={styles.askBtnText}>문의하기</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.tabRow}>
          {tabs.map((label, i) => (
            <Pressable key={i} style={[styles.tabBtn, tab === i && styles.tabBtnOn]} onPress={() => setTab(i)}>
              <Text style={[styles.tabText, tab === i && styles.tabTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>문의 내역이 없어요.</Text>
          </View>
        ) : (
          list.map(item => {
            const wait = item.status === 'pending';
            return (
              <Pressable key={item.id} style={styles.card} onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}>
                <View style={styles.cardTop}>
                  <Text style={styles.meta}>
                    {INQUIRY_CATEGORY_LABEL[item.category]} · {dayjs(item.created_at).format('YYYY.MM.DD')}
                  </Text>
                  <View style={styles.badgeRow}>
                    {item.unread && <View style={styles.newDot} />}
                    <View style={[styles.badge, { backgroundColor: wait ? '#FFF2E2' : '#E2F8F4' }]}>
                      <Text style={[styles.badgeText, { color: wait ? '#B95E00' : '#0B8574' }]}>{wait ? '답변 대기' : '답변 완료'}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.title}>{item.title}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const shadow = { shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },

  askCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E6F0FA', ...shadow },
  askIcon: { width: 44, height: 44, resizeMode: 'contain' },
  askTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  askSub: { fontSize: 12, color: colors.textSecondary },
  askBtn: { height: 34, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  askBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  tabRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  tabBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabBtnOn: { backgroundColor: '#FFFFFF', borderColor: '#CFE3FA' },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  tabTextOn: { fontWeight: '700', color: colors.primaryDark },

  card: { gap: 6, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 14, ...shadow },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, lineHeight: 22 },

  emptyBox: { paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: '#DDEAF7', borderRadius: 16 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
