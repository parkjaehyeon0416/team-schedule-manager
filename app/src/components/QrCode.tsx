/**
 * 진짜로 스캔되는 QR 코드 — qrcode-generator(순수 JS)로 칸을 계산해서 View로 그림.
 * (react-native-svg 같은 네이티브 모듈 없이 동작)
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import qrcode from 'qrcode-generator';

// 기본 변환은 한글이 깨짐 → UTF-8로
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

interface Props {
  value: string;
  size: number;
  color?: string;
  background?: string;
}

export default function QrCode({ value, size, color = '#102A56', background = '#FFFFFF' }: Props) {
  const cells = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const rows: boolean[][] = [];
    for (let r = 0; r < n; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
      rows.push(row);
    }
    return rows;
  }, [value]);

  const cell = size / cells.length;
  return (
    <View style={{ width: size, height: size, backgroundColor: background }}>
      {cells.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', height: cell }}>
          {row.map((dark, c) => (
            // 칸 사이 틈(안티에일리어싱 줄무늬)이 안 생기게 살짝 겹쳐 그림
            <View key={c} style={{ width: cell + 0.3, height: cell + 0.3, backgroundColor: dark ? color : background }} />
          ))}
        </View>
      ))}
    </View>
  );
}
