/**
 * 내 수입 현황 화면
 *
 * 기획서 v2.2의 3.7절 '공수·급여·세금 자동 계산 시스템' 반영
 *
 * ★ 현재: Mock 데이터로 뼈대 UI
 * ★ 다음 단계 (v10): /api/summary/monthly API 연동
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme, Divider } from 'react-native-paper';

// ═══════════════════════════════════════════════
// Mock Data (v10 API 연동 시 교체)
// ═══════════════════════════════════════════════
const MOCK_SUMMARY = {
  year_month: '2026-04',
  total_income: 3_600_000,
  total_expenses: 180_000,
  estimated_tax: 118_800,
  net_income: 3_301_200,
  work_days: 18,
  site_count: 12,
  total_work_units: 20.5,
};

// 원화 포맷 유틸
const formatKRW = (value: number): string => {
  return `₩${value.toLocaleString('ko-KR')}`;
};

export default function MySummaryScreen() {
  const theme = useTheme();
  const [selectedMonth] = useState('2026년 04월');

  // v10에서 실제 API 호출로 교체 예정
  const summary = MOCK_SUMMARY;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ═══ 월 선택 영역 ═══ */}
      <Card style={styles.monthCard}>
        <Card.Content style={styles.monthContent}>
          <Text variant="titleMedium" style={styles.monthLabel}>
            조회 월
          </Text>
          <Button
            mode="outlined"
            icon="calendar"
            onPress={() => {
              // TODO: v10 — 월 선택 모달
            }}
          >
            {selectedMonth}
          </Button>
        </Card.Content>
      </Card>

      {/* ═══ 실수령액 강조 카드 (초록 그라데이션 대신 초록 배경) ═══ */}
      <Card style={[styles.highlightCard, { backgroundColor: '#52C41A' }]}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.highlightLabel}>
            💰 이번 달 실수령액
          </Text>
          <Text variant="displaySmall" style={styles.highlightAmount}>
            {formatKRW(summary.net_income)}
          </Text>
          <Text variant="bodySmall" style={styles.highlightSubtext}>
            수입 - 경비 - 예상세금({formatKRW(summary.estimated_tax)})
          </Text>
        </Card.Content>
      </Card>

      {/* ═══ 수입 / 경비 카드 ═══ */}
      <View style={styles.row}>
        {/* 수입 */}
        <Card style={[styles.halfCard, { marginRight: 6 }]}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.cardLabel}>
              📈 총 수입
            </Text>
            <Text
              variant="titleLarge"
              style={[styles.cardAmount, { color: '#1890FF' }]}
            >
              {formatKRW(summary.total_income)}
            </Text>
          </Card.Content>
        </Card>

        {/* 경비 */}
        <Card style={[styles.halfCard, { marginLeft: 6 }]}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.cardLabel}>
              🧾 총 경비
            </Text>
            <Text
              variant="titleLarge"
              style={[styles.cardAmount, { color: '#FA8C16' }]}
            >
              {formatKRW(summary.total_expenses)}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* ═══ 활동 지표 3개 ═══ */}
      <Card style={styles.metricsCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            📊 이번 달 활동
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text variant="headlineSmall" style={styles.metricValue}>
                {summary.work_days}
              </Text>
              <Text variant="bodySmall" style={styles.metricLabel}>
                근무일
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text variant="headlineSmall" style={styles.metricValue}>
                {summary.site_count}
              </Text>
              <Text variant="bodySmall" style={styles.metricLabel}>
                현장수
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text variant="headlineSmall" style={styles.metricValue}>
                {summary.total_work_units.toFixed(1)}
              </Text>
              <Text variant="bodySmall" style={styles.metricLabel}>
                공수
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* ═══ 안내 배너 — Mock 데이터 상태 표시 ═══ */}
      <Card style={styles.noticeCard}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.noticeText}>
            ⚠️ 현재 표시되는 값은 샘플 데이터입니다.
          </Text>
          <Text variant="bodySmall" style={styles.noticeSubtext}>
            v10에서 실제 공수·단가 입력 기능 추가 예정
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 12,
  },
  monthCard: {
    marginBottom: 12,
  },
  monthContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthLabel: {
    color: '#666',
  },
  highlightCard: {
    marginBottom: 12,
    elevation: 4,
  },
  highlightLabel: {
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  highlightAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  highlightSubtext: {
    color: 'rgba(255,255,255,0.85)',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
  },
  cardLabel: {
    color: '#666',
    marginBottom: 4,
  },
  cardAmount: {
    fontWeight: 'bold',
  },
  metricsCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontWeight: 'bold',
    color: '#1F3864',
  },
  metricLabel: {
    color: '#666',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  noticeCard: {
    backgroundColor: '#FFF3CD',
    marginBottom: 24,
  },
  noticeText: {
    color: '#856404',
    marginBottom: 4,
  },
  noticeSubtext: {
    color: '#856404',
  },
});
