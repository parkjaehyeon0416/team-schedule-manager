import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { Text, Chip, Button, Divider, Avatar } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from '../api/axiosInstance';

export default function ScheduleDetailScreen({ route }: any) {
  const { id } = route.params;
  const [schedule, setSchedule] = useState<any>(null);

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    console.log('🟢 [1] fetchDetail 시작, id =', id);
    try {
      console.log('🟢 [2] axios 요청 직전');
      const res = await axios.get(`/schedules/${id}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log('🟢 [3] 응답 수신 성공');
      console.log('📦 응답 status:', res.status);
      console.log('📦 응답 data (raw):', res.data);
      console.log('📦 응답 data 타입:', typeof res.data);
      console.log('📦 응답 headers:', res.headers);
      setSchedule(res.data?.data);
      console.log('🟢 [4] setSchedule 완료, 값:', res.data?.data);
    } catch (e: any) {
      console.log('🔴 에러 발생!');
      console.log('🔴 에러 메시지:', e?.message);
      console.log('🔴 에러 응답:', JSON.stringify(e?.response?.data, null, 2));
      console.log('🔴 에러 상태코드:', e?.response?.status);
      Alert.alert(
        '조회 실패',
        `상태: ${e?.response?.status || '없음'}\n메시지: ${
          e?.message || '알 수 없음'
        }`,
      );
    }
  };

  // 사진 업로드
  const handlePhotoUpload = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (!result.assets?.[0]) return;
    const formData = new FormData();
    formData.append('photo', {
      uri: result.assets[0].uri,
      name: result.assets[0].fileName,
      type: result.assets[0].type,
    } as any);
    try {
      await axios.post(`/schedules/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('✅ 사진이 업로드되었습니다.');
      fetchDetail();
    } catch {
      Alert.alert('업로드 실패');
    }
  };

  if (!schedule) return <Text style={{ padding: 20 }}>불러오는 중...</Text>;

  const pyeong = schedule.area_m2 ? (schedule.area_m2 / 3.3).toFixed(1) : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{schedule.date}</Text>
        {schedule.work_type && <Chip>{schedule.work_type}</Chip>}
      </View>
      {schedule.district && (
        <Text style={styles.district}>📍 {schedule.district}</Text>
      )}
      {pyeong && (
        <Text style={styles.area}>
          📐 {pyeong}평 ({schedule.area_m2}㎡)
        </Text>
      )}
      <Divider style={styles.divider} />
      <Text style={styles.section}>
        투입 인원 ({schedule.users?.length || 0}명)
      </Text>
      {schedule.users?.map((u: any) => (
        <View key={u.id} style={styles.member}>
          <Avatar.Text size={32} label={u.name?.[0] || '?'} />
          <Text style={styles.memberName}>{u.name}</Text>
        </View>
      ))}
      <Divider style={styles.divider} />
      <View style={styles.photoHeader}>
        <Text style={styles.section}>
          현장 사진 ({schedule.photos?.length || 0}장)
        </Text>
        <Button mode="outlined" compact onPress={handlePhotoUpload}>
          + 추가
        </Button>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {schedule.photos?.map((p: any) => (
          <Image
            key={p.id}
            source={{ uri: `http://10.0.2.2:8000/storage/${p.file_path}` }}
            style={styles.photo}
          />
        ))}
      </ScrollView>
      {schedule.memo && (
        <>
          <Divider style={styles.divider} />
          <Text style={styles.section}>메모</Text>
          <Text style={styles.memo}>{schedule.memo}</Text>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: { fontSize: 18, fontWeight: 'bold', color: '#1F3864' },
  district: { fontSize: 16, color: '#333', marginBottom: 4 },
  area: { fontSize: 14, color: '#555', marginBottom: 8 },
  section: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F3864',
    marginBottom: 8,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  memberName: { fontSize: 15, color: '#333' },
  photo: { width: 120, height: 120, borderRadius: 8, marginRight: 8 },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memo: { fontSize: 14, color: '#555', lineHeight: 22 },
  divider: { marginVertical: 12 },
});
