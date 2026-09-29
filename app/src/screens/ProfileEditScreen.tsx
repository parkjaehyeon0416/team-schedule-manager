// ═══════════════════════════════════════════════════════════════
// 📄 ProfileEditScreen.tsx — 내 프로필 설정 (★ v18.23 신규)
//   아바타 색상/이미지, 연락처(전화번호), 카카오톡 아이디를 설정.
//   여기서 저장한 정보는 같은 팀 사람들이 "팀 관리" 화면에서 볼 수 있음.
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button, Avatar, ActivityIndicator } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuthStore } from '../store/authStore';
import { updateProfile, uploadAvatar, deleteAvatar } from '../api/profileApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { formatPhoneInput, stripPhoneFormatting } from '../utils/phone';
import AppHeader from '../components/AppHeader';

const AVATAR_COLORS = [
  '#1F3864', '#2E75B6', '#4CAF50', '#E67E22',
  '#C0392B', '#8E44AD', '#16A085', '#7F8C8D',
];

export default function ProfileEditScreen() {
  const { user, updateUser } = useAuthStore();

  const [phone, setPhone] = useState(formatPhoneInput(user?.phone ?? ''));
  const [kakaoTalkId, setKakaoTalkId] = useState(user?.kakao_talk_id ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color ?? '#1F3864');
  const [avatarImagePath, setAvatarImagePath] = useState(user?.avatar_image_path ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!user) return null;

  const avatarUri = avatarImagePath ? `${SERVER_BASE_URL}/storage/${avatarImagePath}` : null;

  const handlePickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploadingImage(true);
    try {
      const updated = await uploadAvatar(
        asset.uri,
        asset.fileName ?? 'avatar.jpg',
        asset.type ?? 'image/jpeg',
      );
      setAvatarImagePath(updated.avatar_image_path);
      await updateUser(updated);
      Alert.alert('완료', '프로필 이미지가 등록되었습니다.');
    } catch (e: any) {
      Alert.alert('업로드 실패', e?.response?.data?.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert('이미지 삭제', '프로필 이미지를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await deleteAvatar();
            setAvatarImagePath(null);
            await updateUser(updated);
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        phone: stripPhoneFormatting(phone) || undefined,
        kakao_talk_id: kakaoTalkId.trim() || undefined,
        avatar_color: avatarColor,
      });
      await updateUser(updated);
      Alert.alert('완료', '프로필이 저장되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', e?.response?.data?.message || '프로필 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="프로필 설정" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarBox}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Avatar.Text
              size={90}
              label={user.name.charAt(0)}
              style={{ backgroundColor: avatarColor }}
            />
          )}
          {uploadingImage && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.avatarActions}>
          <Button mode="outlined" onPress={handlePickImage} disabled={uploadingImage}>
            사진 등록
          </Button>
          {avatarImagePath && (
            <Button
              mode="text"
              textColor="#C0392B"
              onPress={handleRemoveImage}
              disabled={uploadingImage}
            >
              사진 삭제
            </Button>
          )}
        </View>

        {!avatarUri && (
          <>
            <Text style={styles.label}>아바타 색상 (사진 없을 때 표시)</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    avatarColor === c && styles.colorSwatchSelected,
                  ]}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>연락처</Text>
        <TextInput
          mode="outlined"
          value={phone}
          onChangeText={t => setPhone(formatPhoneInput(t))}
          placeholder="010-1234-5678"
          keyboardType="phone-pad"
          maxLength={13}
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          style={styles.input}
        />

        <Text style={styles.label}>카카오톡 아이디</Text>
        <TextInput
          mode="outlined"
          value={kakaoTalkId}
          onChangeText={setKakaoTalkId}
          placeholder="카카오톡 검색용 아이디 (선택)"
          autoCapitalize="none"
          textColor="#222222"
          outlineColor="#CCCCCC"
          activeOutlineColor="#1F3864"
          style={styles.input}
        />
        <Text style={styles.hint}>
          연락처와 카카오톡 아이디는 같은 팀 소속인 사람들에게만 보여집니다.
        </Text>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          저장
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 20, paddingBottom: 60 },
  avatarBox: { alignSelf: 'center', marginBottom: 12 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8, marginTop: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchSelected: { borderColor: '#222' },
  input: { backgroundColor: '#fff', marginBottom: 4 },
  hint: { fontSize: 12, color: '#999', marginTop: 6, marginBottom: 24, lineHeight: 17 },
  saveBtn: { marginTop: 8 },
});
