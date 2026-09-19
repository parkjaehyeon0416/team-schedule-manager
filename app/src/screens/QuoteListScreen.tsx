// ═══════════════════════════════════════════════════════════════
// 📄 QuoteListScreen.tsx — 견적서 목록 (★ v12.1 백엔드/웹에 이어 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Chip, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { getQuotes, approveQuote, deleteQuote } from '../api/quoteApi';
import type { Quote } from '../types/api';
import { formatMoney } from '../utils/format';
import AppHeader from '../components/AppHeader';

const STATUS_LABEL: Record<Quote['status'], { text: string; color: string }> = {
  draft: { text: '작성중', color: '#999' },
  sent: { text: '전달됨', color: '#1E88E5' },
  approved: { text: '승인됨', color: '#43A047' },
  rejected: { text: '반려', color: '#D32F2F' },
};

export default function QuoteListScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getQuotes();
      setQuotes(list);
    } catch (e: any) {
      console.error('견적 목록 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '견적 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleApprove = (q: Quote) => {
    if (!q.desired_date) {
      Alert.alert('승인 불가', '희망 시공일이 없는 견적은 승인할 수 없습니다.');
      return;
    }
    Alert.alert('견적 승인', '견적을 승인하고 일정을 등록할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '승인',
        onPress: async () => {
          try {
            await approveQuote(q.id);
            await load();
            Alert.alert('완료', '견적이 승인되어 일정이 등록되었습니다.');
          } catch (e: any) {
            Alert.alert('승인 실패', e?.response?.data?.message || '승인에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleDelete = (q: Quote) => {
    Alert.alert('견적 삭제', '이 견적서를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuote(q.id);
            await load();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="견적서 관리" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="견적서 관리" />
      <ScrollView contentContainerStyle={styles.container}>
        {quotes.length === 0 && (
          <View style={styles.emptyBox}>
            <Icon name="file-document-outline" size={56} color="#BBB" />
            <Text style={styles.emptyTitle}>아직 작성한 견적서가 없습니다</Text>
          </View>
        )}

        {quotes.map(q => (
          <View key={q.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.clientName}>{q.client_name ?? '고객명 미입력'}</Text>
              <Chip
                compact
                style={{ backgroundColor: STATUS_LABEL[q.status].color + '22' }}
                textStyle={{ color: STATUS_LABEL[q.status].color, fontSize: 11 }}
              >
                {STATUS_LABEL[q.status].text}
              </Chip>
            </View>
            <Text style={styles.address}>{q.address ?? '주소 미입력'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>희망일 {q.desired_date ?? '미정'}</Text>
              <Text style={styles.totalAmount}>{formatMoney(q.total_amount)}원</Text>
            </View>

            <Divider style={styles.cardDivider} />

            <View style={styles.actionRow}>
              {q.status !== 'approved' && (
                <Button mode="contained-tonal" compact onPress={() => handleApprove(q)}>
                  승인
                </Button>
              )}
              <Button mode="text" compact textColor="#D32F2F" onPress={() => handleDelete(q)}>
                삭제
              </Button>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.fabContainer}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => navigation.navigate('QuoteCreate')}
          style={styles.fab}
        >
          견적 작성
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 100 },

  emptyBox: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 15, color: '#555', marginTop: 12 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 16, fontWeight: '700', color: '#222' },
  address: { fontSize: 13, color: '#888', marginTop: 4 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: { fontSize: 12, color: '#999' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: '#1F3864' },

  cardDivider: { marginVertical: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },

  fabContainer: { position: 'absolute', left: 16, right: 16, bottom: 20 },
  fab: { borderRadius: 10 },
});
