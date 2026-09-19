<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\UserMaterial;
use Illuminate\Http\Request;

/**
 * 내 자재 목록 — ★ v12 신규
 *
 * 기획서 ServicePlan_v2_6: "사용자가 새 항목 입력 시 자동으로 '내 자재 목록'에
 * 저장"되는 항목을 직접 관리(목록 조회/숨김/삭제)하는 컨트롤러.
 * 실제 자동 저장/사용횟수 증가 로직은 QuoteController::store()에서 처리한다.
 */
class UserMaterialController extends Controller
{
    /**
     * 내 자재 목록 조회 — 자주 쓰는 순(usage_count desc) 정렬
     * GET /api/materials?work_type_id=
     */
    public function index(Request $request)
    {
        $query = UserMaterial::where('user_id', $request->user()->id)
            ->where('is_hidden', false);

        if ($workTypeId = $request->query('work_type_id')) {
            $query->where('work_type_id', $workTypeId);
        }

        $materials = $query->orderByDesc('usage_count')
            ->orderByDesc('last_used_at')
            ->get();

        return ApiResponse::success($materials, '자재 목록 조회 성공');
    }

    /**
     * 자재 숨김 처리 (완전 삭제하지 않고 목록에서만 제외 — 과거 견적 라인 참조 보존)
     * DELETE /api/materials/{id}
     */
    public function destroy(Request $request, string $id)
    {
        $material = UserMaterial::where('user_id', $request->user()->id)->find($id);

        if (!$material) {
            return ApiResponse::error('존재하지 않는 자재입니다.', ErrorCode::MATERIAL_NOT_FOUND, 404);
        }

        $material->is_hidden = true;
        $material->save();

        return ApiResponse::success(null, '자재가 목록에서 제거되었습니다.');
    }
}
