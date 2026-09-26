/**
 * 설정 화면 (햄버거 메뉴용)
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.screen}>
      <AppHeader leftType="menu" title="설정" />
      <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader style={styles.subheader}>앱 설정</List.Subheader>
        <List.Item
          title="알림 설정"
          titleStyle={styles.itemTitle}
          left={props => <List.Icon {...props} icon="bell-outline" color="#2E75B6" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#999" />}
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <Divider />
        <List.Item
          title="공정별 단가 설정"
          description="내가 자주 하는 공정의 기본 단가"
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDescription}
          left={props => <List.Icon {...props} icon="cash-multiple" color="#2E75B6" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#999" />}
          onPress={() => navigation.navigate('WageSettings')}
        />
        <Divider />
        <List.Item
          title="현장 목록"
          titleStyle={styles.itemTitle}
          left={props => <List.Icon {...props} icon="home-city-outline" color="#2E75B6" />}
          right={props => <List.Icon {...props} icon="chevron-right" color="#999" />}
          onPress={() => navigation.navigate('SiteList')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader style={styles.subheader}>정보</List.Subheader>
        <List.Item
          title="이용약관"
          titleStyle={styles.itemTitle}
          left={props => <List.Icon {...props} icon="file-document-outline" color="#2E75B6" />}
          onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
        />
        <Divider />
        <List.Item
          title="개인정보 처리방침"
          titleStyle={styles.itemTitle}
          left={props => <List.Icon {...props} icon="shield-account-outline" color="#2E75B6" />}
          onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
        />
        <Divider />
        <List.Item
          title="앱 버전"
          description="v1.0.0 (v9 빌드)"
          titleStyle={styles.itemTitle}
          descriptionStyle={styles.itemDescription}
          left={props => <List.Icon {...props} icon="information-outline" color="#2E75B6" />}
        />
      </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  subheader: { color: '#1F3864', fontWeight: '700', fontSize: 13 },
  itemTitle: { color: '#222222', fontSize: 15, fontWeight: '600' },
  itemDescription: { color: '#666666', fontSize: 12 },
});
