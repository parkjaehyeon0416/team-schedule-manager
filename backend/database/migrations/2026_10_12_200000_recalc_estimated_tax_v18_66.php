<?php

use App\Services\MonthlySummaryService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ★ v18.66 — 예상 원천세 계산식 변경에 맞춰 저장된 월별 집계(monthly_summaries)를 전부 다시 계산.
 *   - 지방소득세(소득세의 10%) 포함, 소액부징수(1회 지급분 소득세 1,000원 미만 → 0원) 적용
 *   - 일용근로 15만원 공제를 하루 지급액(일당 × 공수)에서 빼도록 수정
 *   - 집계할 때 고용형태(employment_type)를 안 읽어 프리랜서도 일용근로 식으로 계산되던 문제 수정
 *   계산은 MonthlySummaryService::recalculate 그대로 사용(실수령액도 함께 갱신됨).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('monthly_summaries')
            ->select('id', 'user_id', 'year_month')
            ->orderBy('id')
            ->each(function ($row) {
                try {
                    MonthlySummaryService::recalculate((int) $row->user_id, (string) $row->year_month);
                } catch (\Throwable $e) {
                    // 한 행이 실패해도 배포가 멈추지 않게 기록만 남김(해당 월은 그 달 일정을 수정하면 다시 계산됨)
                    Log::warning('v18.66 예상 원천세 재계산 실패', [
                        'summary_id' => $row->id,
                        'user_id'    => $row->user_id,
                        'year_month' => $row->year_month,
                        'error'      => $e->getMessage(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        // 되돌릴 값 없음(잘못된 예전 식으로 다시 계산하지 않음)
    }
};
