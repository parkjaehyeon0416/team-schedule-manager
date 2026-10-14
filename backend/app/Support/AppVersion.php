<?php

namespace App\Support;

/**
 * ★ v18.69 — 앱 버전 비교·업데이트 정책을 한 곳에서 관리.
 *   비교 기준은 마케팅 버전(MAJOR.MINOR.PATCH) — Android versionName / iOS CFBundleShortVersionString, 두 플랫폼 같은 번호.
 *   Android versionCode(빌드 번호)는 구글 플레이용 카운터라 여기선 안 씀.
 *   GET /api/app/version(AppVersionController)과 최소 버전 강제(RequireMinAppVersion)가 둘 다 이걸 씀.
 *
 *   읽을 수 있는 모양: "1" "1.0" "1.0.0" "v1.2" "V1.2.3" "01.02.03"(앞자리 0 무시),
 *   뒤에 붙는 빌드 표시 "1.1.0-beta.1" "1.1.0+42" "1.1.0 (42)" "1.1.0_rc" "1.2.3.4"(4번째 자리 이후)는 떼고 비교.
 *   ※ 1.1.0-beta 같은 시험판도 1.1.0과 같게 봄(semver처럼 정식판보다 낮게 보지 않음 — 시험판 쓰는 사람을 막지 않으려고).
 *   못 읽는 값(빈 값·글자·"1.x"·"1..2"·"1.2.3abc"(구분 기호 없이 붙은 글자)·64자 넘는 값·숫자 6자리 넘는 자리)은
 *   null = "모름" → 절대 막지 않음.
 */
final class AppVersion
{
    public const PLATFORMS = ['android', 'ios'];

    /** 설정값이 비었거나 못 읽을 때 쓰는 최소 버전(= 아무도 안 막음) */
    public const FALLBACK = '1.0.0';

    /** ★ v18.69 — 업데이트 안내 문구 최대 줄 수(앱은 강제 화면 2줄·선택 시트 3줄까지만 그림) */
    public const MAX_NOTES = 5;

    private const MAX_LENGTH = 64;

    private const PATTERN = '/^v?(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?(?:\.\d{1,9})*(?:[-+_ (].*)?$/iD';

    /** "1.0" → "1.0.0", "v1.2" → "1.2.0", 못 읽으면 null */
    public static function normalize(mixed $raw): ?string
    {
        $parts = self::parse($raw);

        return $parts === null ? null : implode('.', $parts);
    }

    /** a < b → -1, 같음 → 0, a > b → 1, 둘 중 하나라도 못 읽으면 null */
    public static function compare(mixed $a, mixed $b): ?int
    {
        $pa = self::parse($a);
        $pb = self::parse($b);
        if ($pa === null || $pb === null) {
            return null;
        }

        return $pa <=> $pb; // 같은 길이 정수 배열 → 앞자리부터 비교
    }

    /** 버전이 최소보다 낮은지 — 어느 쪽이든 못 읽으면 false(막지 않음) */
    public static function isBelow(mixed $version, mixed $min): bool
    {
        return self::compare($version, $min) === -1;
    }

    /** "Android"·" IOS " → 'android'·'ios', 그 외 null */
    public static function platform(mixed $raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }
        $p = strtolower(trim($raw));

        return in_array($p, self::PLATFORMS, true) ? $p : null;
    }

    /**
     * 플랫폼별 업데이트 정책(config/app_version.php ← .env). 잘못된 설정에도 안전하게:
     *   최소 버전 못 읽음 → 1.0.0(아무도 안 막음), 최신 못 읽음 → 최소와 같게, 최신 < 최소 → 최소로 올림.
     *   apk_url은 Android에만(iPhone엔 APK가 의미 없어 null). 빈 주소·빈 문구는 null.
     *   ★ v18.69 — 안내 문구(APP_UPDATE_MESSAGE)는 여러 줄 가능("|" 또는 줄바꿈으로 구분, notes() 참고)
     *     notes = 줄 목록(앱이 체크 표시 줄로 그림), message = 그 줄들을 "\n"으로 이은 글(예전 앱 호환, 없으면 null)
     *
     * @return array{min_version:string, latest_version:string, store_url:?string, apk_url:?string, message:?string, notes:list<string>}
     */
    public static function policy(string $platform): array
    {
        $cfg = (array) config("app_version.platforms.{$platform}", []);

        $min = self::normalize($cfg['min'] ?? null) ?? self::FALLBACK;
        $latest = self::normalize($cfg['latest'] ?? null) ?? $min;
        if (self::isBelow($latest, $min)) {
            $latest = $min;
        }
        $notes = self::notes(config('app_version.message'));

        return [
            'min_version'    => $min,
            'latest_version' => $latest,
            'store_url'      => self::text($cfg['store_url'] ?? null),
            'apk_url'        => $platform === 'android' ? self::text(config('app_version.apk_url')) : null,
            'message'        => $notes === [] ? null : implode("\n", $notes),
            'notes'          => $notes,
        ];
    }

    /**
     * ★ v18.69 — 안내 문구 → 줄 목록. "|"·줄바꿈(\n·\r\n·\r)·글자 그대로의 "\n"(따옴표 없이 쓴 .env 값) 어느 것으로든 나눔.
     *   줄마다 앞뒤 공백 제거, 빈 줄은 빼고, 최대 MAX_NOTES(5)줄. 글자가 아니면(null·배열 등) 빈 목록.
     *   예: "회원가입 휴대폰 인증이 추가됐어요|자잘한 오류를 고쳤어요" → ['회원가입 휴대폰 인증이 추가됐어요', '자잘한 오류를 고쳤어요']
     *   ※ 구분 기호가 전부 ASCII라 /u 없이 바이트로 나눠도 한글(UTF-8 여러 바이트)이 잘리지 않음
     *   ★ v18.69 — UTF-8이 아닌 글(예: .env를 CP949·EUC-KR로 저장)이면 빈 목록 → 문구 없이 안내.
     *     그대로 두면 JSON으로 못 바꿔 /api/app/version과 426 응답이 둘 다 500("Malformed UTF-8")이 되어
     *     옛 앱이 업데이트 화면 대신 모든 화면에서 오류만 봤음. 깨진 글자("?")로 바꿔 보여 주는 것보다 안 보이는 게 나음
     *
     * @return list<string>
     */
    public static function notes(mixed $raw): array
    {
        if (!is_string($raw) || !mb_check_encoding($raw, 'UTF-8')) {
            return [];
        }
        $lines = [];
        foreach (preg_split('/\||\\\\n|\r\n|\r|\n/', $raw) ?: [] as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $lines[] = $line;
            if (count($lines) >= self::MAX_NOTES) {
                break;
            }
        }

        return $lines;
    }

    /** 'required'(최소보다 낮음) | 'optional'(최소 이상, 최신보다 낮음) | 'none'(최신 이상 또는 버전 모름) */
    public static function status(?string $current, string $min, string $latest): string
    {
        if (self::parse($current) === null) {
            return 'none';
        }
        if (self::isBelow($current, $min)) {
            return 'required';
        }

        return self::isBelow($current, $latest) ? 'optional' : 'none';
    }

    /** @return array{0:int,1:int,2:int}|null */
    private static function parse(mixed $raw): ?array
    {
        if (is_int($raw) && $raw >= 0) {
            $raw = (string) $raw;
        }
        if (!is_string($raw)) {
            return null;
        }
        $raw = trim($raw);
        if ($raw === '' || strlen($raw) > self::MAX_LENGTH || !preg_match(self::PATTERN, $raw, $m)) {
            return null;
        }

        return [(int) $m[1], (int) ($m[2] ?? 0), (int) ($m[3] ?? 0)];
    }

    /** 주소 설정값 — 빈 값·UTF-8이 아닌 값(★ v18.69, notes()와 같은 이유: JSON 500 방지)은 null */
    private static function text(mixed $v): ?string
    {
        $v = is_string($v) && mb_check_encoding($v, 'UTF-8') ? trim($v) : '';

        return $v === '' ? null : $v;
    }
}
