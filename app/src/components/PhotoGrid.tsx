// ═══════════════════════════════════════════════════════════════
// 📄 src/components/PhotoGrid.tsx
//   ★ v11 신규 — 사진 그리드 (3열 격자, 길게 눌러 삭제)
//   부모가 사진 배열을 내려주면 카드 형태로 표시
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import type { SiteFile } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';

// ─────────────────────────────────────────────────────────────────
// 화면 가로폭에 맞춰 사진 한 칸 크기 계산
//  Dimensions.get('window').width — 현재 화면 가로 픽셀
//  3열 그리드 + 좌우 16px 여백 + 사이 8px 간격 2개 = 16*2 + 8*2
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 8;
const COLUMNS = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

// ─────────────────────────────────────────────────────────────────
// Props
//  photos      : 표시할 사진 배열 (한 카테고리)
//  onDelete    : 사진 삭제 시 부모에게 알림 (photoId 전달)
//  onPress     : (선택) 사진 탭 시 호출 — 비교 보기 화면 열 때 등
//  emptyText   : 사진 없을 때 보여줄 문구 (카테고리별 다르게)
// ─────────────────────────────────────────────────────────────────
interface Props {
  photos: SiteFile[];
  onDelete: (photoId: number) => void;
  onPress?: (photo: SiteFile) => void;
  emptyText?: string;
}

export default function PhotoGrid({
  photos,
  onDelete,
  onPress,
  emptyText = '아직 등록된 사진이 없습니다',
}: Props) {
  // ─── 빈 상태 ───
  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  // ─── 길게 눌러 삭제 — 확인 다이얼로그 ───
  const handleLongPress = (photo: SiteFile) => {
    Alert.alert(
      '사진 삭제',
      `"${photo.original_name}"을(를) 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete(photo.id),
        },
      ],
      { cancelable: true },
    );
  };

  // ─── 그리드 렌더 ───
  return (
    <View style={styles.grid}>
      {photos.map((photo, idx) => {
        // 각 행의 마지막 칸은 우측 마진 제거
        const isLastInRow = (idx + 1) % COLUMNS === 0;
        return (
          <TouchableOpacity
            key={photo.id}
            style={[
              styles.item,
              { width: ITEM_SIZE, height: ITEM_SIZE },
              !isLastInRow && { marginRight: GAP },
            ]}
            onPress={() => onPress?.(photo)}
            onLongPress={() => handleLongPress(photo)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: `${SERVER_BASE_URL}/storage/${photo.file_path}` }}
              style={styles.image}
              resizeMode="cover"
            />
            {/* 캡션이 있으면 하단에 반투명 오버레이로 표시 */}
            {photo.description ? (
              <View style={styles.captionWrap}>
                <Text style={styles.captionText} numberOfLines={1}>
                  {photo.description}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    rowGap: GAP, // 같은 열 카드 간 세로 간격 (RN 0.71+)
  },
  item: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  captionText: {
    color: '#FFF',
    fontSize: 11,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});
