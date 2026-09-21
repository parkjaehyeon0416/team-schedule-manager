// ═══════════════════════════════════════════════════════════════
// 📄 AddressSearchModal.tsx
//   다음(카카오) 우편번호 서비스로 주소 검색 — 수기 입력 대신 API 검색으로 대체.
//   무료, API 키 불필요. WebView로 위젯을 그대로 띄우고 postMessage로 결과 수신.
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
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

const POSTCODE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <style>html,body{margin:0;padding:0;height:100%;}</style>
</head>
<body>
  <div id="wrap" style="width:100%;height:100%;"></div>
  <script>
    new daum.Postcode({
      oncomplete: function(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          zonecode: data.zonecode,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          buildingName: data.buildingName,
          bname: data.bname,
        }));
      },
      width: '100%',
      height: '100%',
    }).embed(document.getElementById('wrap'));
  </script>
</body>
</html>
`;

export default function AddressSearchModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as DaumAddressResult;
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
          source={{ html: POSTCODE_HTML }}
          onMessage={handleMessage}
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
