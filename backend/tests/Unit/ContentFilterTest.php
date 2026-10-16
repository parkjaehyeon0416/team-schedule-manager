<?php

use App\Support\ContentFilter;

/**
 * ★ v18.72 — 금지어 필터(App\Support\ContentFilter::match) 단위 테스트. DB·앱 없이 돌아감.
 *   목록은 실제 config/moderation.php를 그대로 읽어서 씀 → 목록을 바꾸면 이 테스트로 오탐 확인.
 *   실행: cd backend && ./vendor/bin/pest tests/Unit/ContentFilterTest.php
 */
function moderationConfig(): array
{
    static $cfg = null;

    return $cfg ??= include __DIR__ . '/../../config/moderation.php';
}

function filterMatch(string $text): ?string
{
    $cfg = moderationConfig();

    return ContentFilter::match($text, $cfg['banned_words'], $cfg['allow_phrases']);
}

test('욕설은 걸린다', function (string $text) {
    expect(filterMatch($text))->not->toBeNull();
})->with([
    '그대로'          => ['씨발'],
    '숫자 끼움'       => ['시1발'],
    '기호 끼움'       => ['시.발'],
    '초성'            => ['ㅅㅂ'],
    '띄어 씀(3글자)'  => ['개 새 끼'],
    '영문 대문자'     => ['FUCK'],
    '문장 속'         => ['오늘 현장 진짜 시발 같네'],
]);

test('현장 공지에 흔한 정상 표현은 통과한다', function (string $text) {
    expect(filterMatch($text))->toBeNull();
})->with([
    '띄어 쓴 시 발라'   => ['도배 시 발라주세요'],
    '붙여 쓴 시발라'    => ['퍼티작업시발라주세요'],
    '기호 끼운 시.발라' => ['프라이머를 시.발라'],
    '시발점'            => ['시발점'],
    '새끼손가락'        => ['새끼손가락 다침'],
    '불이 꺼져'         => ['불이 꺼져 있어요'],
    '졸라매고'          => ['허리띠 졸라매고'],
    '병신년생'          => ['병신년생'],
    '숫자+새끼손가락'   => ['손가락 2개 새끼손가락 다침'],
    '작업시 발주'       => ['자재는 작업시발주 넣어주세요'],
    '확장시 발코니'     => ['확장시발코니 창호 보양 부탁'],
    '철거시 발판'       => ['철거시발판 먼저 설치'],
    '점검시 발견'       => ['점검시발견된 하자 사진 올려주세요'],
    '숫자+새끼줄'       => ['자재 2개 새끼줄로 묶어주세요'],
    '평범한 공지'       => ['내일 오전 8시 현장 집결, 퍼티 2차 작업 예정입니다.'],
]);

test('빈 목록이면 아무것도 걸리지 않는다', function () {
    expect(ContentFilter::match('씨발', [], []))->toBeNull();
});
