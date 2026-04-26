// ═══════════════════════════════════════════════════════════════
// 📄 PhotoCompareScreen.tsx
//   ★ v11      신규 — 시공 전·후 사진 페어 비교 화면
//   ★ v11.1    paired_with_id 기반 페어 매칭
//   ★ v11.1.1  SafeAreaView 적용
//   ★ v11.1.2  성능 개선 — 이미지 캐싱·축소·스크롤 최적화
//              + 메모리 릭 방어 (가상화 ±0, 화면 떠날 때 강제 정리)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, IconButton, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { getSchedulePhotos } from '../api/schedulesApi';
import type { SiteFile } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ★ v11.1.2 — 화면 크기에 맞춘 이미지 픽셀 크기 (1.5배수 = 망막 디스플레이 대응)
const IMG_W = Math.floor(SCREEN_WIDTH * 1.5);
const IMG_H = Math.floor((SCREEN_HEIGHT / 2) * 1.5);

interface PhotoPair {
  before: SiteFile;
  after: SiteFile;
}

export default function PhotoCompareScreen({ route }: any) {
  const { scheduleId, siteName } = route.params || {};
  const navigation = useNavigation<any>();

  const [pairs, setPairs] = useState<PhotoPair[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // ★ v11.1.2 — 화면 진입 시 fetchAndPair, 떠날 때 메모리 강제 정리
  useFocusEffect(
    useCallback(() => {
      fetchAndPair();

      return () => {
        // 화면 떠날 때 모든 state 초기화 → Image 컴포넌트 unmount → 비트맵 해제
        setPairs([]);
        setCurrentIndex(0);
        setLoading(true);
      };
    }, [scheduleId]),
  );

  const fetchAndPair = async () => {
    try {
      setLoading(true);
      const data = await getSchedulePhotos(scheduleId);

      const beforeMap = new Map<number, SiteFile>();
      data.before.forEach(b => beforeMap.set(b.id, b));

      const result: PhotoPair[] = [];
      data.after.forEach(a => {
        if (a.paired_with_id == null) return;
        const before = beforeMap.get(a.paired_with_id);
        if (!before) return;
        result.push({ before, after: a });
      });

      result.sort((p1, p2) => p1.before.sort_order - p2.before.sort_order);
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

  const handleScroll = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / SCREEN_WIDTH);
      if (idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    },
    [currentIndex],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerBox}>
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.loadingText}>비교 사진 준비 중...</Text>
      </SafeAreaView>
    );
  }

  if (pairs.length === 0) {
    return (
      <SafeAreaView style={styles.centerBox}>
        <Text style={styles.emptyTitle}>비교할 페어가 없습니다</Text>
        <Text style={styles.emptyText}>
          시공 후 사진을 업로드할 때 시공 전 사진과 짝지어 주세요.{'\n'}
          짝지어진 사진만 이 화면에 보여요.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        >
          돌아가기
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor="#FFF"
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
        removeClippedSubviews={true}
        decelerationRate="fast"
        scrollEventThrottle={16}
      >
        {pairs.map((pair, idx) => {
          // ★ v11.1.2 — 메모리 릭 방어: 현재 페이지만 실제 렌더 (±0)
          //   가상화 범위를 0으로 줄여서 동시에 메모리에 올라간 이미지를 최소화
          //   부작용: 스와이프 시 살짝 흰 화면 → 이미지 순으로 보일 수 있음
          //          (대신 메모리 누수 위험 차단이 더 중요)
          const isVisible = idx === currentIndex;

          return (
            <View
              key={`${pair.before.id}-${pair.after.id}`}
              style={styles.page}
            >
              {isVisible ? (
                <ComparePairContent pair={pair} />
              ) : (
                <View style={styles.placeholder} />
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── 하단 인디케이터 ── */}
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
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// ★ v11.1.2 — 페어 콘텐츠 (React.memo로 캐싱)
// ═══════════════════════════════════════════════════════════════
const ComparePairContent = React.memo(({ pair }: { pair: PhotoPair }) => {
  const beforeUri = useMemo(
    () => `${SERVER_BASE_URL}/storage/${pair.before.file_path}`,
    [pair.before.file_path],
  );
  const afterUri = useMemo(
    () => `${SERVER_BASE_URL}/storage/${pair.after.file_path}`,
    [pair.after.file_path],
  );

  return (
    <>
      {/* 시공 전 */}
      <View style={styles.half}>
        <View style={styles.labelBar}>
          <Text style={styles.labelText}>시공 전</Text>
        </View>
        <Image
          source={{
            uri: beforeUri,
            width: IMG_W, // 축소 디코딩 (메모리 절약 핵심)
            height: IMG_H,
            cache: 'force-cache',
          }}
          style={styles.image}
          resizeMode="contain"
          fadeDuration={0} // 페이드인 제거
          progressiveRenderingEnabled // 점진적 디코딩
        />
        {pair.before.description && (
          <Text style={styles.caption} numberOfLines={2}>
            {pair.before.description}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      {/* 시공 후 */}
      <View style={styles.half}>
        <View style={[styles.labelBar, styles.labelBarAfter]}>
          <Text style={styles.labelText}>시공 후</Text>
        </View>
        <Image
          source={{
            uri: afterUri,
            width: IMG_W,
            height: IMG_H,
            cache: 'force-cache',
          }}
          style={styles.image}
          resizeMode="contain"
          fadeDuration={0}
          progressiveRenderingEnabled
        />
        {pair.after.description && (
          <Text style={styles.caption} numberOfLines={2}>
            {pair.after.description}
          </Text>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#000',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  headerSub: { fontSize: 12, color: '#AAA', marginTop: 2 },
  headerRight: { width: 48 },

  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    flexDirection: 'column',
  },
  placeholder: { flex: 1, backgroundColor: '#000' },

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
  labelBarAfter: { backgroundColor: 'rgba(31, 56, 100, 0.4)' },
  labelText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  image: { flex: 1, width: '100%' },

  caption: {
    color: '#FFF',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

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

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
  },
  loadingText: { color: '#888', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});
