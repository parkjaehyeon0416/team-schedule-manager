<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WorkTypeController extends Controller
{
    /**
     * 공정 목록 조회
     * GET /api/work-types
     *
     * 반환 조건:
     *   1) is_active = true
     *   2) team_id IS NULL (공용 공정)
     *   3) 또는 team_id = 로그인 사용자의 team_id (우리 팀 공정)
     *
     * 정렬: sort_order ASC → id ASC
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = WorkType::where('is_active', true)
            ->where(function ($q) use ($user) {
                // 공용 공정 (모든 팀이 볼 수 있음)
                $q->whereNull('team_id');

                // 우리 팀 커스텀 공정 (팀 소속 사용자만)
                if ($user && $user->team_id) {
                    $q->orWhere('team_id', $user->team_id);
                }
            })
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        $workTypes = $query->get([
            'id',
            'name',
            'code',
            'color',
            'icon',
            'team_id',
            'sort_order',
        ]);

        return response()->json([
            'success'    => true,
            'message'    => '공정 목록 조회 성공',
            'data'       => $workTypes,
            'error_code' => null,
        ]);
    }
}
