// ═══════════════════════════════════════════════════════════════
// 📄 TaxSummaryScreen.tsx — 수입·경비 정리 (세무자료) (★ v17 백엔드/웹에 이어 모바일 연동 ★ 이번 작업)
//   PDF 다운로드는 인증 헤더가 필요해 모바일에서 바로 열 수 없음 —
//   화면 조회만 지원하고, PDF는 웹 대시보드 이용을 안내한다.
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import { getTaxSummary } from '../api/taxSummaryApi';
import type { TaxSummary } from '../types/api';
import { formatMoney } from '../utils/format';
import AppHeader from '../components/AppHeader';

export default function TaxSummaryScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary | null>(null);

  const load = useCallback(async (y: number) => {
    try {
      setLoading(true);
      const data = await getTaxSummary(y);
      setSummary(data);
    } catch (e: any) {
      console.error('세무 자료 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '자료를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(year);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]),
  );

  return (
    <View style={styles.screen}>
      <AppHeader title="세무 자료" />
      <View style={styles.yearRow}>
        <Button compact onPress={() => setYear(y => y - 1)}>◀ {year - 1}</Button>
        <Text style={styles.yearText}>{year}년</Text>
        <Button compact onPress={() => setYear(y => y + 1)}>{year + 1} ▶</Button>
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          이 자료는 종합소득세 신고 참고용 간이 추정치입니다. 실제 신고는 세무 전문가와
          상담하세요. PDF 다운로드는 웹 대시보드에서 가능합니다.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {summary && (
            <>
              <View style={styles.statsGrid}>
                <StatCard label="총 수입" value={summary.totals.total_income} />
                <StatCard label="총 경비" value={summary.totals.total_expenses} />
                <StatCard label="예상 원천징수액" value={summary.totals.estimated_tax} />
                <StatCard label="실수령액" value={summary.totals.net_income} highlight />
              </View>

              <Divider style={styles.divider} />

              {summary.months.map(m => (
                <View key={m.year_month} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{m.month}월</Text>
                  <View style={styles.monthValues}>
                    <Text style={styles.monthText}>근무 {m.work_days}일</Text>
                    <Text style={styles.monthText}>{formatMoney(m.total_income)}원</Text>
                    <Text style={styles.monthNet}>{formatMoney(m.net_income)}원</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {formatMoney(value)}원
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 60 },

  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  yearText: { fontSize: 16, fontWeight: '700', color: '#1F3864', marginHorizontal: 8 },

  disclaimerBox: {
    backgroundColor: '#FFF7E6',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  disclaimerText: { fontSize: 11, color: '#9C5400', lineHeight: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 12,
  },
  statCardHighlight: { backgroundColor: '#E8F0FE' },
  statLabel: { fontSize: 12, color: '#888' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#333', marginTop: 4 },
  statValueHighlight: { color: '#1F3864' },

  divider: { marginVertical: 20 },

  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  monthLabel: { fontSize: 14, fontWeight: '600', color: '#333', width: 40 },
  monthValues: { flexDirection: 'row', gap: 12 },
  monthText: { fontSize: 12, color: '#888' },
  monthNet: { fontSize: 13, fontWeight: '700', color: '#1F3864' },
});
