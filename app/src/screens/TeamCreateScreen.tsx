/**
 * 팀 만들기 / 팀 정보 수정 화면 — DESIGN-CANVAS 기준, TEAM_CREATE.dc.html
 * 팀 사진·설명·주요 공정·활동 지역까지 디자인대로 구현(2026-10-02, 백엔드 teams 테이블 확장).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, Pressable, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { createTeam, updateTeam } from '../api/teamApi';
import { getWorkTypes } from '../api/workTypesApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import type { Team, WorkType } from '../types/api';
import { colors, radius, spacing } from '../theme/designTokens';
import { isPlanLocked } from '../utils/planLock';

export default function TeamCreateScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingTeam: Team | undefined = route.params?.team;
  const isEdit = !!editingTeam;

  const [name, setName] = useState(editingTeam?.name ?? '');
  const [description, setDescription] = useState(editingTeam?.description ?? '');
  const [activityArea, setActivityArea] = useState(editingTeam?.activity_area ?? '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    editingTeam?.specialty ? editingTeam.specialty.split(',').map(s => s.trim()).filter(Boolean) : [],
  );
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(
    editingTeam?.photo_path ? `${SERVER_BASE_URL}/storage/${editingTeam.photo_path}` : null,
  );
  const [photoAsset, setPhotoAsset] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getWorkTypes().then(setWorkTypes).catch(() => {});
  }, []);

  const toggleType = (name: string) => {
    setSelectedTypes(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));
  };

  const handlePickPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setPhotoUri(asset.uri);
    setPhotoAsset({ uri: asset.uri, name: asset.fileName ?? 'team.jpg', type: asset.type ?? 'image/jpeg' });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '팀 이름을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        specialty: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
        activity_area: activityArea.trim() || undefined,
        photo: photoAsset,
      };
      if (isEdit) {
        await updateTeam(editingTeam.id, payload);
        navigation.goBack();
      } else {
        await createTeam(payload);
        navigation.popTo('TeamList');
      }
    } catch (e: any) {
      if (!isPlanLocked(e)) Alert.alert('실패', e?.response?.data?.message || '요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title={isEdit ? '팀 정보 수정' : '팀 만들기'} />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.photoWrap} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
          ) : (
            <>
              <Icon name="image-plus" size={22} color={colors.primaryDark} />
              <Text style={styles.photoLabel}>사진 추가</Text>
            </>
          )}
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>팀 이름</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="팀 이름을 입력하세요"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>팀 설명</Text>
          <TextInput
            style={styles.textarea}
            placeholder="어떤 팀인지 간단히 소개해주세요"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>주요 공정</Text>
          <View style={styles.chipRow}>
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
          <Text style={styles.label}>활동 지역</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="예: 인천 서구"
              placeholderTextColor={colors.muted}
              value={activityArea}
              onChangeText={setActivityArea}
            />
          </View>
        </View>

        <Pressable onPress={handleSubmit} disabled={submitting} style={styles.buttonWrap}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.button, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{isEdit ? '저장' : '팀 만들기'}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl },

  photoWrap: {
    alignSelf: 'center', width: 84, height: 84, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed',
    borderColor: '#BFDBFB', backgroundColor: '#F3F9FF', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden',
  },
  photoImage: { width: 84, height: 84, borderRadius: 24 },
  photoLabel: { fontSize: 11, color: colors.primaryDark },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  inputWrap: {
    height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, justifyContent: 'center', backgroundColor: colors.surface,
  },
  input: { fontSize: 14, color: colors.textPrimary },
  textarea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface,
    padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 72, textAlignVertical: 'top',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#E8F3FF', borderColor: '#BFDBFB' },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextOn: { fontWeight: '700', color: colors.primaryDark },

  buttonWrap: { marginTop: spacing.md },
  button: { height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
