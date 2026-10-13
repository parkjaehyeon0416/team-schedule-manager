<?php

namespace App\Support;

/**
 * ★ v18.67 보안 — 내보내기 표에서 '사용자가 쓴 글'(메모·팀원 이름·항목명·현장명 등) 칸 표시용 포장
 *
 *   XlsxBuilder는 is_numeric()이면 숫자 칸으로 씀 → 메모·이름이 '1e999'면 무한대(INF)가 숫자 칸에 들어가
 *   엑셀이 열지 못하는 깨진 파일이 됨(엑셀은 INF/NaN 숫자를 지원 안 함). 팀장이 팀원 일정 메모에, 팀원이 자기 이름에
 *   넣으면 '다른 사람'이 받는 엑셀을 망가뜨릴 수 있었음. 덤으로 '00123' 같은 글은 123으로 바뀌었음.
 *   이 객체는 is_numeric()이 false라 XlsxBuilder가 항상 setValueExplicit(TYPE_STRING) 글자 칸으로 씀.
 *   (string)으로 바꾸면 원래 글 그대로 → CSV(SafeSheet::csvCell)도 똑같이 처리됨.
 *   만들기: SafeSheet::text($value)
 */
final class SheetText implements \Stringable
{
    public function __construct(private readonly string $text)
    {
    }

    public function __toString(): string
    {
        return $this->text;
    }
}
