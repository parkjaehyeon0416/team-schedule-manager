<?php

namespace App\Support;

use App\Constants\ErrorCode;
use Illuminate\Http\JsonResponse;

/**
 * ★ v18.72 — 금지어 필터 (Apple 1.2). 목록은 config/moderation.php.
 *
 *   if ($err = ContentFilter::error($data['body'])) { return $err; }   // 걸리면 422, 아니면 null
 *
 *   - 걸린 단어는 응답에 넣지 않음(어떤 단어가 막히는지 알려주지 않음).
 *   - match()는 앱(config)을 띄우지 않는 순수 함수 — tests/Unit/ContentFilterTest.php에서 바로 부름.
 */
final class ContentFilter
{
    public const MESSAGE = '부적절한 표현이 들어 있어 올릴 수 없어요. 고쳐서 다시 올려주세요.';

    // 지운 허용 표현 자리에 넣는 구분 문자 — 앞뒤 글자가 붙어서 새 금지어가 생기지 않게(금지어에는 없는 문자)
    private const GAP = '|';

    /**
     * $text에 금지어가 있으면 그 금지어, 없으면 null.
     *   1) 소문자로
     *   2) $loose: 한글·영문·공백만 남김(글자 사이에 낀 숫자·기호 제거: 시1발·시.발 → 시발), 허용 표현 지움
     *   3) $tight: $loose에서 공백까지 지우고 허용 표현을 한 번 더 지움(작업시 발라 → 작업시발라 → 작업|)
     *   4) 3글자 이상 금지어는 $tight, 2글자 이하는 $loose에서 찾음
     *      (2글자를 $tight에서 찾으면 "작업 시 발라주세요"가 '시발'로 걸림)
     */
    public static function match(string $text, array $banned, array $allow): ?string
    {
        $lower = mb_strtolower($text);
        $allow = array_values(array_filter(array_map(fn($p) => mb_strtolower(trim((string) $p)), $allow), 'strlen'));

        $loose = preg_replace('/[^\p{Hangul}\p{Latin}\s]+/u', '', $lower) ?? $lower;
        $loose = $allow ? str_replace($allow, self::GAP, $loose) : $loose;

        $tight = preg_replace('/\s+/u', '', $loose) ?? $loose;
        $tight = $allow ? str_replace($allow, self::GAP, $tight) : $tight;

        foreach ($banned as $word) {
            $word = mb_strtolower(trim((string) $word));
            if ($word === '') {
                continue;
            }
            $haystack = mb_strlen($word) >= 3 ? $tight : $loose;
            if (str_contains($haystack, $word)) {
                return $word;
            }
        }

        return null;
    }

    /** config/moderation.php 목록으로 확인 — 걸린 금지어 또는 null */
    public static function firstMatch(?string $text): ?string
    {
        if ($text === null || trim($text) === '') {
            return null;
        }

        return self::match(
            $text,
            (array) config('moderation.banned_words', []),
            (array) config('moderation.allow_phrases', []),
        );
    }

    /**
     * 금지어가 있으면 422 응답(입력 검증 오류와 같은 모양: errors.{필드}), 없으면 null.
     *   앱은 서버 message를 알림창에 그대로 보여주고 쓰던 글은 그대로 둠.
     */
    public static function error(?string $text, string $field = 'body'): ?JsonResponse
    {
        if (self::firstMatch($text) === null) {
            return null;
        }

        return response()->json([
            'success'    => false,
            'message'    => self::MESSAGE,
            'error_code' => ErrorCode::MOD_OBJECTIONABLE,
            'errors'     => [$field => [self::MESSAGE]],
        ], 422);
    }
}
