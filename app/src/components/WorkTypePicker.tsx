// ═══════════════════════════════════════════════════════════════
// 📄 src/components/WorkTypePicker.tsx
//   공정 선택 드롭다운 (펼침 카드 방식)
//   - GET /api/work-types 자동 호출
//   - 공정별 color dot + 이름 표시
//   - 선택 시 onChange(id, 전체 객체) 콜백
//   - ★ Modal 안에서도 정상 동작 (Paper Menu 충돌 회피)
//   - ★ 커스텀 공정 추가 — 목록 맨 아래 "+ 새 공정 추가"로 인라인 등록
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getWorkTypes, createWorkType } from '../api/workTypesApi';
import { useAuthStore } from '../store/authStore';
import type { WorkType } from '../types/api';

const COLOR_SWATCHES = [
  '#FF5722', '#2196F3', '#4CAF50', '#9C27B0',
  '#795548', '#00BCD4', '#FFC107', '#607D8B',
];

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
  const user = useAuthStore(s => s.user);
  const hasTeam = !!user?.team_id;

  // ─── 상태 ───
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false); // 펼침 여부

  // ─── 새 공정 추가 폼 상태 ───
  const [addingNew, setAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newColor, setNewColor] = useState<string>(COLOR_SWATCHES[0]);
  const [newIsPersonal, setNewIsPersonal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

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

  // ─── 공정 목록 가져오기 ───
  useEffect(() => {
    fetchWorkTypes();
  }, []);

  // ─── 선택된 공정 찾기 ───
  const selected = workTypes.find(wt => wt.id === value);

  // ─── 항목 클릭 핸들러 ───
  const handleSelect = (wt: WorkType) => {
    onChange(wt.id, wt);
    setExpanded(false); // 선택 후 자동 닫기
  };

  const openAddForm = () => {
    setNewName('');
    setNewColor(COLOR_SWATCHES[0]);
    setNewIsPersonal(!hasTeam);
    setAddingNew(true);
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) {
      Alert.alert('입력 오류', '공정 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const created = await createWorkType({
        name: newName.trim(),
        color: newColor,
        is_personal: hasTeam ? newIsPersonal : true,
      });
      await fetchWorkTypes();
      setAddingNew(false);
      handleSelect(created);
    } catch (e: any) {
      Alert.alert(
        '추가 실패',
        e?.response?.data?.message || '공정을 추가하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
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
                  <Divider />
                </React.Fragment>
              );
            })}

            {/* ── 새 공정 추가 ── */}
            {!addingNew ? (
              <TouchableOpacity
                onPress={openAddForm}
                style={styles.addRow}
                activeOpacity={0.6}
              >
                <Icon name="plus" size={18} color="#2E75B6" />
                <Text style={styles.addRowText}>새 공정 추가</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.addForm}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="공정 이름 (예: 도장)"
                  placeholderTextColor="#999"
                  style={styles.addInput}
                  editable={!saving}
                />
                <View style={styles.swatchRow}>
                  {COLOR_SWATCHES.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setNewColor(c)}
                      style={[
                        styles.swatch,
                        { backgroundColor: c },
                        newColor === c && styles.swatchActive,
                      ]}
                    />
                  ))}
                </View>
                {hasTeam && (
                  <TouchableOpacity
                    onPress={() => setNewIsPersonal(v => !v)}
                    style={styles.personalToggleRow}
                  >
                    <Icon
                      name={newIsPersonal ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={18}
                      color="#2E75B6"
                    />
                    <Text style={styles.personalToggleText}>
                      나만 쓰는 개인 공정으로 추가 (끄면 팀 전체 공정)
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={styles.addFormBtnRow}>
                  <TouchableOpacity
                    onPress={() => setAddingNew(false)}
                    style={styles.addFormCancelBtn}
                    disabled={saving}
                  >
                    <Text style={styles.addFormCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveNew}
                    style={styles.addFormSaveBtn}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addFormSaveText}>추가</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    maxHeight: 340, // 새 공정 추가 행까지 고려해 여유
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

  // 새 공정 추가
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FAFBFC',
  },
  addRowText: { fontSize: 14, color: '#2E75B6', fontWeight: '600' },
  addForm: {
    padding: 14,
    backgroundColor: '#FAFBFC',
    gap: 10,
  },
  addInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#1F3864' },
  personalToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personalToggleText: { flex: 1, fontSize: 12, color: '#666' },
  addFormBtnRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addFormCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
  },
  addFormCancelText: { fontSize: 13, color: '#555', fontWeight: '600' },
  addFormSaveBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 4,
    backgroundColor: '#1F3864',
  },
  addFormSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' },

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
