// ═══════════════════════════════════════════════════════════════
// 📄 src/screens/WageSettingsScreen.tsx
//   내 단가 프로파일 화면
//   - GET /api/wage-settings 목록 표시
//   - POST /api/wage-settings 추가/수정 (updateOrCreate)
//   - DELETE /api/wage-settings/{id} 삭제 (SoftDelete)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Divider, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getWageSettings,
  saveWageSetting,
  deleteWageSetting,
} from '../api/wageSettingsApi';
import type { WageSetting } from '../types/api';
import { formatMoney } from '../utils/format';
import WorkTypePicker from '../components/WorkTypePicker';
import WageInputForm from '../components/WageInputForm';

export default function WageSettingsScreen() {
  // ─────────────────────────────────────────────────────────
  // [1] 상태 관리
  // ─────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<WageSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 모달 관련
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 모달 폼 상태
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<number | null>(
    null,
  );
  const [wage, setWage] = useState<number>(0);
  const [workUnits, setWorkUnits] = useState<number>(1.0);
  const [memo, setMemo] = useState<string>('');

  // ─────────────────────────────────────────────────────────
  // [2] 목록 조회
  // ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWageSettings();
      setSettings(data);
    } catch (e: any) {
      console.error('단가 목록 조회 실패:', e);
      Alert.alert(
        '조회 실패',
        e?.response?.data?.message || '단가 목록을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ─────────────────────────────────────────────────────────
  // [3] 모달 열기 (신규 vs 수정)
  // ─────────────────────────────────────────────────────────
  const openNewModal = () => {
    setEditingId(null);
    setSelectedWorkTypeId(null);
    setWage(0);
    setWorkUnits(1.0);
    setMemo('');
    setModalVisible(true);
  };

  const openEditModal = (s: WageSetting) => {
    setEditingId(s.id);
    setSelectedWorkTypeId(s.work_type_id);
    setWage(parseFloat(s.default_wage));
    setWorkUnits(parseFloat(s.default_work_units));
    setMemo(s.memo ?? '');
    setModalVisible(true);
  };

  // ─────────────────────────────────────────────────────────
  // [4] 저장 (POST /api/wage-settings)
  // ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    // 클라이언트 검증
    if (!selectedWorkTypeId) {
      Alert.alert('입력 오류', '공정을 선택해주세요.');
      return;
    }
    if (wage <= 0) {
      Alert.alert('입력 오류', '단가를 0원보다 크게 입력해주세요.');
      return;
    }
    if (workUnits <= 0) {
      Alert.alert('입력 오류', '공수를 0보다 크게 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await saveWageSetting({
        work_type_id: selectedWorkTypeId,
        default_wage: wage,
        default_work_units: workUnits,
        memo: memo.trim() || null,
      });
      setModalVisible(false);
      await loadSettings(); // 목록 새로고침
    } catch (e: any) {
      console.error('단가 저장 실패:', e);
      if (e?.response?.status === 422) {
        const errors = e?.response?.data?.errors || {};
        const firstError = Object.values(errors)[0] as string[] | undefined;
        Alert.alert('입력 오류', firstError?.[0] || '입력값을 확인해주세요.');
      } else {
        Alert.alert(
          '저장 실패',
          e?.response?.data?.message || '저장에 실패했습니다.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // [5] 삭제 (DELETE /api/wage-settings/{id})
  // ─────────────────────────────────────────────────────────
  const handleDelete = (s: WageSetting) => {
    Alert.alert(
      '단가 삭제',
      `${s.work_type?.name ?? '이 공정'} 단가 설정을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWageSetting(s.id);
              await loadSettings();
            } catch (e: any) {
              console.error('단가 삭제 실패:', e);
              Alert.alert(
                '삭제 실패',
                e?.response?.data?.message || '삭제에 실패했습니다.',
              );
            }
          },
        },
      ],
    );
  };

  // ─────────────────────────────────────────────────────────
  // [6] 렌더 — 로딩 상태
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#2E75B6" />
        <Text style={styles.loadingText}>단가 목록 불러오는 중...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────
  // [7] 렌더 — 메인
  // ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 빈 상태 안내 */}
        {settings.length === 0 && (
          <View style={styles.emptyBox}>
            <Icon name="tag-multiple-outline" size={56} color="#BBB" />
            <Text style={styles.emptyTitle}>아직 등록한 단가가 없습니다</Text>
            <Text style={styles.emptyHint}>
              공정별 기본 단가를 등록하면{'\n'}
              일정 작성 시 자동으로 채워집니다.
            </Text>
          </View>
        )}

        {/* 단가 카드 목록 */}
        {settings.map(s => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: s.work_type?.color ?? '#CCC' },
                ]}
              />
              <Text style={styles.workTypeName}>
                {s.work_type?.name ?? '공정 정보 없음'}
              </Text>
              <IconButton
                icon="delete-outline"
                size={20}
                iconColor="#D32F2F"
                onPress={() => handleDelete(s)}
                style={styles.deleteBtn}
              />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.wageRow}>
                <Icon name="currency-krw" size={16} color="#666" />
                <Text style={styles.wageText}>
                  {formatMoney(s.default_wage)}원
                </Text>
                <Text style={styles.separator}>·</Text>
                <Icon name="counter" size={16} color="#666" />
                <Text style={styles.unitsText}>
                  {parseFloat(s.default_work_units).toFixed(1)}공수
                </Text>
              </View>

              {s.memo && <Text style={styles.memoText}>"{s.memo}"</Text>}
            </View>

            <Divider style={styles.cardDivider} />

            <TouchableOpacity
              onPress={() => openEditModal(s)}
              style={styles.editBtn}
            >
              <Icon name="pencil-outline" size={16} color="#2E75B6" />
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* 하단 고정 FAB */}
      <View style={styles.fabContainer}>
        <Button
          mode="contained"
          onPress={openNewModal}
          icon="plus"
          style={styles.fab}
          contentStyle={styles.fabContent}
          labelStyle={styles.fabLabel}
        >
          새 공정 단가 추가
        </Button>
      </View>

      {/* 추가/수정 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? '단가 수정' : '새 단가 등록'}
            </Text>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* 공정 선택 */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Icon name="palette" size={18} color="#2E75B6" />
                  <Text style={styles.label}>공정 *</Text>
                </View>
                <WorkTypePicker
                  value={selectedWorkTypeId}
                  onChange={id => setSelectedWorkTypeId(id)}
                  disabled={saving}
                />
              </View>

              {/* 단가 + 공수 + 메모 폼 */}
              <WageInputForm
                defaultWage={wage}
                defaultWorkUnits={workUnits}
                memo={memo}
                onChangeWage={setWage}
                onChangeWorkUnits={setWorkUnits}
                onChangeMemo={setMemo}
                disabled={saving}
              />
            </ScrollView>

            {/* 모달 버튼 */}
            <View style={styles.modalBtnRow}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={styles.modalBtn}
                disabled={saving}
              >
                취소
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.modalBtn}
                loading={saving}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#888', fontSize: 14 },

  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  emptyBox: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  workTypeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  deleteBtn: {
    margin: 0,
  },

  cardBody: {
    marginTop: 10,
    gap: 6,
  },
  wageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wageText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginLeft: 2,
  },
  separator: {
    fontSize: 14,
    color: '#CCC',
    marginHorizontal: 6,
  },
  unitsText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 2,
  },
  memoText: {
    fontSize: 13,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 4,
  },

  cardDivider: {
    marginVertical: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  editBtnText: {
    color: '#2E75B6',
    fontSize: 14,
    fontWeight: '600',
  },

  fabContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  fab: {
    borderRadius: 10,
  },
  fabContent: {
    paddingVertical: 6,
  },
  fabLabel: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
