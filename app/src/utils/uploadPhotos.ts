// ★ v18.66 — 여러 장 사진을 하나씩 차례로 올리기(서버는 요청 1번에 사진 1장).
//   실패한 사진이 있어도 나머지는 계속 올리고, 끝나면 결과를 한 번만 알림.
//   요금제 한도(403 ERR_PLAN_001)에 걸리면 남은 사진은 올리지 않음(잠금 안내 시트는 axios 인터셉터가 띄움).
//   권한 없음·현장 없음처럼 다음 사진도 똑같이 실패할 오류면 거기서 멈춤.
import { Alert } from 'react-native';
import { isPlanLocked } from './planLock';

export interface UploadBatchResult {
  total: number; // 올리려던 장수
  done: number; // 올라간 장수
  failed: number; // 실패한 장수
  skipped: number; // 중간에 멈춰서 시도하지 않은 장수
  planLocked: boolean; // 요금제 한도로 멈췄는지
  stopError: any | null; // 멈추게 한 오류(요금제 한도 제외)
  lastError: any | null; // 마지막 실패 오류(서버 안내 문구 표시용)
}

// 다음 사진도 똑같이 실패할 오류인지 — 사진 파일 검증 오류(ERR_VALID_001)·네트워크·서버 오류는 사진마다 다를 수 있어 계속 진행
function isStopError(e: any): boolean {
  const status = e?.response?.status;
  if (status === 401 || status === 403 || status === 404) return true;
  return status === 422 && e?.response?.data?.error_code !== 'ERR_VALID_001';
}

export async function uploadSequentially<T>(
  items: T[],
  upload: (item: T, index: number) => Promise<unknown>,
  onProgress?: (current: number, total: number) => void,
): Promise<UploadBatchResult> {
  const r: UploadBatchResult = { total: items.length, done: 0, failed: 0, skipped: 0, planLocked: false, stopError: null, lastError: null };
  for (let i = 0; i < items.length; i++) {
    onProgress?.(i + 1, items.length);
    try {
      await upload(items[i], i);
      r.done++;
    } catch (e: any) {
      r.failed++;
      r.lastError = e;
      if (isPlanLocked(e)) {
        r.planLocked = true;
        r.skipped = items.length - i - 1;
        break;
      }
      if (isStopError(e)) {
        r.stopError = e;
        r.skipped = items.length - i - 1;
        break;
      }
    }
  }
  return r;
}

// 결과 알림 문구 — 전부 성공했거나 요금제 한도로 1장도 못 올렸으면(잠금 시트가 대신 안내) null
export function uploadSummary(r: UploadBatchResult): { title: string; message: string } | null {
  const serverMsg: string | undefined = r.lastError?.response?.data?.message;
  const notDone = r.total - r.done;
  if (notDone === 0) return null;
  if (r.planLocked) {
    if (r.done === 0) return null;
    return { title: '사진 올리기', message: `${r.total}장 중 ${r.done}장을 올렸어요. 요금제 한도에 걸려 나머지 ${notDone}장은 올리지 못했어요.` };
  }
  if (r.total === 1) {
    return { title: '업로드 실패', message: serverMsg || '다시 시도해주세요.' };
  }
  if (r.done === 0) {
    return { title: '업로드 실패', message: `${r.total}장 모두 올리지 못했어요.${serverMsg ? `\n${serverMsg}` : ''}` };
  }
  if (r.stopError) {
    return { title: '일부만 올렸어요', message: `${r.total}장 중 ${r.done}장을 올렸어요. 나머지 ${notDone}장은 올리지 못했어요.${serverMsg ? `\n${serverMsg}` : ''}` };
  }
  return { title: '일부만 올렸어요', message: `${r.total}장 중 ${r.done}장을 올렸어요. ${r.failed}장은 실패했어요.` };
}

export function showUploadSummary(r: UploadBatchResult): void {
  const s = uploadSummary(r);
  if (s) Alert.alert(s.title, s.message);
}
