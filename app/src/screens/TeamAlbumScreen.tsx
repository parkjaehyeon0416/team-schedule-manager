/**
 * 팀 현장 앨범 — DESIGN-CANVAS 기준, TEAM_ALBUM.dc.html (★ v18.48, 팀원 누구나)
 * 팀원들이 일정·현장에 올린 사진을 현장별로 모아 보기. 현장 이름 검색, 카드를 누르면 현장별 앨범.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, TextInput } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import dayjs from 'dayjs';
import AppHeader from '../components/AppHeader';
import { getTeamAlbum } from '../api/teamApi';
import type { TeamAlbum, PhotoStage } from '../api/teamApi';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';
import { isPlanLocked } from '../utils/planLock';

export const STAGE_LABEL: Record<PhotoStage, string> = { before: '시공 전', during: '시공 중', after: '시공 후', other: '기타' };
export const STAGE_SHORT: Record<PhotoStage, string> = { before: '전', during: '중', after: '후', other: '기타' };
export const STAGE_BG: Record<PhotoStage, string> = { before: 'rgba(16,42,86,0.72)', during: '#B95E00', after: '#0A6CE0', other: '#5F7290' };

function lastLabel(iso: string) {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), 'day')) return '오늘';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return '어제';
  return d.format('M월 D일');
}

export default function TeamAlbumScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [data, setData] = useState<TeamAlbum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useFocusEffect(useCallback(() => {
    getTeamAlbum(teamId)
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(isPlanLocked(e) ? '팀 요금제에서 쓸 수 있는 기능이에요.' : e?.response?.data?.message || '앨범을 불러오지 못했어요.'));
  }, [teamId]));

  const term = q.trim();
  const sites = (data?.sites ?? []).filter(s => !term || s.name.includes(term) || s.address.includes(term));

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="현장 앨범" />
      {error ? (
        <View style={styles.center}><Text style={styles.muted}>{error}</Text></View>
      ) : !data ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <Image source={ICONS.site} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <View>
              <Text style={styles.headTitle}>{data.team_name} 현장 앨범</Text>
              <Text style={styles.muted}>현장 {data.site_count}곳 · 사진 {data.photo_count}장</Text>
            </View>
          </View>

          <View style={styles.search}>
            <Icon name="magnify" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="현장 이름으로 검색" placeholderTextColor="#9AACC4"
              accessibilityLabel="현장 검색" style={styles.searchInput} />
          </View>

          {sites.map(s => (
            <Pressable key={s.id} style={styles.card} onPress={() => navigation.navigate('TeamAlbumSite', { teamId, siteId: s.id })}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.siteName}>{s.name}</Text>
                  {!!s.address && (
                    <View style={styles.addrRow}>
                      <Icon name="map-marker-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.muted} numberOfLines={1}>{s.address}</Text>
                    </View>
                  )}
                </View>
                <Icon name="chevron-right" size={18} color={colors.muted} />
              </View>
              <View style={styles.grid}>
                {Array.from({ length: 4 }).map((_, i) => {
                  const p = s.previews[i];
                  return (
                    <View key={i} style={styles.thumbWrap}>
                      {p ? (
                        <Image source={{ uri: `${SERVER_BASE_URL}${p.url}` }} style={styles.thumb} />
                      ) : (
                        <LinearGradient colors={['#E9F1FA', '#D7E5F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.thumb, styles.thumbEmpty]}>
                          <Icon name="image-outline" size={20} color="#7F95B2" />
                        </LinearGradient>
                      )}
                      {p && (
                        <View style={[styles.stageTag, { backgroundColor: STAGE_BG[p.category] }]}>
                          <Text style={styles.stageText}>{STAGE_SHORT[p.category]}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.cardFoot}>
                <Text style={styles.muted}>시공 전 <Text style={styles.bold}>{s.before_count}</Text> · 시공 후 <Text style={styles.bold}>{s.after_count}</Text></Text>
                <Text style={styles.muted}>마지막 업로드 {lastLabel(s.last_uploaded_at)}</Text>
              </View>
            </Pressable>
          ))}

          {sites.length === 0 && (
            <View style={styles.empty}>
              <Image source={ICONS.site} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <Text style={styles.emptyTitle}>{term ? '검색 결과가 없어요' : '아직 올라온 현장 사진이 없어요'}</Text>
              {!term && <Text style={styles.emptyDesc}>팀 일정이나 현장에 시공 사진을 올리면{'\n'}현장별로 여기 모여요.</Text>}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.xl, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textSecondary },
  bold: { color: colors.textPrimary, fontWeight: '700' },
  search: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  card: { gap: 10, padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16, shadowColor: '#102A56', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  siteName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  grid: { flexDirection: 'row', gap: 4 },
  thumbWrap: { flex: 1 },
  thumb: { width: '100%', height: 74, borderRadius: 8, backgroundColor: '#E9F1FA' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  stageTag: { position: 'absolute', left: 4, top: 4, height: 16, paddingHorizontal: 5, borderRadius: 4, justifyContent: 'center' },
  stageText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
});
