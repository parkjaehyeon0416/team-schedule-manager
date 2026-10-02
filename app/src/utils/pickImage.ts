// ★ v18.38 — 사진 고르기: "카메라로 촬영" / "갤러리에서 선택" 중 선택해서 사진 1장을 돌려줌(취소 시 null)
//   현장에서 바로 찍어 올릴 수 있게 함. 서버 PDF 메모리 때문에 1600px로 줄여서 받음.
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Asset, ImageLibraryOptions } from 'react-native-image-picker';

const OPTIONS: ImageLibraryOptions = { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 };

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

export function pickImage(): Promise<Asset | null> {
  return new Promise(resolve => {
    Alert.alert('사진 추가', '사진을 어떻게 추가할까요?', [
      { text: '취소', style: 'cancel', onPress: () => resolve(null) },
      {
        text: '갤러리에서 선택',
        onPress: async () => {
          const res = await launchImageLibrary(OPTIONS);
          resolve(res.assets?.[0] ?? null);
        },
      },
      {
        text: '카메라로 촬영',
        onPress: async () => {
          if (!(await ensureCameraPermission())) {
            Alert.alert('권한 필요', '설정에서 카메라 권한을 허용해주세요.');
            resolve(null);
            return;
          }
          const res = await launchCamera({ ...OPTIONS, saveToPhotos: false });
          resolve(res.assets?.[0] ?? null);
        },
      },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
