// ═══════════════════════════════════════════════════════════════
// 📄 AddressSearchModal.tsx
//   다음(카카오) 우편번호 서비스로 주소 검색 — 수기 입력 대신 API 검색으로 대체.
//   무료, API 키 불필요. WebView로 위젯을 그대로 띄우고 postMessage로 결과 수신.
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DaumAddressResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  bname: string; // 법정동/리 이름 — '동' 필드 자동완성에 사용
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: DaumAddressResult) => void;
}

// ★ v18.25 — 다음 우편번호 위젯 페이지는 인라인 HTML이 아니라 실제 HTTPS URL로
//   로드해야 함. 인라인 HTML(source={{html}})로 띄우면 문서 origin이 애매해져서
//   주소 목록은 보이는데 클릭 시 "선택완료" postMessage가 조용히 전달 안 되는
//   문제가 있었음(에뮬레이터로 직접 재현/확인). 지금은 우리 서버에 정적 파일로
//   올려서 HTTPS로 서빙 중 — backend/public/postcode.html 참고.
const POSTCODE_URL = 'https://211-233-210-85.sslip.io/postcode.html';

export default function AddressSearchModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as DaumAddressResult & { __debug?: boolean; msg?: string };
      if (data.__debug) {
        // eslint-disable-next-line no-alert
        Alert.alert('디버그', data.msg ?? '알 수 없는 에러');
        return;
      }
      onSelect(data);
      onClose();
    } catch (e) {
      console.error('주소 검색 결과 파싱 실패:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>주소 검색</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: POSTCODE_URL }}
          onMessage={handleMessage}
          onError={(e) => Alert.alert('WebView 로드 오류', JSON.stringify(e.nativeEvent))}
          onHttpError={(e) => Alert.alert('WebView HTTP 오류', JSON.stringify(e.nativeEvent))}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  closeText: { fontSize: 14, color: '#2E75B6', fontWeight: '600' },
  webview: { flex: 1 },
});
