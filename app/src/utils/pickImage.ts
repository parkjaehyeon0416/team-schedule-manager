// ★ v18.38 — 사진 고르기: "카메라로 촬영" / "갤러리에서 선택" 중 선택해서 사진 1장을 돌려줌(취소 시 null)
//   현장에서 바로 찍어 올릴 수 있게 함. 서버 PDF 메모리 때문에 1600px로 줄여서 받음.
// ★ v18.66 — 갤러리에서 여러 장을 한 번에 고를 수 있게 pickImages(최대 장수) 추가(카메라는 1장).
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Asset, ImageLibraryOptions } from 'react-native-image-picker';

const OPTIONS: ImageLibraryOptions = { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 };

// ★ v18.66 — 서버로 올릴 때 쓰는 사진 정보(FormData에 그대로 넣음)
export interface PhotoFile { uri: string; name: string; type: string }

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: '카메라 권한',
    message: '현장 사진을 바로 촬영하려면 카메라 권한이 필요해요.',
    buttonPositive: '허용',
    buttonNegative: '거부',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * ★ v18.66 — 사진 여러 장 고르기. 갤러리는 최대 max장까지 한 번에, 카메라는 1장.
 *   취소하면 빈 배열. (안드로이드 옛 버전은 개수 제한이 안 먹을 수 있어 max장으로 잘라서 돌려줌)
 */
export function pickImages(max: number): Promise<Asset[]> {
  const limit = Math.max(1, Math.floor(max)); // selectionLimit 0은 "무제한"이라 최소 1
  return new Promise(resolve => {
    Alert.alert('사진 추가', '사진을 어떻게 추가할까요?', [
      { text: '취소', style: 'cancel', onPress: () => resolve([]) },
      {
        text: '갤러리에서 선택',
        onPress: async () => {
          try {
            const res = await launchImageLibrary({ ...OPTIONS, selectionLimit: limit });
            const assets = (res.assets ?? []).filter(a => !!a.uri);
            if (assets.length > limit) {
              Alert.alert('사진 개수', `한 번에 ${limit}장까지 고를 수 있어 앞의 ${limit}장만 담았어요.`);
            }
            resolve(assets.slice(0, limit));
          } catch {
            resolve([]);
          }
        },
      },
      {
        text: '카메라로 촬영',
        onPress: async () => {
          try {
            if (!(await ensureCameraPermission())) {
              Alert.alert('권한 필요', '설정에서 카메라 권한을 허용해주세요.');
              resolve([]);
              return;
            }
            const res = await launchCamera({ ...OPTIONS, saveToPhotos: false });
            resolve((res.assets ?? []).filter(a => !!a.uri).slice(0, 1));
          } catch {
            resolve([]);
          }
        },
      },
    ], { cancelable: true, onDismiss: () => resolve([]) });
  });
}

// 사진 1장 고르기 — ★ v18.66부터 pickImages(1)로 처리(예전 호출 호환용)
export async function pickImage(): Promise<Asset | null> {
  const assets = await pickImages(1);
  return assets[0] ?? null;
}

// ★ v18.66 — 고른 사진을 업로드용 정보로 바꿈(파일 이름·형식이 비어 있으면 기본값)
export function toPhotoFile(asset: Asset): PhotoFile | null {
  if (!asset.uri) return null;
  return { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg' };
}
