<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Models\UserWageSetting;
use App\Models\WorkType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class UserWageSettingController extends Controller
{
    /**
     * ★ v18.68 보안 — 단가 행에 붙여 내려주는 공정 정보는 "지금 내가 볼 수 있는 공정"만.
     *   예전(검사 없던 때) 남의 개인 공정·다른 팀 공정 번호로 저장된 행이 남아 있어도
     *   그 공정 이름·색상은 안 나가고 work_type: null 로 내려감(단가 값·work_type_id 는 그대로 —
     *   팀을 나간 사람도 예전 단가 유지). 앱은 work_type_id 로 /work-types 목록과 맞춰 쓰므로 화면 영향 없음.
     */
    private function visibleWorkType($user): array
    {
        return ['workType' => fn ($q) => $q->forUser($user)->select('id', 'name', 'code', 'color', 'icon')];
    }

    /**
     * 내 단가 목록 조회
     * GET /api/wage-settings
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $settings = UserWageSetting::where('user_id', $user->id)
            ->with($this->visibleWorkType($user)) // ★ v18.68 볼 수 없는 공정은 이름·색상 안 내보냄
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

        // ★ v18.68 보안 — 내가 볼 수 있는 공정(공용 + 소속 팀 공정 + 내 개인 공정)에만 단가를 둘 수 있음.
        //   예전엔 "DB에 있는 번호"인지만 봐서 남의 개인 공정·다른 팀 공정 번호로 단가를 저장하면
        //   목록(GET /wage-settings)에 그 공정 이름·색상이 같이 내려왔음. 지운 공정도 forUser에서 빠짐.
        if (!WorkType::forUser($user)->whereKey($workTypeId)->exists()) {
            return response()->json([
                'success'    => false,
                'message'    => '선택할 수 없는 공정입니다.',
                'data'       => null,
                'error_code' => ErrorCode::WORKTYPE_NOT_FOUND,
            ], 422);
        }

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
        $setting->load($this->visibleWorkType($user)); // ★ v18.68 목록과 같은 기준

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
