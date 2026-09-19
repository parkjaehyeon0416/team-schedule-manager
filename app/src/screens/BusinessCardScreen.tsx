// ═══════════════════════════════════════════════════════════════
// 📄 BusinessCardScreen.tsx — 내 명함 (★ v14 백엔드/웹에 이어 모바일 연동 ★ 이번 작업)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { Text, Button, TextInput, Divider, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import {
  getMyBusinessCard,
  saveBusinessCard,
  getPublicCardUrl,
} from '../api/businessCardApi';
import type { BusinessCard } from '../types/api';
import AppHeader from '../components/AppHeader';

export default function BusinessCardScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [card, setCard] = useState<BusinessCard | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const applyCard = (c: BusinessCard | null) => {
    setCard(c);
    if (c) {
      setDisplayName(c.display_name ?? '');
      setJobTitle(c.job_title ?? '');
      setYearsExperience(c.years_experience ? String(c.years_experience) : '');
      setServiceArea(c.service_area ?? '');
      setSpecialty(c.specialty ?? '');
      setContactPhone(c.contact_phone ?? '');
      setTagline(c.tagline ?? '');
      setIsPublic(c.is_public);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const c = await getMyBusinessCard();
      applyCard(c);
    } catch (e: any) {
      console.error('명함 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '명함 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('입력 오류', '표시 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveBusinessCard({
        display_name: displayName.trim(),
        job_title: jobTitle.trim() || undefined,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
        service_area: serviceArea.trim() || undefined,
        specialty: specialty.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        tagline: tagline.trim() || undefined,
        is_public: isPublic,
      });
      applyCard(saved);
      Alert.alert('저장 완료', '명함이 저장되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '명함 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    if (!card) return;
    const url = getPublicCardUrl(card.share_code);
    Share.share({ message: `${displayName} 기사 명함\n${url}` }).catch(() => {});
  };

  const handlePreview = () => {
    if (!card) return;
    Linking.openURL(getPublicCardUrl(card.share_code)).catch(() => {
      Alert.alert('열기 실패', '명함 페이지를 열 수 없습니다.');
    });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="내 명함" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2E75B6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="내 명함" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          고객이 지인에게 추천할 때 바로 전달할 수 있는 명함입니다. 최근 업로드한 시공 사진
          최대 3장이 자동으로 포트폴리오에 표시됩니다.
        </Text>

        <TextInput
          mode="outlined"
          label="표시 이름 *"
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="직함"
          placeholder="예: 도배 전문"
          value={jobTitle}
          onChangeText={setJobTitle}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="경력(년)"
          keyboardType="numeric"
          value={yearsExperience}
          onChangeText={setYearsExperience}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="활동 지역"
          placeholder="예: 서울/경기"
          value={serviceArea}
          onChangeText={setServiceArea}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="전문 분야"
          placeholder="예: 합지·실크·천장도배"
          value={specialty}
          onChangeText={setSpecialty}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="연락처"
          placeholder="예: 010-1234-5678"
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={setContactPhone}
          style={styles.input}
          disabled={saving}
        />
        <TextInput
          mode="outlined"
          label="한 줄 소개"
          value={tagline}
          onChangeText={setTagline}
          multiline
          numberOfLines={2}
          style={styles.input}
          disabled={saving}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>공개 여부</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} disabled={saving} />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          {card ? '명함 저장' : '명함 만들기'}
        </Button>

        {card && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.section}>공유</Text>
            <Text style={styles.shareUrl}>{getPublicCardUrl(card.share_code)}</Text>
            <View style={styles.shareRow}>
              <Button mode="outlined" icon="eye-outline" onPress={handlePreview} style={styles.shareBtn}>
                미리보기
              </Button>
              <Button mode="contained" icon="share-variant" onPress={handleShare} style={styles.shareBtn}>
                공유하기
              </Button>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{card.view_count}</Text>
                <Text style={styles.statLabel}>누적 조회</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{card.monthly_view_count}</Text>
                <Text style={styles.statLabel}>이번 달 조회</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 16, paddingBottom: 60 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hint: { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 19 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: { fontSize: 15, color: '#333' },

  saveBtn: { marginBottom: 8 },

  divider: { marginVertical: 20 },
  section: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 8 },
  shareUrl: { fontSize: 13, color: '#2E75B6', marginBottom: 12 },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1 },

  statsRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1F3864' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
});
