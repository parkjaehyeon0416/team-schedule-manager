import React, { useState, useEffect } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from '../api/axiosInstance';

// 작업 유형별 색상
const typeColor: Record<string, string> = {
  도배: '#2E75B6',
  타일: '#E67E22',
  필름: '#27AE60',
};

export default function CardViewScreen() {
  const navigation = useNavigation<any>();
  const [groupedData, setGroupedData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = new Date();
    const res = await axios.get(
      `/schedules?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
    );
    const schedules = res.data.data || [];

    // 날짜별 그룹핑 처리
    // 💡 그룹핑 = 날짜가 같은 것들끼리 묶기. 예: 4/20 → [현장A, 현장B]
    const groups: Record<string, any[]> = {};
    schedules.forEach((s: any) => {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    // 오늘 + 앞뒤 30일 날짜 목록 생성
    const dates: string[] = [];
    for (let i = -7; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    setGroupedData(dates.map(date => ({ date, items: groups[date] || [] })));
  };

  const renderItem = ({ item }: any) => {
    const isToday = item.date === new Date().toISOString().split('T')[0];
    const [y, m, d] = item.date.split('-');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[new Date(item.date).getDay()];
    return (
      <View style={styles.dateGroup}>
        {/* 날짜 헤더 */}
        <View style={[styles.dateHeader, isToday && styles.todayHeader]}>
          <Text style={[styles.dateText, isToday && styles.todayText]}>
            {`${m}월 ${d}일 (${dayName}) ${isToday ? ' 오늘' : ''}`}
          </Text>
        </View>
        {/* 현장 카드들 */}
        {item.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>일정 없음</Text>
          </View>
        ) : (
          item.items.map((s: any) => (
            <TouchableOpacity
              key={s.id}
              onPress={() =>
                navigation.navigate('ScheduleDetail', { id: s.id })
              }
            >
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardTop}>
                    {s.work_type && (
                      <Badge
                        style={{
                          backgroundColor: typeColor[s.work_type] || '#888',
                        }}
                      >
                        {s.work_type}
                      </Badge>
                    )}
                    <Text style={styles.district}>{s.district || '현장'}</Text>
                  </View>
                  {/* 투입 인원 */}
                  <Text style={styles.members}>
                    👥{' '}
                    {s.assigned_users
                      ?.map((u: any) => u.user?.name)
                      .join(' · ') || '인원 미정'}
                  </Text>
                  {/* 평수 */}
                  {s.area_m2 && (
                    <Text style={styles.area}>
                      📐 {(s.area_m2 / 3.3).toFixed(1)}평 ({s.area_m2}㎡)
                    </Text>
                  )}
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={groupedData}
      renderItem={renderItem}
      keyExtractor={item => item.date}
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f5f5f5' },
  dateGroup: { marginBottom: 8 },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E8EEF7',
  },
  todayHeader: { backgroundColor: '#2E75B6' },
  dateText: { fontSize: 14, fontWeight: 'bold', color: '#1F3864' },
  todayText: { color: '#fff' },
  card: { marginHorizontal: 12, marginTop: 6, borderRadius: 8, elevation: 1 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  district: { fontSize: 15, fontWeight: 'bold', color: '#1F3864', flex: 1 },
  members: { fontSize: 13, color: '#555', marginBottom: 4 },
  area: { fontSize: 13, color: '#777' },
  emptyCard: {
    margin: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: { color: '#aaa', fontSize: 13 },
});
