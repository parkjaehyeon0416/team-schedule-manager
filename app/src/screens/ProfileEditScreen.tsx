/**
 * 프로필 설정 화면 — DESIGN-CANVAS 기준, PROFILE_EDIT.dc.html
 * ★ 디자인은 이름/이메일도 편집 가능해 보이지만 백엔드에 이름·이메일 변경 API가 없어
 *   읽기 전용으로 표시함. "활동 지역/경력/주요 공정/소개"는 User가 아니라 명함(BusinessCard)
 *   데이터라 이 화면에서 프로필(전화/카카오)과 명함 정보를 함께 저장함 — 명함 화면의
 *   "명함 수정"도 이 화면으로 연결됨(디자인 원본의 링크 구조와 동일).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import AppHeader from '../components/AppHeader';
import { useAuthStore } from '../store/authStore';
import { updateProfile, uploadAvatar } from '../api/profileApi';
import { getMyBusinessCard, saveBusinessCard } from '../api/businessCardApi';
import { getWorkTypes } from '../api/workTypesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';
import type { WorkType } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';

const AVATAR_COLORS = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0'];
const AVATAR_FG = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E'];

export default function ProfileEditScreen() {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();

  const [phone, setPhone] = useState(formatPhoneInput(user?.phone ?? ''));
  const [kakaoTalkId, setKakaoTalkId] = useState(user?.kakao_talk_id ?? '');
  const [avatarImagePath, setAvatarImagePath] = useState(user?.avatar_image_path ?? null);
  const [serviceArea, setServiceArea] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [tagline, setTagline] = useState('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    getMyBusinessCard()
      .then(card => {
        if (card) {
          setServiceArea(card.service_area ?? '');
          setYearsExperience(card.years_experience ? String(card.years_experience) : '');
          setTagline(card.tagline ?? '');
          setSelectedTypes(card.specialty ? card.specialty.split(',').map(s => s.trim()).filter(Boolean) : []);
        }
      })
      .catch(() => {});
    getWorkTypes().then(setWorkTypes).catch(() => {});
  }, []);

  if (!user) return null;

  const avatarUri = avatarImagePath ? `${SERVER_BASE_URL}/storage/${avatarImagePath}` : null;
  const avatarIdx = user.id % AVATAR_COLORS.length;

  const toggleType = (name: string) => {
    setSelectedTypes(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setUploadingImage(true);
    try {
      const updated = await uploadAvatar(asset.uri, asset.fileName ?? 'avatar.jpg', asset.type ?? 'image/jpeg');
      setAvatarImagePath(updated.avatar_image_path);
      await updateUser(updated);
    } catch (e: any) {
      Alert.alert('업로드 실패', e?.response?.data?.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        phone: stripPhoneFormatting(phone) || undefined,
        kakao_talk_id: kakaoTalkId.trim() || undefined,
      });
      await updateUser(updated);
      await saveBusinessCard({
        display_name: user.name,
        contact_phone: stripPhoneFormatting(phone) || undefined,
        service_area: serviceArea.trim() || undefined,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
        specialty: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
        tagline: tagline.trim() || undefined,
      });
      Alert.alert('완료', '프로필이 저장되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '프로필 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="프로필 설정" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatarOuter}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[avatarIdx] }]}>
                <Text style={[styles.avatarFallbackText, { color: AVATAR_FG[avatarIdx] }]}>{user.name.charAt(0)}</Text>
              </View>
            )}
            <Pressable style={styles.avatarEditBtn} onPress={handlePickImage} disabled={uploadingImage}>
              <Icon name="camera-outline" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>이름</Text>
          <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
            <Text style={styles.disabledText}>{user.name}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>휴대폰 번호</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={t => setPhone(formatPhoneInput(t))}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>이메일</Text>
          <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
            <Text style={styles.disabledText}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>카카오톡 아이디</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={kakaoTalkId}
              onChangeText={setKakaoTalkId}
              placeholder="카카오톡 검색용 아이디 (선택)"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>활동 지역</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={serviceArea}
              onChangeText={setServiceArea}
              placeholder="예: 인천 서구"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>경력 (년)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={yearsExperience}
              onChangeText={setYearsExperience}
              placeholder="예: 8"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>주요 공정</Text>
          <View style={styles.chipWrap}>
            {workTypes.map(wt => {
              const on = selectedTypes.includes(wt.name);
              return (
                <Pressable key={wt.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleType(wt.name)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{wt.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>소개</Text>
          <TextInput
            style={styles.textarea}
            value={tagline}
            onChangeText={setTagline}
            placeholder="한 줄 소개를 입력하세요"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
          />
        </View>

        <Pressable onPress={handleSave} disabled={saving} style={{ marginTop: 4 }}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  avatarWrap: { alignItems: 'center', paddingTop: spacing.xs },
  avatarOuter: { width: 88, height: 88 },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 33, fontWeight: '700' },
  avatarEditBtn: {
    position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputWrap: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' },
  inputWrapDisabled: { backgroundColor: '#F3F6FA' },
  disabledText: { fontSize: 14, color: colors.textSecondary },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#E8F3FF', borderColor: '#BFDBFB' },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.primaryDark, fontWeight: '700' },

  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 56, textAlignVertical: 'top' },

  saveBtn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
