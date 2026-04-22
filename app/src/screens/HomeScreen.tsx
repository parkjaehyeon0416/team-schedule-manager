import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import CalendarScreen from './CalendarScreen';
import CardViewScreen from './CardViewScreen';

// ★ navigation prop 받음 — Stack.Screen에서 자동으로 전달됨
export default function HomeScreen({ navigation }: any) {
  const [view, setView] = useState('calendar'); // 'calendar' | 'card'

  return (
    <View style={styles.container}>
      {/* 뷰 전환 탭 */}
      <SegmentedButtons
        value={view}
        onValueChange={setView}
        style={styles.tab}
        buttons={[
          { value: 'calendar', label: '달력 뷰', icon: 'calendar-month' },
          { value: 'card', label: '카드 뷰', icon: 'view-list' },
        ]}
      />

      {/* 선택된 뷰 표시 — ★ navigation을 자식 컴포넌트에 전달 */}
      <View style={styles.content}>
        {view === 'calendar' ? (
          <CalendarScreen navigation={navigation} />
        ) : (
          <CardViewScreen navigation={navigation} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tab: { margin: 12 },
  content: { flex: 1 },
});
