// ═══════════════════════════════════════════════════════════════
// 📄 src/components/PhotoGrid.tsx
//   ★ v11     신규 — 사진 그리드 (3열 격자, 길게 눌러 삭제)
//   ★ v11.1.1 — 시공 후 사진 중 짝 없는 것에 시각적 배지 추가 (옵션 B)
//   ★ v11.1.1 — 짝 없는 시공 후 길게 누름 시 "짝 지정하기" 메뉴 추가 (옵션 C)
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
  AlertButton,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SiteFile } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';

// ─────────────────────────────────────────────────────────────────
// 화면 가로폭에 맞춰 사진 한 칸 크기 계산
//  Dimensions.get('window').width — 현재 화면 가로 픽셀
//  3열 그리드 + 좌우 16px 여백 + 사이 8px 간격 2개
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 8;
const COLUMNS = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

// ─────────────────────────────────────────────────────────────────
// Props
//  photos       : 표시할 사진 배열 (한 카테고리)
//  onDelete     : 사진 삭제 시 부모에게 알림 (photoId 전달)
//  onPairAssign : ★ v11.1.1 — 짝 지정 요청 시 부모에게 알림 (선택)
//                 부모가 콜백을 주면 짝 없는 시공 후 사진의 길게 누름 메뉴에
//                 "🔗 짝 지정하기" 항목이 자동으로 추가됨
//  onPress      : (선택) 사진 탭 시 호출 — 비교 보기 등 확장용
//  emptyText    : 사진 없을 때 보여줄 문구 (카테고리별 다르게)
// ─────────────────────────────────────────────────────────────────
interface Props {
  photos: SiteFile[];
  onDelete: (photoId: number) => void;
  onPairAssign?: (photo: SiteFile) => void; // ★ v11.1.1
  onPress?: (photo: SiteFile) => void;
  emptyText?: string;
}

export default function PhotoGrid({
  photos,
  onDelete,
  onPairAssign, // ★ v11.1.1
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

  // ─────────────────────────────────────────────────────────────
  // ★ v11.1.1 — 길게 누름 시 사진 종류에 따라 메뉴 동적 구성
  //   • 짝 없는 시공 후 사진 + 부모가 onPairAssign 콜백 제공 → 짝 지정 메뉴 추가
  //   • 그 외 (시공 전/중/기타, 또는 이미 짝 있는 시공 후) → 삭제 메뉴만
  // ─────────────────────────────────────────────────────────────
  const handleLongPress = (photo: SiteFile) => {
    // 짝 지정 메뉴를 보여줄 조건 — 모두 만족해야 함
    const canAssignPair =
      photo.photo_category === 'after' &&
      photo.paired_with_id == null &&
      onPairAssign != null;

    // 메뉴 옵션을 동적으로 구성
    //   AlertButton 타입은 React Native가 제공하는 표준 타입
    const buttons: AlertButton[] = [{ text: '취소', style: 'cancel' }];

    if (canAssignPair) {
      buttons.push({
        text: '🔗 짝 지정하기',
        onPress: () => onPairAssign!(photo),
      });
    }

    buttons.push({
      text: '🗑️ 삭제',
      style: 'destructive',
      onPress: () => onDelete(photo.id),
    });

    Alert.alert('사진 작업', `"${photo.original_name}"`, buttons, {
      cancelable: true,
    });
  };

  // ─── 그리드 렌더 ───
  return (
    <View style={styles.grid}>
      {photos.map((photo, idx) => {
        // 각 행의 마지막 칸은 우측 마진 제거
        const isLastInRow = (idx + 1) % COLUMNS === 0;

        // ★ v11.1.1 — 짝 없음 배지 노출 조건
        //   시공 후 사진(after) + paired_with_id가 NULL일 때만
        const showUnpairedBadge =
          photo.photo_category === 'after' && photo.paired_with_id == null;

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

            {/* ★ v11.1.1 — 짝 없음 배지 (우상단) */}
            {showUnpairedBadge && (
              <View style={styles.unpairedBadge}>
                <Icon name="link-off" size={10} color="#FFF" />
                <Text style={styles.unpairedBadgeText}>짝 없음</Text>
              </View>
            )}

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
  // ★ v11.1.1 — 짝 없음 배지
  unpairedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.85)', // 빨간 톤 — 주의 환기
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  unpairedBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
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
