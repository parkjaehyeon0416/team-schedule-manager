// ═══════════════════════════════════════════════════════════════
// 📄 src/screens/SiteListScreen.tsx
//   현장 목록 화면
//   - GET /api/sites 목록 표시
//   - POST /api/sites 등록
//   - PUT /api/sites/{id} 수정
//   - DELETE /api/sites/{id} 삭제 (SoftDelete)
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
import { Text, Button, Divider, IconButton, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getSites, createSite, updateSite, deleteSite } from '../api/siteApi';
import type { Site } from '../types/api';
import AppHeader from '../components/AppHeader';
import AddressSearchModal, {
  DaumAddressResult,
} from '../components/AddressSearchModal';

export default function SiteListScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [addressSearchVisible, setAddressSearchVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [address, setAddress] = useState<string>('');
  const [aptName, setAptName] = useState<string>('');
  const [dong, setDong] = useState<string>('');
  const [ho, setHo] = useState<string>('');
  const [areaM2, setAreaM2] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSites();
      setSites(data);
    } catch (e: any) {
      console.error('현장 목록 조회 실패:', e);
      Alert.alert(
        '조회 실패',
        e?.response?.data?.message || '현장 목록을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const openNewModal = () => {
    setEditingId(null);
    setAddress('');
    setAptName('');
    setDong('');
    setHo('');
    setAreaM2('');
    setMemo('');
    setModalVisible(true);
  };

  const openEditModal = (s: Site) => {
    setEditingId(s.id);
    setAddress(s.address ?? '');
    setAptName(s.apt_name ?? '');
    setDong(s.dong ?? '');
    setHo(s.ho ?? '');
    setAreaM2(s.area_m2 ?? '');
    setMemo(s.memo ?? '');
    setModalVisible(true);
  };

  // ★ 다음(카카오) 우편번호 API로 검색한 주소를 선택했을 때 — 수기 입력 대체
  const handleAddressSelect = (result: DaumAddressResult) => {
    setAddress(result.roadAddress || result.jibunAddress);
    if (result.buildingName) {
      setAptName(result.buildingName);
    }
  };

  const handleSave = async () => {
    if (!address.trim()) {
      Alert.alert('입력 오류', '주소를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        address: address.trim(),
        apt_name: aptName.trim() || null,
        dong: dong.trim() || null,
        ho: ho.trim() || null,
        area_m2: areaM2 ? Number(areaM2) : null,
        memo: memo.trim() || null,
      };

      if (editingId) {
        await updateSite(editingId, payload);
      } else {
        await createSite(payload);
      }
      setModalVisible(false);
      await loadSites();
    } catch (e: any) {
      console.error('현장 저장 실패:', e);
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

  const handleDelete = (s: Site) => {
    Alert.alert('현장 삭제', `"${s.address}" 현장을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSite(s.id);
            await loadSites();
          } catch (e: any) {
            console.error('현장 삭제 실패:', e);
            Alert.alert(
              '삭제 실패',
              e?.response?.data?.message || '삭제에 실패했습니다.',
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader leftType="back" title="현장 목록" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
          <Text style={styles.loadingText}>현장 목록 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="현장 목록" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {sites.length === 0 && (
            <View style={styles.emptyBox}>
              <Icon name="home-city-outline" size={56} color="#BBB" />
              <Text style={styles.emptyTitle}>아직 등록한 현장이 없습니다</Text>
              <Text style={styles.emptyHint}>
                현장을 등록해두면{'\n'}
                일정 작성 시 바로 선택할 수 있습니다.
              </Text>
            </View>
          )}

          {sites.map(s => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="home-city" size={20} color="#2E75B6" />
                <Text style={styles.address} numberOfLines={1}>
                  {s.address}
                </Text>
                <IconButton
                  icon="delete-outline"
                  size={20}
                  iconColor="#D32F2F"
                  onPress={() => handleDelete(s)}
                  style={styles.deleteBtn}
                />
              </View>

              {(s.apt_name || s.dong || s.ho || s.area_m2) && (
                <Text style={styles.subText}>
                  {[s.apt_name, s.dong && `${s.dong}동`, s.ho && `${s.ho}호`]
                    .filter(Boolean)
                    .join(' ')}
                  {s.area_m2 ? ` · ${s.area_m2}㎡` : ''}
                </Text>
              )}

              {s.memo && <Text style={styles.memoText}>"{s.memo}"</Text>}

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

        <View style={styles.fabContainer}>
          <Button
            mode="contained"
            onPress={openNewModal}
            icon="plus"
            style={styles.fab}
            contentStyle={styles.fabContent}
            labelStyle={styles.fabLabel}
          >
            새 현장 추가
          </Button>
        </View>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => !saving && setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingId ? '현장 수정' : '새 현장 등록'}
              </Text>

              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={saving}
                  onPress={() => setAddressSearchVisible(true)}
                >
                  <TextInput
                    mode="outlined"
                    label="주소 *"
                    value={address}
                    placeholder="눌러서 주소 검색"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="magnify" />}
                    style={styles.input}
                    disabled={saving}
                  />
                </TouchableOpacity>
                <TextInput
                  mode="outlined"
                  label="아파트/건물명"
                  value={aptName}
                  onChangeText={setAptName}
                  style={styles.input}
                  disabled={saving}
                />
                <View style={styles.rowGroup}>
                  <TextInput
                    mode="outlined"
                    label="동"
                    value={dong}
                    onChangeText={setDong}
                    style={[styles.input, styles.inputHalf]}
                    disabled={saving}
                  />
                  <TextInput
                    mode="outlined"
                    label="호"
                    value={ho}
                    onChangeText={setHo}
                    style={[styles.input, styles.inputHalf]}
                    disabled={saving}
                  />
                </View>
                <TextInput
                  mode="outlined"
                  label="평수 (㎡)"
                  keyboardType="numeric"
                  value={areaM2}
                  onChangeText={setAreaM2}
                  style={styles.input}
                  disabled={saving}
                />
                <TextInput
                  mode="outlined"
                  label="메모"
                  value={memo}
                  onChangeText={setMemo}
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                  disabled={saving}
                />
              </ScrollView>

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

        <AddressSearchModal
          visible={addressSearchVisible}
          onClose={() => setAddressSearchVisible(false)}
          onSelect={handleAddressSelect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
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
  address: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  deleteBtn: {
    margin: 0,
  },
  subText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
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
  input: {
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },

  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
