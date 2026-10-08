<?php

namespace App\Support;

/**
 * ★ v18.62 — 비밀번호 규칙 한 곳에서 관리: 영문 + 특수문자 포함, 8~16자, 공백·한글 불가.
 *   회원가입·비밀번호 재설정·이메일 로그인 설정/변경·운영자 비밀번호 설정이 모두 이걸 씀.
 *   앱(app/src/utils/passwordPolicy.ts)과 운영자 웹(frontend/src/utils/passwordPolicy.ts)도 같은 규칙으로 미리 검사.
 *   로그인 때는 검사하지 않음(예전 규칙으로 만든 비밀번호도 로그인은 돼야 해서).
 */
class PasswordPolicy
{
    public const HINT = '영문과 특수문자를 포함해 8~16자로 입력해주세요.';

    /** @param bool $confirmed password_confirmation 칸까지 확인할지 */
    public static function rules(bool $confirmed = true): array
    {
        return array_values(array_filter([
            'required',
            'string',
            'min:8',
            'max:16',
            'regex:/^[\x21-\x7E]+$/',          // 영문·숫자·특수문자만(공백·한글 불가)
            'regex:/[A-Za-z]/',                // 영문 1자 이상
            'regex:/[!-\/:-@\[-`{-~]/',         // 특수문자 1자 이상
            $confirmed ? 'confirmed' : null,
        ]));
    }

    public static function messages(string $field = 'password'): array
    {
        return [
            "{$field}.min"       => self::HINT,
            "{$field}.max"       => self::HINT,
            "{$field}.regex"     => self::HINT,
            "{$field}.confirmed" => '비밀번호 확인이 일치하지 않아요.',
        ];
    }

    /** artisan 명령처럼 Validator를 안 쓰는 곳용 — 규칙에 맞으면 true */
    public static function passes(string $password): bool
    {
        return strlen($password) >= 8 && strlen($password) <= 16
            && preg_match('/^[\x21-\x7E]+$/', $password)
            && preg_match('/[A-Za-z]/', $password)
            && preg_match('/[!-\/:-@\[-`{-~]/', $password);
    }
}
