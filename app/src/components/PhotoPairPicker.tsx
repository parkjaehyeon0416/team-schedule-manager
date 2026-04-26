// ═══════════════════════════════════════════════════════════════
// 📄 src/components/PhotoPairPicker.tsx
//   ★ v11.1 신규 — 시공 후 사진 업로드 시 짝(시공 전 사진) 선택 모달
//
//   사용 흐름:
//     1) ScheduleDetailScreen이 갤러리 사진 선택 후
//     2) 카테고리가 'after'면 이 모달을 띄움
//     3) 사용자가 시공 전 사진 1개 선택 → onSelect(photo.id) 콜백
//     4) "짝 없이 업로드" 버튼도 제공 → onSelect(null)
//     5) 취소 → onCancel
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Button } from 'react-native-paper';
import type { SiteFile } from '../types/api';
import { SERVER_BASE_URL } from '../api/axiosInstance';

// ─────────────────────────────────────────────────────────────────
// 모달 안 사진 카드의 크기 계산 — 화면의 절반 폭, 정사각형
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2; // 좌우 16px + 카드 사이 12px

interface Props {
  visible: boolean;
  beforePhotos: SiteFile[]; // 시공 전 사진 전체
  alreadyPairedIds: number[]; // 이미 짝지어진 시공 전 사진 id 배열
  onSelect: (pairedWithId: number | null) => void; // 선택 결과 (null = 짝 없이 업로드)
  onCancel: () => void;
}

export default function PhotoPairPicker({
  visible,
  beforePhotos,
  alreadyPairedIds,
  onSelect,
  onCancel,
}: Props) {
  // ★ 짝지을 수 있는 시공 전 사진 = 아직 짝이 없는 사진만
  const availablePhotos = beforePhotos.filter(
    p => !alreadyPairedIds.includes(p.id),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      {/* 반투명 배경 — 탭 시 취소 */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        {/* 시트 본문 — 내부 탭은 이벤트 전파 차단 */}
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={() => {}} // 빈 콜백 — 이벤트 전파 차단
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>짝지을 시공 전 사진 선택</Text>
            <Text style={styles.subtitle}>
              방금 찍은 시공 후 사진과 같은 위치를 찍은 시공 전 사진을
              골라주세요
            </Text>
          </View>

          {/* 본문 */}
          {availablePhotos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                짝을 지을 시공 전 사진이 없습니다
              </Text>
              <Text style={styles.emptySub}>
                {beforePhotos.length === 0
                  ? '먼저 시공 전 사진을 업로드해 주세요.'
                  : '모든 시공 전 사진이 이미 다른 시공 후와 짝지어져 있어요.'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {availablePhotos.map((p, idx) => {
                const isLastInRow = idx % 2 === 1;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.card,
                      { width: CARD_WIDTH, height: CARD_WIDTH },
                      !isLastInRow && { marginRight: 12 },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => onSelect(p.id)}
                  >
                    <Image
                      source={{
                        uri: `${SERVER_BASE_URL}/storage/${p.file_path}`,
                      }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                    {p.description ? (
                      <View style={styles.cardCaption}>
                        <Text style={styles.cardCaptionText} numberOfLines={1}>
                          {p.description}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 하단 버튼 영역 */}
          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={() => onSelect(null)}
              style={styles.skipBtn}
            >
              짝 없이 업로드
            </Button>
            <Button mode="outlined" onPress={onCancel} style={styles.cancelBtn}>
              취소
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F3864',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    rowGap: 12,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cardCaptionText: {
    color: '#FFF',
    fontSize: 11,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skipBtn: { flex: 1 },
  cancelBtn: { flex: 1 },
});
