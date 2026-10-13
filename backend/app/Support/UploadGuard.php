<?php

namespace App\Support;

use App\Constants\ErrorCode;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;

/**
 * ★ v18.67 보안 — 사진 업로드 공용 제한 (문의 첨부·프로필 사진·팀 사진)
 *
 *   - 저장하기 전에 getimagesize로 머리글만 읽어 진짜 이미지인지, 가로·세로 6000픽셀 이하인지 확인.
 *     파일 용량(5~10MB)은 작아도 픽셀이 엄청 큰 이미지(예: 투명 PNG 수만 픽셀)는 나중에 PDF·썸네일 등으로
 *     펼칠 때 메모리를 다 써 버리므로 아예 받지 않음. 앱은 800~1600픽셀로 줄여 올려서 영향 없음.
 *   - 사용자별 하루 업로드 장수 상한(무료 계정 하나로 디스크를 채우지 못하게).
 *   안내 문구가 앱 알림창에 그대로 보이도록 message에 이유를 담아 돌려줌.
 */
final class UploadGuard
{
    public const MAX_SIDE = 6000;

    /** 저장 전 이미지 확인 — 문제가 있으면 422 응답, 괜찮으면 null */
    public static function imageError(?UploadedFile $file): ?JsonResponse
    {
        if (!$file) {
            return null;
        }
        $info = @getimagesize($file->getRealPath());
        if (!$info || empty($info[0]) || empty($info[1])
            || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            return ApiResponse::error('사진 파일을 읽을 수 없어요. 다른 사진을 골라주세요.', ErrorCode::VALID_GENERAL, 422);
        }
        if ($info[0] > self::MAX_SIDE || $info[1] > self::MAX_SIDE) {
            return ApiResponse::error('사진이 너무 커요. 가로·세로 ' . self::MAX_SIDE . '픽셀 이하 사진을 올려주세요.', ErrorCode::VALID_GENERAL, 422);
        }

        return null;
    }

    /** 여러 장 한 번에 확인 — 첫 번째 문제 응답, 모두 괜찮으면 null */
    public static function imagesError(array $files): ?JsonResponse
    {
        foreach ($files as $file) {
            if ($fail = self::imageError($file instanceof UploadedFile ? $file : null)) {
                return $fail;
            }
        }

        return null;
    }

    /**
     * 하루 업로드 장수 상한 — 이번에 올릴 $count장을 더해 $max를 넘으면 429 응답(셈은 되돌림), 아니면 셈에 더하고 null.
     *   $bucket: 'inquiry' | 'avatar' | 'team_photo' …, $label: 안내 문구에 들어갈 이름(예: '문의 사진')
     */
    public static function dailyLimit(string $bucket, int $userId, int $count, int $max, string $label): ?JsonResponse
    {
        if ($count <= 0) {
            return null;
        }
        $key = "upload_daily:{$bucket}:{$userId}:" . now()->format('Ymd');
        Cache::add($key, 0, now()->endOfDay()); // DB 캐시는 없는 키를 increment 못 함
        $used = (int) Cache::increment($key, $count);
        if ($used > $max) {
            Cache::decrement($key, $count);
            return ApiResponse::error("오늘은 {$label}을 더 올릴 수 없어요(하루 {$max}장까지). 내일 다시 시도해주세요.", ErrorCode::TOO_MANY_REQUESTS, 429);
        }

        return null;
    }
}
