// ═══════════════════════════════════════════════════════════════
// 📄 src/components/YearMonthPicker.tsx
//   년/월 선택 모달 — 재사용 가능한 공용 컴포넌트
//
//   사용 방법:
//   <YearMonthPicker
//     visible={pickerVisible}
//     year={2026}
//     month={4}
//     onClose={() => setPickerVisible(false)}
//     onSelect={(y, m) => {
//       setYear(y); setMonth(m); setPickerVisible(false);
//     }}
//   />
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Button, IconButton } from 'react-native-paper';

// ─────────────────────────────────────────────────────────────────
// Props 타입
// ─────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean; // 모달 표시 여부
  year: number; // 현재 선택된 년
  month: number; // 현재 선택된 월 (1~12)
  onClose: () => void; // 모달 닫기 (취소 버튼 또는 배경 탭)
  onSelect: (year: number, month: number) => void; // 월 선택 시 호출
}

export default function YearMonthPicker({
  visible,
  year,
  month,
  onClose,
  onSelect,
}: Props) {
  // 모달 안에서 잠시 들고 있을 임시 년 (확정 전)
  // 사용자가 ◀▶로 년도 바꾸다가 취소할 수도 있으니 분리
  const [tempYear, setTempYear] = useState(year);

  // 모달이 열릴 때마다 외부 year를 임시 state에 동기화
  useEffect(() => {
    if (visible) {
      setTempYear(year);
    }
  }, [visible, year]);

  // 월 그리드 데이터 (1~12)
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 오늘 정보 (오늘 표시용)
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;

  // 핸들러
  const handlePrevYear = () => setTempYear(y => y - 1);
  const handleNextYear = () => setTempYear(y => y + 1);
  const handleMonthTap = (m: number) => onSelect(tempYear, m);
  const handleToday = () => onSelect(todayYear, todayMonth);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 배경 탭하면 닫힘 */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* 본체 — 이벤트 전파 막아서 본체 탭으로는 안 닫힘 */}
        <Pressable style={styles.container} onPress={() => {}}>
          {/* 헤더 */}
          <Text style={styles.title}>년/월 선택</Text>

          {/* 년도 선택 행 */}
          <View style={styles.yearRow}>
            <IconButton
              icon="chevron-left"
              size={28}
              onPress={handlePrevYear}
            />
            <Text style={styles.yearText}>{tempYear}년</Text>
            <IconButton
              icon="chevron-right"
              size={28}
              onPress={handleNextYear}
            />
          </View>

          {/* 월 그리드 (3행 4열) */}
          <View style={styles.monthGrid}>
            {months.map(m => {
              // 현재 선택된 월인지
              const isSelected = tempYear === year && m === month;
              // 오늘이 속한 월인지 (별도 표시)
              const isToday = tempYear === todayYear && m === todayMonth;

              return (
                <Pressable
                  key={m}
                  style={({ pressed }) => [
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    isToday && !isSelected && styles.monthCellToday,
                    pressed && styles.monthCellPressed,
                  ]}
                  onPress={() => handleMonthTap(m)}
                  android_ripple={{ color: '#E8F0FE' }}
                >
                  <Text
                    style={[
                      styles.monthText,
                      isSelected && styles.monthTextSelected,
                      isToday && !isSelected && styles.monthTextToday,
                    ]}
                  >
                    {m}월
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 하단 버튼 영역 */}
          <View style={styles.actionRow}>
            <Button mode="outlined" onPress={onClose} style={styles.actionBtn}>
              취소
            </Button>
            <Button
              mode="contained"
              icon="calendar-today"
              onPress={handleToday}
              style={styles.actionBtn}
            >
              오늘로
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F3864',
    textAlign: 'center',
    marginBottom: 8,
  },
  // 년도 행
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    minWidth: 90,
    textAlign: 'center',
  },
  // 월 그리드
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  monthCell: {
    width: '25%', // 4열 = 25%씩
    aspectRatio: 1.6, // 가로/세로 비율 (세로가 너무 길지 않게)
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  monthCellSelected: {
    backgroundColor: '#2E75B6',
  },
  monthCellToday: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  monthCellPressed: {
    opacity: 0.6,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  monthTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  monthTextToday: {
    color: '#D48806',
    fontWeight: '600',
  },
  // 하단 버튼
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
});
