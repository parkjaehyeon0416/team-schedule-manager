/**
 * 고객 문의 작성 — DESIGN-CANVAS 기준, INQUIRY_CREATE.dc.html (★ v18.43)
 * 디자인에 없는 "사진 첨부(최대 3장)"는 운영자 화면의 첨부 표시에 맞춰 추가함(사용자 확인 2026-10-06).
 * "더 궁금해요"(문의 상세)에서 오면 제목·유형이 미리 채워짐.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Image, PermissionsAndroid, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { createInquiry, INQUIRY_CATEGORIES } from '../api/inquiryApi';
import type { InquiryCategory, InquiryPhoto } from '../api/inquiryApi';
import { pickImage } from '../utils/pickImage';
import { APP_VERSION } from '../constants/appVersion';
import { colors, spacing } from '../theme/designTokens';

const MAX_LEN = 1000;
const MAX_PHOTOS = 3;

// 휴대폰 알림이 허용돼 있는지 (운영자가 "알림 수신"으로 참고)
async function pushAllowed(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return null;
  if (Platform.Version < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export default function InquiryCreateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [category, setCategory] = useState<InquiryCategory>(route.params?.category ?? 'usage');
  const [title, setTitle] = useState<string>(route.params?.title ?? '');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<InquiryPhoto[]>([]);
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);

  const addPhoto = async () => {
    const asset = await pickImage();
    if (!asset?.uri) return;
    setPhotos(prev => [...prev, { uri: asset.uri!, name: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg' }].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    if (!title.trim()) return Alert.alert('입력 확인', '문의 제목을 입력해주세요.');
    if (!content.trim()) return Alert.alert('입력 확인', '문의 내용을 입력해주세요.');
    setSending(true);
    try {
      const { id } = await createInquiry({
        category, title: title.trim(), content: content.trim(), notify,
        appVersion: APP_VERSION, pushEnabled: await pushAllowed(), photos,
      });
      Alert.alert('문의 접수', '문의가 접수되었어요. 답변이 등록되면 알려드릴게요.');
      navigation.replace('InquiryDetail', { id });
    } catch (e: any) {
      Alert.alert('접수 실패', e?.response?.data?.message || '문의를 보내지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="문의하기" />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>문의 유형</Text>
          <View style={styles.pillRow}>
            {INQUIRY_CATEGORIES.map(c => {
              const on = c.key === category;
              return (
                <Pressable key={c.key} style={[styles.pill, on && styles.pillOn]} onPress={() => setCategory(c.key)}>
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>제목</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="문의 제목을 입력하세요"
              placeholderTextColor="#9AACC4"
              maxLength={100}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>내용</Text>
            <Text style={styles.count}>{content.length} / {MAX_LEN}</Text>
          </View>
          <TextInput
            style={styles.textarea}
            value={content}
            onChangeText={setContent}
            placeholder="어떤 상황인지 자세히 적어주시면 빠르게 도와드릴 수 있어요."
            placeholderTextColor="#9AACC4"
            multiline
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />
        </View>

        <View style={{ gap: 8 }}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>사진 첨부 <Text style={styles.labelSub}>(선택 · 최대 {MAX_PHOTOS}장)</Text></Text>
          </View>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photo} />
                <Pressable style={styles.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="사진 빼기">
                  <Icon name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={styles.photoAdd} onPress={addPhoto}>
                <Icon name="camera-plus-outline" size={20} color={colors.primaryDark} />
                <Text style={styles.photoAddText}>{photos.length}/{MAX_PHOTOS}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable style={styles.checkRow} onPress={() => setNotify(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: notify }}>
          <View style={[styles.checkBox, notify && styles.checkBoxOn]}>
            {notify && <Icon name="check" size={13} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkText}>답변이 등록되면 앱 알림 받기</Text>
        </Pressable>

        <Text style={styles.hint}>평일 10:00~18:00 순서대로 답변드려요. 답변은 내 문의 목록에서 확인할 수 있어요.</Text>

        <Pressable onPress={submit} disabled={sending}>
          <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={[styles.submit, sending && { opacity: 0.7 }]}>
            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>문의 보내기</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 16 },

  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  labelSub: { fontWeight: '400', color: colors.textSecondary },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 12, color: colors.textSecondary },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: '#DDEAF7', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  pillOn: { backgroundColor: '#E8F3FF', borderColor: '#7DBBFF' },
  pillText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  pillTextOn: { fontWeight: '700', color: colors.primaryDark },

  inputWrap: { height: 48, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 14, justifyContent: 'center' },
  input: { fontSize: 14, color: colors.textPrimary, padding: 0 },
  textarea: { minHeight: 150, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, lineHeight: 22, color: colors.textPrimary },

  photoRow: { flexDirection: 'row', gap: 8 },
  photoWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(16,42,86,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9CC9FA', backgroundColor: '#F3F9FF', alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoAddText: { fontSize: 11, color: colors.primaryDark },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  checkBox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: '#C5D5E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { fontSize: 13, color: colors.textSecondary },
  hint: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },

  submit: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
