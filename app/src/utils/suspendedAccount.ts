// ★ v18.72 — 이용이 정지된 계정으로 로그인·가입하려 할 때 (서버 403 ERR_AUTH_009)
//   ※ 같은 'ERR_AUTH_009' 문자열을 아이디 찾기의 "계정 없음"(404)도 쓰므로 상태 코드까지 같이 확인.
//   로그인 중에 정지되면 서버가 남은 토큰을 거절(401 ERR_AUTH_003) → axiosInstance가 자동 로그아웃하므로 여기와 무관.
import { Alert } from 'react-native';
import { OPERATOR_INFO } from '../constants/operatorInfo';

export function isSuspendedAccount(e: any): boolean {
  return e?.response?.status === 403 && e?.response?.data?.error_code === 'ERR_AUTH_009';
}

/** 서버 메시지 + 고객센터 이메일(이의 제기용) 안내. onClose는 확인을 누른 뒤 */
export function showSuspendedAlert(e: any, onClose?: () => void): void {
  const msg = e?.response?.data?.message || '이용이 정지된 계정입니다. 고객센터로 문의해주세요.';
  Alert.alert('이용이 정지된 계정이에요', `${msg}\n\n고객센터: ${OPERATOR_INFO.supportEmail}`, [
    { text: '확인', onPress: onClose },
  ]);
}
