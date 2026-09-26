// ═══════════════════════════════════════════════════════════════
// 📄 ScheduleReportsScreen.tsx — 일정별 자동 보고서 (★ v12~v13 백엔드/웹에 이어
//   모바일 연동 ★ 이번 작업)
//   ScheduleDetailScreen의 "보고서" 버튼에서 진입
// ═══════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator, Share, Linking } from 'react-native';
import { Text, Button, TextInput, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import { getReports, createReport, deleteReport, getPublicReportUrl } from '../api/reportApi';
import type { SiteReport } from '../types/api';
import AppHeader from '../components/AppHeader';

export default function ScheduleReportsScreen({ route }: any) {
  const { scheduleId } = route.params;

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [greeting, setGreeting] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getReports(scheduleId);
      setReports(list);
    } catch (e: any) {
      console.error('보고서 목록 조회 실패:', e);
      Alert.alert('조회 실패', e?.response?.data?.message || '보고서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('입력 오류', '보고서 제목을 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      await createReport(scheduleId, {
        title: title.trim(),
        client_name: clientName.trim() || undefined,
        client_contact: clientContact.trim() || undefined,
        greeting_message: greeting.trim() || undefined,
      });
      setTitle('');
      setClientName('');
      setClientContact('');
      setGreeting('');
      await load();
    } catch (e: any) {
      Alert.alert('생성 실패', e?.response?.data?.message || '보고서 생성에 실패했습니다. 현장이 연결된 일정인지 확인해주세요.');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = (r: SiteReport) => {
    const url = getPublicReportUrl(r.share_token);
    Share.share({ message: `${r.title}\n${url}` }).catch(() => {});
  };

  const handleOpen = (r: SiteReport) => {
    Linking.openURL(getPublicReportUrl(r.share_token)).catch(() => {
      Alert.alert('열기 실패', 'PDF를 열 수 없습니다.');
    });
  };

  const handleDelete = (r: SiteReport) => {
    Alert.alert('보고서 삭제', '이 보고서를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(r.id);
            await load();
          } catch (e: any) {
            Alert.alert('삭제 실패', e?.response?.data?.message || '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader leftType="back" title="자동 보고서" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>보고서 생성</Text>
        <TextInput mode="outlined" label="보고서 제목 *" value={title} onChangeText={setTitle} style={styles.input} textColor="#222222" outlineColor="#CCCCCC" activeOutlineColor="#1F3864" />
        <TextInput mode="outlined" label="고객명" value={clientName} onChangeText={setClientName} style={styles.input} textColor="#222222" outlineColor="#CCCCCC" activeOutlineColor="#1F3864" />
        <TextInput mode="outlined" label="고객 연락처" value={clientContact} onChangeText={setClientContact} style={styles.input} textColor="#222222" outlineColor="#CCCCCC" activeOutlineColor="#1F3864" />
        <TextInput mode="outlined" label="인사말" value={greeting} onChangeText={setGreeting} multiline numberOfLines={2} style={styles.input} textColor="#222222" outlineColor="#CCCCCC" activeOutlineColor="#1F3864" />
        <Button mode="contained" onPress={handleCreate} loading={creating} disabled={creating} style={styles.createBtn}>
          PDF 보고서 생성
        </Button>

        <Divider style={styles.divider} />
        <Text style={styles.section}>생성된 보고서</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2E75B6" style={{ marginTop: 20 }} />
        ) : reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="file-pdf-box" size={48} color="#BBB" />
            <Text style={styles.emptyText}>아직 생성된 보고서가 없습니다.</Text>
          </View>
        ) : (
          reports.map(r => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.cardMeta}>
                {r.client_name ?? '고객명 미입력'} · 열람 {r.view_count}회
              </Text>
              <View style={styles.cardActions}>
                <Button compact mode="outlined" onPress={() => handleOpen(r)}>보기</Button>
                <Button compact mode="outlined" onPress={() => handleShare(r)}>공유</Button>
                <Button compact mode="text" textColor="#D32F2F" onPress={() => handleDelete(r)}>삭제</Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { padding: 16, paddingBottom: 60 },

  section: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  input: { marginBottom: 12, backgroundColor: '#FFF' },
  createBtn: { marginBottom: 8 },

  divider: { marginVertical: 20 },

  emptyBox: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 10 },

  card: {
    backgroundColor: '#F7F7F9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
