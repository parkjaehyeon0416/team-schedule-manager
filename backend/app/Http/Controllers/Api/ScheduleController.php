<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    // ─── ① 스케줄 목록 조회 ───
    public function index(Request $request)
    {
        $user = $request->user();

        // ★ 전체/개인/팀 토글 필터 — 기본은 전체
        $scope = $request->query('scope', 'all');
        if (!in_array($scope, ['all', 'personal', 'team'], true)) {
            $scope = 'all';
        }

        $query = Schedule::with([
            'users:id,name',
            'site:id,address,apt_name,dong,ho',
        ])
            ->forUser($user, $scope)
            ->orderBy('date');

        if ($year = $request->query('year')) {
            $query->whereYear('date', $year);
        }
        if ($month = $request->query('month')) {
            $query->whereMonth('date', $month);
        }

        $schedules = $query->get();

        return ApiResponse::success($schedules, '일정 목록 조회 성공');
    }

    // ─── ② 스케줄 등록 ───
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'date'          => 'required|date',
            'district'      => 'nullable|string|max:100',
            // 기존 ENUM 방식 (v7 호환)
            'work_type'     => 'nullable|in:도배,타일,필름',
            // ★ v9.0 추가 공수/급여 필드
            'work_type_id'  => 'nullable|integer|exists:work_types,id',
            'daily_wage'    => 'nullable|numeric|min:0|max:99999999.99',
            'work_units'    => 'nullable|numeric|min:0|max:99.9',
            'expenses'      => 'nullable|numeric|min:0|max:99999999.99',
            'expenses_memo' => 'nullable|string|max:255',

            'area_m2'       => 'nullable|numeric|min:0',
            'memo'          => 'nullable|string',
            'user_ids'      => 'nullable|array',
            'user_ids.*'    => 'integer|exists:users,id',
            'site_id'       => 'nullable|integer|exists:sites,id',
            // ★ 팀 소속이어도 개인용으로 등록하고 싶을 때 true — team_id 없이 owner_id로 감
            'is_personal'   => 'nullable|boolean',
        ]);

        // 팀 소속이면서 개인으로 명시하지 않은 경우에만 team_id를 부여, 그 외엔 전부 개인(owner_id)
        $wantsPersonal = $request->boolean('is_personal') || !$user->team_id;
        $data['team_id']    = $wantsPersonal ? null : $user->team_id;
        $data['owner_id']   = $wantsPersonal ? $user->id : null;
        $data['created_by'] = $user->id;

        // ★ v18.16 — 현장+날짜+공정이 완전히 같은 일정 중복 등록 방지(더블탭 방지 목적).
        //   같은 현장에 같은 날 다른 공정(전기팀/설비팀 등)을 각각 등록하는 건 정상 케이스라
        //   막지 않고, site_id+date+work_type_id가 전부 일치할 때만 차단함.
        if (!empty($data['site_id'])) {
            $duplicate = Schedule::where('site_id', $data['site_id'])
                ->where('date', $data['date'])
                ->when(
                    $data['work_type_id'] ?? null,
                    fn($q, $wtId) => $q->where('work_type_id', $wtId),
                    fn($q) => $q->whereNull('work_type_id'),
                )
                ->when(
                    $data['team_id'],
                    fn($q, $teamId) => $q->where('team_id', $teamId),
                    fn($q) => $q->whereNull('team_id'),
                )
                ->when(
                    $data['owner_id'],
                    fn($q, $ownerId) => $q->where('owner_id', $ownerId),
                    fn($q) => $q->whereNull('owner_id'),
                )
                ->exists();

            if ($duplicate) {
                return ApiResponse::error(
                    '이미 같은 현장·날짜·공정으로 등록된 일정이 있습니다.',
                    ErrorCode::SCHEDULE_DUPLICATE,
                    409,
                );
            }
        }

        // 1) 기본 정보 생성 (v9.0 신규 필드 포함)
        $schedule = Schedule::create([
            'date'          => $data['date'],
            'district'      => $data['district']     ?? null,
            'work_type'     => $data['work_type']    ?? null,
            // ★ v9.0 추가
            'work_type_id'  => $data['work_type_id'] ?? null,
            'daily_wage'    => $data['daily_wage']   ?? null,
            'work_units'    => $data['work_units']   ?? 1.0,
            'expenses'      => $data['expenses']     ?? 0,
            'expenses_memo' => $data['expenses_memo']?? null,

            'area_m2'       => $data['area_m2']      ?? null,
            'memo'          => $data['memo']         ?? null,
            'team_id'       => $data['team_id'],
            'owner_id'      => $data['owner_id'],
            'created_by'    => $data['created_by'],
            'site_id'       => $data['site_id']      ?? null,
            'status'        => 'pending',
        ]);

        // 2) 투입 인원 배정
        if (!empty($data['user_ids'])) {
            $schedule->users()->attach($data['user_ids']);

            // ★ v10.2 패치 — schedule_users 연결 후 Observer 재발동
            //   (monthly_summary 자동 갱신 트리거)
            $schedule->touch();
        }

        // 3) 응답에 관계 데이터 포함
        $schedule->load(['users:id,name', 'site:id,address,apt_name,dong,ho']);

        return ApiResponse::success($schedule, '일정이 등록되었습니다.', 201);
    }

    // ─── ③ 스케줄 상세 조회 ───
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $schedule = Schedule::with(['users:id,name', 'site:id,address,apt_name,dong,ho'])
            ->forUser($user)
            ->find($id);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        return ApiResponse::success($schedule, '일정 조회 성공');
    }

    // ─── ④ 스케줄 수정 ───
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $schedule = Schedule::editableBy($user)
            ->find($id);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $data = $request->validate([
            'date'          => 'sometimes|date',
            'district'      => 'nullable|string|max:100',
            'work_type'     => 'nullable|in:도배,타일,필름',
            // ★ v9.0 추가 공수/급여 필드
            'work_type_id'  => 'nullable|integer|exists:work_types,id',
            'daily_wage'    => 'nullable|numeric|min:0|max:99999999.99',
            'work_units'    => 'nullable|numeric|min:0|max:99.9',
            'expenses'      => 'nullable|numeric|min:0|max:99999999.99',
            'expenses_memo' => 'nullable|string|max:255',

            'area_m2'       => 'nullable|numeric|min:0',
            'memo'          => 'nullable|string',
            'user_ids'      => 'nullable|array',
            'user_ids.*'    => 'integer|exists:users,id',
            'site_id'       => 'nullable|integer|exists:sites,id',
        ]);

        $schedule->update($data);

        // 투입 인원 재배정
        if (isset($data['user_ids'])) {
            $schedule->users()->sync($data['user_ids']);

            // ★ v10.2 패치 — schedule_users 변경 후 Observer 재발동
            //   (monthly_summary 자동 갱신 트리거)
            $schedule->touch();
        }

        $schedule->load(['users:id,name', 'site:id,address,apt_name,dong,ho']);

        return ApiResponse::success($schedule, '일정이 수정되었습니다.');
    }

    // ─── ⑤ 스케줄 삭제 ───
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $schedule = Schedule::editableBy($user)
            ->find($id);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        $schedule->delete();

        return ApiResponse::success(null, '일정이 삭제되었습니다.');
    }
}
