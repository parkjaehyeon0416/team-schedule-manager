// ═══════════════════════════════════════════════════════════════
// 📄 src/components/PhotoCategoryTabs.tsx
//   ★ v11 신규 — 사진 카테고리 4탭 (시공 전/중/후/기타)
//   각 탭에 사진 개수 뱃지 표시, 탭하면 부모에게 onChange 콜백 전달
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { PhotoCategory } from '../types/api';

// ─────────────────────────────────────────────────────────────────
// Props 타입 정의
//  current : 현재 선택된 카테고리 (부모가 관리)
//  counts  : 각 카테고리별 사진 개수 (백엔드 응답의 counts 그대로)
//  onChange: 사용자가 탭을 눌렀을 때 호출되는 콜백
// ─────────────────────────────────────────────────────────────────
interface Props {
  current: PhotoCategory;
  counts: { before: number; during: number; after: number; other: number };
  onChange: (category: PhotoCategory) => void;
}

// ─────────────────────────────────────────────────────────────────
// 4개 탭의 메타데이터를 한 곳에 정의
//  - 컴포넌트 외부에 둬서 매 렌더링마다 재생성되지 않도록 (성능)
// ─────────────────────────────────────────────────────────────────
const TABS: { key: PhotoCategory; label: string }[] = [
  { key: 'before', label: '시공 전' },
  { key: 'during', label: '시공 중' },
  { key: 'after', label: '시공 후' },
  { key: 'other', label: '기타' },
];

export default function PhotoCategoryTabs({
  current,
  counts,
  onChange,
}: Props) {
  return (
    <View style={styles.row}>
      {TABS.map(t => {
        const active = current === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {t.label}
            </Text>
            <Text style={[styles.count, active && styles.countActive]}>
              {counts[t.key]}
            </Text>
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
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1F3864', // 네이비 — 일관된 브랜드 컬러
  },
  label: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  labelActive: {
    color: '#1F3864',
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 2,
  },
  countActive: {
    color: '#1F3864',
  },
});
