// ═══════════════════════════════════════════════════════════════
// 📄 AppHeader.tsx — v11.7 신규
//   모든 화면 공통 헤더 (HomeScreen v11.6에서 만든 헤더를 추출/일반화)
//
//   leftType='menu' (Drawer 화면: 홈/내수입/근태/프로필/설정)
//     → ☰ + 🏠 아이콘, 중앙은 title 텍스트 또는 centerContent
//   leftType='back' (Stack 화면: 일정상세/일정등록/단가설정)
//     → ← 아이콘 (뒤로가기), 중앙은 title 텍스트
//
//   centerContent / rightContent로 화면별 커스텀 콘텐츠 주입 가능
//   (예: HomeScreen의 연월 탭 + 오늘 버튼)
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  leftType?: 'menu' | 'back';
  title?: string;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onHomePress?: () => void;
}

export default function AppHeader({
  leftType = 'menu',
  title,
  centerContent,
  rightContent,
  onBackPress,
  onMenuPress,
  onHomePress,
}: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleBack = onBackPress ?? (() => navigation.goBack());
  const handleMenu = onMenuPress ?? (() => navigation.openDrawer?.());
  const handleHome = onHomePress ?? (() => navigation.navigate('Home'));

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top, height: 56 + insets.top },
      ]}
    >
      <View style={styles.left}>
        {leftType === 'back' ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            android_ripple={{ color: '#E8F0FE', borderless: true, radius: 20 }}
          >
            <Text style={styles.iconText}>←</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={handleMenu}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              android_ripple={{ color: '#E8F0FE', borderless: true, radius: 20 }}
            >
              <Text style={styles.iconText}>☰</Text>
            </Pressable>
            <Pressable
              onPress={handleHome}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              android_ripple={{ color: '#E8F0FE', borderless: true, radius: 20 }}
            >
              <Text style={styles.iconText}>🏠</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.center}>
        {centerContent ?? (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      <View style={styles.right}>{rightContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', minWidth: 44 },
  iconBtn: {
    width: 40, height: 44,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 22,
  },
  iconBtnPressed: { opacity: 0.6 },
  iconText: { fontSize: 22, color: '#1F3864', fontWeight: '600' },
  center: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    height: 44, paddingHorizontal: 8,
  },
  titleText: { fontSize: 17, fontWeight: '700', color: '#1F3864' },
  right: { minWidth: 44, alignItems: 'flex-end', marginRight: 4 },
});
