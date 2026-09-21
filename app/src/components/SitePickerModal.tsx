// ═══════════════════════════════════════════════════════════════
// 📄 SitePickerModal.tsx
//   일정 등록 화면에서 현장을 선택하거나, 그 자리에서 주소검색으로
//   새 현장을 바로 등록해서 선택할 수 있게 하는 모달.
//   (기존 현장 목록 = SiteListScreen과 동일한 API 재사용)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSites, createSite } from '../api/siteApi';
import type { Site } from '../types/api';
import AddressSearchModal, {
  DaumAddressResult,
} from './AddressSearchModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (site: Site) => void;
}

export default function SitePickerModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [addressSearchVisible, setAddressSearchVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSites();
      setSites(data);
    } catch (e: any) {
      console.error('현장 목록 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleSelect = (site: Site) => {
    onSelect(site);
    onClose();
  };

  // ★ 주소 검색에서 고른 주소로 새 현장을 바로 등록 → 선택까지 한 번에
  const handleAddressSelect = async (result: DaumAddressResult) => {
    setCreating(true);
    try {
      const site = await createSite({
        address: result.roadAddress || result.jibunAddress,
        apt_name: result.buildingName || null,
      });
      handleSelect(site);
    } catch (e: any) {
      Alert.alert(
        '현장 등록 실패',
        e?.response?.data?.message || '현장을 등록하지 못했습니다.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>현장 선택</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newSiteBtn}
          onPress={() => setAddressSearchVisible(true)}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#1F3864" />
          ) : (
            <Text style={styles.newSiteBtnText}>🔍 주소 검색으로 새 현장 등록</Text>
          )}
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2E75B6" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sites.length === 0 && (
              <Text style={styles.emptyText}>등록된 현장이 없습니다. 위에서 주소를 검색해 새로 등록해보세요.</Text>
            )}
            {sites.map(site => (
              <TouchableOpacity
                key={site.id}
                style={styles.siteRow}
                onPress={() => handleSelect(site)}
              >
                <Text style={styles.siteAddress} numberOfLines={1}>
                  {site.address}
                </Text>
                {(site.apt_name || site.dong || site.ho) && (
                  <Text style={styles.siteSub} numberOfLines={1}>
                    {[site.apt_name, site.dong && `${site.dong}동`, site.ho && `${site.ho}호`]
                      .filter(Boolean)
                      .join(' ')}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <AddressSearchModal
          visible={addressSearchVisible}
          onClose={() => setAddressSearchVisible(false)}
          onSelect={handleAddressSelect}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  closeText: { fontSize: 14, color: '#2E75B6', fontWeight: '600' },

  newSiteBtn: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#EAF0FB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newSiteBtnText: { color: '#1F3864', fontSize: 14, fontWeight: '700' },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 8 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 24 },

  siteRow: {
    backgroundColor: '#F7F8FA',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  siteAddress: { fontSize: 14.5, fontWeight: '700', color: '#222' },
  siteSub: { fontSize: 12, color: '#888', marginTop: 3 },
});
