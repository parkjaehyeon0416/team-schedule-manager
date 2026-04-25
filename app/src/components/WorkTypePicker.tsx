// ═══════════════════════════════════════════════════════════════
// 📄 src/components/WorkTypePicker.tsx
//   공정 선택 드롭다운 (펼침 카드 방식)
//   - GET /api/work-types 자동 호출
//   - 공정별 color dot + 이름 표시
//   - 선택 시 onChange(id, 전체 객체) 콜백
//   - ★ Modal 안에서도 정상 동작 (Paper Menu 충돌 회피)
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getWorkTypes } from '../api/workTypesApi';
import type { WorkType } from '../types/api';

// ─── Props ───
interface Props {
  value: number | null;
  onChange: (id: number | null, workType: WorkType | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function WorkTypePicker({
  value,
  onChange,
  placeholder = '공정 선택',
  disabled = false,
}: Props) {
  // ─── 상태 ───
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false); // 펼침 여부

  // ─── 공정 목록 가져오기 ───
  useEffect(() => {
    const fetchWorkTypes = async () => {
      try {
        setLoading(true);
        const data = await getWorkTypes();
        setWorkTypes(data);
      } catch (e: any) {
        console.error('공정 목록 조회 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkTypes();
  }, []);

  // ─── 선택된 공정 찾기 ───
  const selected = workTypes.find(wt => wt.id === value);

  // ─── 항목 클릭 핸들러 ───
  const handleSelect = (wt: WorkType) => {
    onChange(wt.id, wt);
    setExpanded(false); // 선택 후 자동 닫기
  };

  // ─── 로딩 표시 ───
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color="#2E75B6" />
        <Text style={styles.loadingText}>공정 불러오는 중...</Text>
      </View>
    );
  }

  // ─── 렌더 ───
  return (
    <View>
      {/* 앵커 (탭하면 펼쳐짐) */}
      <TouchableOpacity
        onPress={() => !disabled && setExpanded(!expanded)}
        style={[styles.anchor, disabled && styles.anchorDisabled]}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.anchorLeft}>
          {selected && (
            <View style={[styles.dot, { backgroundColor: selected.color }]} />
          )}
          <Text style={selected ? styles.selectedText : styles.placeholder}>
            {selected ? selected.name : placeholder}
          </Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#666"
        />
      </TouchableOpacity>

      {/* 펼침 영역 */}
      {expanded && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.scrollArea}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {workTypes.map((wt, idx) => {
              const isSelected = wt.id === value;
              return (
                <React.Fragment key={wt.id}>
                  <TouchableOpacity
                    onPress={() => handleSelect(wt)}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.dot, { backgroundColor: wt.color }]} />
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                      ]}
                    >
                      {wt.name}
                    </Text>
                    {isSelected && (
                      <Icon
                        name="check"
                        size={18}
                        color="#2E75B6"
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                  {idx < workTypes.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 앵커 (선택된 값 표시 영역)
  anchor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  anchorDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  anchorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },

  // 펼침 영역
  dropdown: {
    marginTop: 4,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 3, // Android 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollArea: {
    maxHeight: 280, // 약 6개 항목까지 보임 (스크롤 가능)
  },

  // 항목
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  itemSelected: {
    backgroundColor: '#E8F2FC',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  itemTextSelected: {
    color: '#2E75B6',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },

  // 로딩
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
