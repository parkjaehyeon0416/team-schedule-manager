<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserWageSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class UserWageSettingController extends Controller
{
    /**
     * 내 단가 목록 조회
     * GET /api/wage-settings
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $settings = UserWageSetting::where('user_id', $user->id)
            ->with('workType:id,name,code,color,icon')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success'    => true,
            'message'    => '단가 목록 조회 성공',
            'data'       => $settings,
            'error_code' => null,
        ]);
    }

    /**
     * 단가 등록/수정 (updateOrCreate)
     * POST /api/wage-settings
     *
     * Body:
     *   work_type_id       (integer, required)
     *   default_wage       (numeric, required, min:0)
     *   default_work_units (numeric, optional, min:0.1, default:1.0)
     *   memo               (string, optional, max:255)
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // 1) 입력값 검증
        $validator = Validator::make($request->all(), [
            'work_type_id'       => 'required|integer|exists:work_types,id',
            'default_wage'       => 'required|numeric|min:0|max:99999999.99',
            'default_work_units' => 'sometimes|numeric|min:0.1|max:99.9',
            'memo'               => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success'    => false,
                'message'    => '입력값을 확인해주세요.',
                'data'       => $validator->errors(),
                'error_code' => 'ERR_VALID_001',
            ], 422);
        }

        $workTypeId       = (int) $request->input('work_type_id');
        $defaultWage      = $request->input('default_wage');
        $defaultWorkUnits = $request->input('default_work_units', 1.0);
        $memo             = $request->input('memo');

        // 2) updateOrCreate: 있으면 업데이트, 없으면 생성
        // ✅ 수정 — SoftDelete된 레코드까지 포함해서 찾고 복원
        $setting = UserWageSetting::withTrashed()
            ->where('user_id', $user->id)
            ->where('work_type_id', $workTypeId)
            ->first();

        if ($setting) {
            // 기존 레코드(삭제된 것 포함) 발견 → 복원 + 업데이트
            $setting->restore();  // deleted_at = null 로 복원
            $setting->update([
                'default_wage'       => $defaultWage,
                'default_work_units' => $defaultWorkUnits,
                'memo'               => $memo,
            ]);
        } else {
            // 진짜 신규 → INSERT
            $setting = UserWageSetting::create([
                'user_id'            => $user->id,
                'work_type_id'       => $workTypeId,
                'default_wage'       => $defaultWage,
                'default_work_units' => $defaultWorkUnits,
                'memo'               => $memo,
            ]);
        }

        // 3) workType 관계 데이터 함께 로드
        $setting->load('workType:id,name,code,color,icon');

        return response()->json([
            'success'    => true,
            'message'    => '단가가 저장되었습니다.',
            'data'       => $setting,
            'error_code' => null,
        ]);
    }

    /**
     * 단가 삭제
     * DELETE /api/wage-settings/{id}
     */
    public function destroy($id)
    {
        $user = Auth::user();

        // 본인 소유 + 해당 ID 레코드만 조회 (보안 핵심!)
        $setting = UserWageSetting::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$setting) {
            return response()->json([
                'success'    => false,
                'message'    => '존재하지 않거나 권한이 없는 단가 설정입니다.',
                'data'       => null,
                'error_code' => 'ERR_WAGE_001',
            ], 404);
        }

        $setting->delete();  // SoftDelete

        return response()->json([
            'success'    => true,
            'message'    => '단가가 삭제되었습니다.',
            'data'       => null,
            'error_code' => null,
        ]);
    }
}
