// ═══════════════════════════════════════════════════════════════
// 📄 PhotoCompareScreen.tsx
//   ★ v11 신규 — 시공 전·후 사진 페어 비교 화면
//   같은 인덱스끼리 매칭 (1번 전 ↔ 1번 후, 2번 전 ↔ 2번 후 ...)
//
//   사용 시나리오:
//   - 고객에게 "비포-애프터" 보고
//   - 가로 스와이프로 페어 이동
//   - 전·후 비교가 즉시 시각화 → 앱의 차별화 1순위 기능
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { getSchedulePhotos } from '../api/schedulesApi';
import type { SiteFile } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';

// ─────────────────────────────────────────────────────────────────
// 화면 가로 = 한 페어의 가로 (스와이프 단위)
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// 페어 데이터 타입
//  before: 시공 전 사진 (없을 수도)
//  after:  시공 후 사진 (없을 수도)
//  index:  몇 번째 페어인지 (0부터)
// ─────────────────────────────────────────────────────────────────
interface PhotoPair {
  index: number;
  before: SiteFile | null;
  after: SiteFile | null;
}

// ─────────────────────────────────────────────────────────────────
// Props (route.params로 들어오는 값)
//  scheduleId: 어느 일정의 사진을 비교할지
//  siteName:   상단 헤더에 표시할 현장 이름 (선택)
// ─────────────────────────────────────────────────────────────────
export default function PhotoCompareScreen({ route }: any) {
  const { scheduleId, siteName } = route.params || {};
  const navigation = useNavigation<any>();

  const [pairs, setPairs] = useState<PhotoPair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // ─── 화면 진입 시 사진 로드 ───
  useFocusEffect(
    useCallback(() => {
      fetchAndPair();
    }, [scheduleId]),
  );

  const fetchAndPair = async () => {
    try {
      setLoading(true);
      const data = await getSchedulePhotos(scheduleId);

      // ★ 페어 매칭 — sort_order 기반 단순 인덱스 매칭
      //   매뉴얼 v11 9.4절 정책: '같은 인덱스끼리 페어'
      //   미래에 description 라벨로 의미 매칭으로 확장 가능
      const before = [...data.before].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const after = [...data.after].sort((a, b) => a.sort_order - b.sort_order);

      const maxLen = Math.max(before.length, after.length);
      const result: PhotoPair[] = [];
      for (let i = 0; i < maxLen; i++) {
        result.push({
          index: i,
          before: before[i] || null,
          after: after[i] || null,
        });
      }
      setPairs(result);
    } catch (e: any) {
      console.error('비교 보기 로드 실패:', e);
      Alert.alert(
        '로드 실패',
        e?.response?.data?.message || '사진을 불러오지 못했습니다.',
        [{ text: '확인', onPress: () => navigation.goBack() }],
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── 가로 스와이프 시 현재 인덱스 갱신 ───
  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  };

  // ─── 로딩 ───
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.loadingText}>비교 사진 준비 중...</Text>
      </View>
    );
  }

  // ─── 페어 0개 ───
  if (pairs.length === 0) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyTitle}>비교할 사진이 없습니다</Text>
        <Text style={styles.emptyText}>
          시공 전·후 사진을 추가하면 자동으로 비교 화면이 만들어져요
        </Text>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // ─── 메인 화면 ───
  return (
    <View style={styles.container}>
      {/* ── 상단 헤더 ── */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {siteName || '비교 보기'}
          </Text>
          <Text style={styles.headerSub}>
            {currentIndex + 1} / {pairs.length}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* ── 가로 스와이프 페어 ── */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {pairs.map(pair => (
          <View key={pair.index} style={styles.page}>
            {/* 시공 전 */}
            <View style={styles.half}>
              <View style={styles.labelBar}>
                <Text style={styles.labelText}>시공 전</Text>
              </View>
              {pair.before ? (
                <Image
                  source={{
                    uri: `${SERVER_BASE_URL}/storage/${pair.before.file_path}`,
                  }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>시공 전 사진 없음</Text>
                </View>
              )}
              {pair.before?.description && (
                <Text style={styles.caption} numberOfLines={2}>
                  {pair.before.description}
                </Text>
              )}
            </View>

            {/* 구분선 */}
            <View style={styles.divider} />

            {/* 시공 후 */}
            <View style={styles.half}>
              <View style={[styles.labelBar, styles.labelBarAfter]}>
                <Text style={styles.labelText}>시공 후</Text>
              </View>
              {pair.after ? (
                <Image
                  source={{
                    uri: `${SERVER_BASE_URL}/storage/${pair.after.file_path}`,
                  }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>시공 후 사진 없음</Text>
                </View>
              )}
              {pair.after?.description && (
                <Text style={styles.caption} numberOfLines={2}>
                  {pair.after.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── 하단 인디케이터 (페이지 점) ── */}
      {pairs.length > 1 && (
        <View style={styles.indicator}>
          {pairs.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: '#000',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  headerSub: { fontSize: 12, color: '#AAA', marginTop: 2 },
  headerRight: { width: 48 }, // 좌측 IconButton과 균형 맞추는 더미

  // 한 페어 = 화면 한 개
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    flexDirection: 'column',
  },
  half: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  divider: { height: 2, backgroundColor: '#1F3864' },

  labelBar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  labelBarAfter: {
    backgroundColor: 'rgba(31, 56, 100, 0.4)', // 네이비 톤 — 시공 후 강조
  },
  labelText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  image: { flex: 1, width: '100%' },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { color: '#666', fontSize: 14 },

  caption: {
    color: '#FFF',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // 하단 인디케이터
  indicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
    marginHorizontal: 3,
  },
  dotActive: { backgroundColor: '#FFF', width: 18 },

  // 로딩 / 빈 상태
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
  },
  loadingText: { color: '#888', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 8,
  },
});
