/**
 * ★ v18.48 — 팀 화면 공통 조각 (디자인 TEAM_DETAIL·TEAM_NOTICE_*·TEAM_SETTLEMENT*·TEAM_ALBUM*·ATTENDANCE 공통 스타일)
 *   아바타(사진 또는 이름 첫 글자, 팔레트는 디자인 AVB/AVT), 역할 태그, 체크 상자, 안내 상자, 탭, 아래에서 올라오는 시트
 */
import React from 'react';
import { View, Text, Image, Pressable, Modal, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SERVER_BASE_URL } from '../api/axiosInstance';
import { colors } from '../theme/designTokens';

export const AVB = ['#FFE3C2', '#D6ECFF', '#D9F6F1', '#ECE5FF', '#FFE0E0', '#E5ECF5'];
export const AVT = ['#B95E00', '#0A6CE0', '#0B8574', '#6B4FD8', '#C03A3E', '#5F7290'];

export const ROLE_COLORS: Record<string, [string, string]> = {
  '팀장': ['#FFF2E2', '#B95E00'],
  '부팀장': ['#E8F3FF', '#0A6CE0'],
  '팀원': ['#EEF2F7', '#5F7290'],
  '나간 팀원': ['#F3F4F6', '#8A96A8'],
};

/** 사람마다 같은 색 — 직접 고른 아바타 색이 있으면 그 색, 없으면 id로 팔레트 선택 */
export function avatarColors(id: number, picked?: string | null): [string, string] {
  const i = picked ? AVB.indexOf(picked.toUpperCase()) : -1;
  if (i >= 0) return [AVB[i], AVT[i]];
  if (picked) return [picked, colors.textPrimary];
  return [AVB[id % AVB.length], AVT[id % AVT.length]];
}

export function Avatar({ id, name, color, image, size = 40 }: {
  id: number; name: string; color?: string | null; image?: string | null; size?: number;
}) {
  if (image) {
    return <Image source={{ uri: `${SERVER_BASE_URL}/storage/${image}` }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const [bg, fg] = avatarColors(id, color);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: Math.round(size * 0.4), fontWeight: '700' }}>{(name || '?').charAt(0)}</Text>
    </View>
  );
}

export function RoleTag({ role, big = false }: { role: string; big?: boolean }) {
  const [bg, fg] = ROLE_COLORS[role] ?? ROLE_COLORS['팀원'];
  return (
    <View style={[styles.roleTag, big && styles.roleTagBig, { backgroundColor: bg }]}>
      <Text style={[styles.roleTagText, big && { fontSize: 12 }, { color: fg }]}>{role}</Text>
    </View>
  );
}

export function CheckBox({ checked, size = 24 }: { checked: boolean; size?: number }) {
  return checked ? (
    <View style={[styles.checkOn, { width: size, height: size }]}>
      <Icon name="check" size={size - 6} color="#FFFFFF" />
    </View>
  ) : (
    <View style={[styles.checkOff, { width: size, height: size }]} />
  );
}

export function InfoNote({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.info, style]}>
      <Icon name="information-outline" size={16} color={colors.primaryDark} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>{children}</Text>
    </View>
  );
}

/** 회색 바탕 안의 탭(디자인 segItems) */
export function SegTabs({ items, active, onPick }: { items: string[]; active: number; onPick: (i: number) => void }) {
  return (
    <View style={styles.segRow} accessibilityRole="tablist">
      {items.map((label, i) => {
        const on = i === active;
        return (
          <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onPick(i)}
            style={[styles.segBtn, on && styles.segBtnOn]}>
            <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 아래에서 올라오는 시트(디자인 공통: 반투명 배경 + 둥근 흰 판 + 손잡이) */
export function BottomSheet({ visible, onClose, children, label }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; label?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.sheet} accessibilityViewIsModal accessibilityLabel={label}>
          <View style={styles.sheetHandle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;

const styles = StyleSheet.create({
  roleTag: { height: 22, paddingHorizontal: 7, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  roleTagBig: { height: 24, paddingHorizontal: 9, borderRadius: 7 },
  roleTagText: { fontSize: 11, fontWeight: '700' },
  checkOn: { borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkOff: { borderRadius: 6, borderWidth: 1.5, borderColor: '#C5D5E8', backgroundColor: '#FFFFFF' },
  info: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#E8F3FF', borderRadius: 12 },
  infoText: { flex: 1, fontSize: 13, color: colors.primaryDark, lineHeight: 19.5 },
  segRow: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#EEF5FD', borderRadius: 12 },
  segBtn: { flex: 1, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  segBtnOn: { backgroundColor: '#FFFFFF', borderColor: '#CFE3FA' },
  segText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  segTextOn: { color: colors.primaryDark, fontWeight: '700' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,42,86,0.45)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D5DFEB', marginBottom: 4 },
});
