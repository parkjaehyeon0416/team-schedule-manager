/**
 * 연락처에서 팀원 초대 — DESIGN-CANVAS 기준, TEAM_CONTACT_PICK.dc.html (★ v18.43)
 * 연락처 권한은 이 화면에 처음 들어올 때만 물어봄(사용자 확인 2026-10-06).
 * 고른 사람들의 번호와 초대 문구가 채워진 채로 휴대폰 문자 앱이 열리고, 팀장이 직접 "전송"을 누름(서버 문자 비용 없음).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator, Image, Linking, PermissionsAndroid, Platform, ScrollView, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Contacts from 'react-native-contacts';
import AppHeader from '../components/AppHeader';
import { getTeamInvite } from '../api/teamApi';
import type { TeamInviteInfo } from '../api/teamApi';
import { inviteMessage } from './TeamInviteScreen';
import { colors, spacing } from '../theme/designTokens';
import { ICONS } from '../assets/icons';

type Person = { id: string; name: string; phone: string; digits: string };

const AVB = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0', '#E5ECF5'];
const AVT = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E', '#5F7290'];

function formatPhone(d: string): string {
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

// 연락처 → 휴대폰 번호(010 등) 하나씩. 같은 번호는 한 번만.
function toPeople(list: Contacts.Contact[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const c of list) {
    const name = c.displayName || [c.familyName, c.givenName].filter(Boolean).join('') || '';
    const nums = (c.phoneNumbers ?? []).map(p => p.number.replace(/\D/g, '').replace(/^82/, '0'));
    const mobile = nums.find(n => /^01\d{8,9}$/.test(n));
    if (!mobile || seen.has(mobile)) continue;
    seen.add(mobile);
    out.push({ id: `${c.recordID}-${mobile}`, name: name || formatPhone(mobile), phone: formatPhone(mobile), digits: mobile });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export default function TeamContactPickScreen() {
  const route = useRoute<any>();
  const teamId: number = route.params?.teamId;
  const [invite, setInvite] = useState<TeamInviteInfo | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
        title: '연락처 접근',
        message: '연락처에서 팀원을 골라 초대 문자를 보내려면 연락처 접근이 필요해요. 연락처는 휴대폰 안에서만 쓰이고 서버로 보내지 않아요.',
        buttonPositive: '허용',
        buttonNegative: '거부',
      });
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        setState('denied');
        return;
      }
    }
    try {
      setPeople(toPeople(await Contacts.getAllWithoutPhotos()));
      setState('ready');
    } catch {
      setState('denied');
    }
  }, []);

  useEffect(() => {
    load();
    getTeamInvite(teamId).then(setInvite).catch(() => {});
  }, [load, teamId]);

  const list = useMemo(() => {
    const term = q.trim();
    if (!term) return people;
    const digits = term.replace(/\D/g, '');
    return people.filter(p => p.name.includes(term) || (digits.length >= 2 && p.digits.includes(digits)));
  }, [people, q]);

  const chosen = people.filter(p => selected.includes(p.id));
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const send = async () => {
    if (!invite || chosen.length === 0) return;
    const url = `sms:${chosen.map(p => p.digits).join(',')}?body=${encodeURIComponent(inviteMessage(invite))}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('문자 앱을 열 수 없어요', '휴대폰에 문자 앱이 있는지 확인해주세요.');
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="연락처에서 초대" />

      {state === 'loading' ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : state === 'denied' ? (
        <View style={[styles.center, { padding: spacing.lg, gap: 12 }]}>
          <Icon name="account-lock-outline" size={40} color={colors.muted} />
          <Text style={styles.deniedText}>연락처 접근이 허용되지 않았어요.{'\n'}설정에서 연락처 권한을 켜면 바로 고를 수 있어요.</Text>
          <Pressable style={styles.lineBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.lineBtnText}>설정 열기</Text>
          </Pressable>
          <Pressable onPress={load} hitSlop={8}><Text style={styles.link}>다시 시도</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 12 }}>
              <View style={styles.teamRow}>
                <Image source={ICONS.team} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
                <Text style={styles.teamText}><Text style={styles.teamName}>{invite?.team_name ?? '팀'}</Text>에 초대할 사람을 골라주세요</Text>
              </View>
              <View style={styles.search}>
                <Icon name="magnify" size={18} color="#8FA3BF" />
                <TextInput
                  style={styles.searchInput}
                  value={q}
                  onChangeText={setQ}
                  placeholder="이름 또는 번호 검색"
                  placeholderTextColor="#9AACC4"
                  accessibilityLabel="이름 검색"
                />
              </View>
              {chosen.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
                  {chosen.map(p => (
                    <Pressable key={p.id} style={styles.chip} onPress={() => toggle(p.id)} accessibilityLabel={`${p.name} 선택 해제`}>
                      <Text style={styles.chipText}>{p.name}</Text>
                      <Icon name="close" size={14} color={colors.primaryDark} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <View style={styles.hintBox}>
                <Icon name="information-outline" size={16} color={colors.primaryDark} style={{ marginTop: 2 }} />
                <Text style={styles.hintText}>버튼을 누르면 휴대폰 문자 앱이 열리고, 선택한 사람들에게 보낼 초대 링크 문구가 자동으로 입력돼요.</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.listCard}>
              <Text style={styles.empty}>{people.length === 0 ? '휴대폰 번호가 있는 연락처가 없어요.' : '검색 결과가 없어요.'}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const on = selected.includes(item.id);
            const i = item.name.charCodeAt(0) % AVB.length;
            return (
              <Pressable
                style={[styles.row, index === 0 && styles.rowFirst, index === list.length - 1 && styles.rowLast]}
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <View style={[styles.avatar, { backgroundColor: AVB[i] }]}>
                  <Text style={[styles.avatarText, { color: AVT[i] }]}>{item.name[0]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.phone}>{item.phone}</Text>
                </View>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on && <Icon name="check" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {state === 'ready' && (
        <View style={styles.bottom}>
          {chosen.length > 0 ? (
            <Pressable onPress={send} disabled={!invite}>
              <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} style={[styles.cta, !invite && { opacity: 0.6 }]}>
                <Icon name="message-outline" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>{chosen.length}명에게 초대 문자 보내기</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.cta, { backgroundColor: '#B9D6F7' }]} accessibilityState={{ disabled: true }}>
              <Text style={styles.ctaText}>초대할 사람을 선택하세요</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 110 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  teamName: { fontWeight: '700', color: colors.textPrimary },
  search: { height: 44, borderWidth: 1, borderColor: '#DDEAF7', borderRadius: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
  chip: { height: 32, paddingLeft: 12, paddingRight: 8, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#E8F3FF', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  hintBox: { flexDirection: 'row', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#E8F3FF', borderRadius: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.primaryDark },

  listCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6F0FA', borderRadius: 16 },
  empty: { padding: 32, textAlign: 'center', fontSize: 14, color: colors.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: '#FFFFFF',
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E6F0FA', borderBottomWidth: 1, borderBottomColor: '#EDF3FA',
  },
  rowFirst: { borderTopWidth: 1, borderTopColor: '#E6F0FA', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  rowLast: { borderBottomColor: '#E6F0FA', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  phone: { fontSize: 13, color: colors.textSecondary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#C5D5E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E6EEF8' },
  cta: { height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  deniedText: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  lineBtn: { height: 44, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFB', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  lineBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  link: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
});
