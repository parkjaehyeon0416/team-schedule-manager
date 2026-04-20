<?php

namespace App\Http\Controllers\Api;

use App\Models\Schedule;                   // ★ 추가
use App\Http\Responses\ApiResponse;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // ★ with()로 관계 데이터 같이 불러오기 (N+1 쿼리 방지 + 프론트에 필요한 데이터 포함)
        $schedules = Schedule::with(['users:id,name', 'site:id,apt_name,dong,ho'])
            ->when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->orderBy('date', 'desc')
            ->get();

        return ApiResponse::success($schedules, '일정 조회 성공');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
