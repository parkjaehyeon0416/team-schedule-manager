<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * 성공 응답
     * 사용법: ApiResponse::success($data, '메시지', 200)
     *
     * @param mixed  $data    실제 응답 데이터 (유저 정보, 일정 목록 등)
     * @param string $message 성공 메시지 (선택사항)
     * @param int    $status  HTTP 상태코드 (기본값 200)
     */
    public static function success(
        mixed $data = null,
        string $message = '',
        int $status = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    /**
     * 실패 응답
     * 사용법: ApiResponse::error('메시지', 'ERR_AUTH_001', 401)
     *
     * @param string $message    오류 메시지
     * @param string $error_code 커스텀 에러코드
     * @param int    $status     HTTP 상태코드 (기본값 400)
     */
    public static function error(
        string $message = '오류가 발생했습니다.',
        string $error_code = '',
        int $status = 400
    ): JsonResponse {
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $error_code,
        ], $status);
    }
}
