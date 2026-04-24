<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonthlySummary;
use App\Services\MonthlySummaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MonthlySummaryController extends Controller
{
    /**
     * 월별 집계 조회
     * GET /api/monthly-summary?year=2026&month=4
     *
     * 동작:
     *   1) year, month 검증
     *   2) monthly_summaries에서 캐시 조회
     *   3) 캐시 있음 → 즉시 반환 (빠름)
     *   4) 캐시 없음 → Service 호출해서 계산+저장 → 반환
     */
    public function show(Request $request)
    {
        $user = Auth::user();

        // 1) 입력값 검증
        $validator = Validator::make($request->all(), [
            'year'  => 'required|integer|min:2020|max:2099',
            'month' => 'required|integer|min:1|max:12',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success'    => false,
                'message'    => '연도와 월을 확인해주세요.',
                'data'       => $validator->errors(),
                'error_code' => 'ERR_VALID_001',
            ], 422);
        }

        $year  = (int) $request->input('year');
        $month = (int) $request->input('month');

        // '2026-04' 형식으로 변환 (한 자리 월은 앞에 0 붙임)
        $yearMonth = sprintf('%04d-%02d', $year, $month);

        // 2) 캐시 먼저 조회
        $summary = MonthlySummary::where('user_id', $user->id)
            ->where('year_month', $yearMonth)
            ->first();

        // 3) 캐시 없으면 Service로 실시간 계산 + 저장
        if (!$summary) {
            try {
                $summary = MonthlySummaryService::recalculate($user->id, $yearMonth);
            } catch (\Exception $e) {
                return response()->json([
                    'success'    => false,
                    'message'    => '집계 계산 중 오류가 발생했습니다.',
                    'data'       => null,
                    'error_code' => 'ERR_SUMMARY_002',
                ], 500);
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => '월별 집계 조회 성공',
            'data'       => $summary,
            'error_code' => null,
        ]);
    }
}
