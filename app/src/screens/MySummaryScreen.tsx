/**
 * 내 수입 현황 화면
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Card, Text, Button, Divider, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import { getMonthlySummary } from '../api/schedulesApi';
import type { MonthlySummary } from '../types/api';
import { formatMoney, formatLastCalculated } from '../utils/format';
import YearMonthPicker from '../components/YearMonthPicker';
import AppHeader from '../components/AppHeader';

const formatKRW = (value: number | string): string => {
  return `₩${formatMoney(value)}`;
};

export default function MySummaryScreen({ route }: any) {
  const now = new Date();
  const initialYear = route?.params?.year ?? now.getFullYear();
  const initialMonth = route?.params?.month ?? now.getMonth() + 1;

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);

  const lastTsRef = useRef<number | undefined>(route?.params?._ts);

  const fetchData = useCallback(
    async (fetchYear: number, fetchMonth: number) => {
      try {
        setError(null);
        const result = await getMonthlySummary(fetchYear, fetchMonth);
        setData(result);
      } catch (e: any) {
        setError(e?.response?.data?.message || '집계를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const newTs = route?.params?._ts;
      if (newTs && newTs !== lastTsRef.current) {
        lastTsRef.current = newTs;
        const newYear = route.params.year;
        const newMonth = route.params.month;
        setYear(newYear);
        setMonth(newMonth);
        setLoading(true);
        fetchData(newYear, newMonth);
        return;
      }
      setLoading(true);
      fetchData(year, month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?._ts, fetchData]),
  );

  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month;
    if (month === 1) { newYear = year - 1; newMonth = 12; }
    else { newMonth = month - 1; }
    setYear(newYear); setMonth(newMonth);
    setLoading(true); fetchData(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month;
    if (month === 12) { newYear = year + 1; newMonth = 1; }
    else { newMonth = month + 1; }
    setYear(newYear); setMonth(newMonth);
    setLoading(true); fetchData(newYear, newMonth);
  };

  const handlePickerSelect = (newYear: number, newMonth: number) => {
    setYear(newYear); setMonth(newMonth);
    setPickerVisible(false);
    setLoading(true); fetchData(newYear, newMonth);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(year, month);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="menu" title="내 수입 현황" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1F3864" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  const totalIncome = parseFloat(data?.total_income || '0');
  const totalExpenses = parseFloat(data?.total_expenses || '0');
  const estimatedTax = parseFloat(data?.estimated_tax || '0');
  const netIncome = parseFloat(data?.net_income || '0');
  const totalWorkUnits = parseFloat(data?.total_work_units || '0');
  const workDays = data?.work_days ?? 0;
  const siteCount = data?.site_count ?? 0;

  return (
    <View style={styles.screen}>
      <AppHeader leftType="menu" title="내 수입 현황" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.monthCard}>
          <Card.Content style={styles.monthContent}>
            <IconButton icon="chevron-left" size={28} onPress={handlePrevMonth} />
            <Pressable
              onPress={() => setPickerVisible(true)}
              style={({ pressed }) => [
                styles.monthTextWrap,
                pressed && styles.monthTextPressed,
              ]}
              android_ripple={{ color: '#E8F0FE' }}
            >
              <Text variant="titleMedium" style={styles.monthText}>
                {`${year}년 ${String(month).padStart(2, '0')}월`}
              </Text>
              <Text style={styles.monthHint}>탭하여 변경</Text>
            </Pressable>
            <IconButton icon="chevron-right" size={28} onPress={handleNextMonth} />
          </Card.Content>
        </Card>

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.errorText}>⚠️ {error}</Text>
              <Button mode="text" onPress={onRefresh} compact style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                다시 시도
              </Button>
            </Card.Content>
          </Card>
        )}

        <Card style={[styles.highlightCard, { backgroundColor: '#52C41A' }]}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.highlightLabel}>💰 이번 달 실수령액</Text>
            <Text variant="displaySmall" style={styles.highlightAmount}>{formatKRW(netIncome)}</Text>
            <Text variant="bodySmall" style={styles.highlightSubtext}>
              수입 - 경비 - 예상세금({formatKRW(estimatedTax)})
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Card style={[styles.halfCard, { marginRight: 6, backgroundColor: '#FFFFFF' }]}>
            <Card.Content>
              <Text variant="labelMedium" style={styles.cardLabel}>📈 총 수입</Text>
              <Text variant="titleLarge" style={[styles.cardAmount, { color: '#1890FF' }]}>
                {formatKRW(totalIncome)}
              </Text>
            </Card.Content>
          </Card>
          <Card style={[styles.halfCard, { marginLeft: 6, backgroundColor: '#FFFFFF' }]}>
            <Card.Content>
              <Text variant="labelMedium" style={styles.cardLabel}>🧾 총 경비</Text>
              <Text variant="titleLarge" style={[styles.cardAmount, { color: '#FA8C16' }]}>
                {formatKRW(totalExpenses)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={[styles.metricsCard, { backgroundColor: '#FFFFFF' }]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>📊 이번 달 활동</Text>
            <Divider style={styles.divider} />
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text variant="headlineSmall" style={styles.metricValue}>{workDays}</Text>
                <Text variant="bodySmall" style={styles.metricLabel}>근무일</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text variant="headlineSmall" style={styles.metricValue}>{siteCount}</Text>
                <Text variant="bodySmall" style={styles.metricLabel}>현장수</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text variant="headlineSmall" style={styles.metricValue}>{totalWorkUnits.toFixed(1)}</Text>
                <Text variant="bodySmall" style={styles.metricLabel}>공수</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            마지막 계산: {formatLastCalculated(data?.last_calculated_at)}
          </Text>
          <Button mode="text" icon="refresh" onPress={onRefresh} compact>새로고침</Button>
        </View>
      </ScrollView>

      <YearMonthPicker
        visible={pickerVisible}
        year={year}
        month={month}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 12 },
  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: { marginTop: 8, fontSize: 14, color: '#666' },
  monthCard: { marginBottom: 12, backgroundColor: '#FFFFFF' },
  monthContent: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 0,
  },
  monthTextWrap: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8,
  },
  monthTextPressed: { backgroundColor: '#F0F7FF' },
  monthText: { color: '#1F3864', fontWeight: '600' },
  monthHint: { fontSize: 10, color: '#888', marginTop: 2 },
  errorCard: { backgroundColor: '#FFEBEE', marginBottom: 12 },
  errorText: { color: '#C00000' },
  highlightCard: { marginBottom: 12, elevation: 4 },
  highlightLabel: { color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  highlightAmount: { color: '#FFFFFF', fontWeight: 'bold', marginBottom: 6 },
  highlightSubtext: { color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', marginBottom: 12 },
  halfCard: { flex: 1 },
  cardLabel: { color: '#666', marginBottom: 4 },
  cardAmount: { fontWeight: 'bold' },
  metricsCard: { marginBottom: 12 },
  sectionTitle: { color: '#333', marginBottom: 8 },
  divider: { marginBottom: 12 },
  metricsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontWeight: 'bold', color: '#1F3864' },
  metricLabel: { color: '#666', marginTop: 4 },
  metricDivider: { width: 1, height: 40, backgroundColor: '#E0E0E0' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 4,
    paddingVertical: 8, marginBottom: 24,
  },
  footerText: { color: '#888' },
});