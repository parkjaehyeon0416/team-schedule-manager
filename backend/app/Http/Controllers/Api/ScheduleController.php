<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Schedule;
use App\Http\Responses\ApiResponse;
use App\Services\MonthlySummaryService;
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
            'workTypeRelation', // ★ 공정 이름/색상 표시용 — 기존엔 누락되어 있었음
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
            // ★ v18.34 — 현장 등록 없이 적는 주소 / 동·호수
            'address'        => 'nullable|string|max:255',
            'address_detail' => 'nullable|string|max:100',
            // ★ 팀 소속이어도 개인용으로 등록하고 싶을 때 true — team_id 없이 owner_id로 감
            'is_personal'   => 'nullable|boolean',
            // ★ DESIGN-CANVAS(SCHEDULE_CREATE) 추가
            'title'          => 'nullable|string|max:100',
            'start_time'     => 'nullable|date_format:H:i',
            'end_time'       => 'nullable|date_format:H:i',
            'reminder_time'  => 'nullable|string|max:30',
            // ★ DESIGN-CANVAS(TAX_MONTH_DETAIL/INCOME_DETAIL) 추가
            'employment_type' => 'nullable|in:daily,freelance',
            'payment_status'  => 'nullable|in:pending,paid',
            // ★ 여러 팀 소속 중 어느 팀 일정으로 등록할지 명시적으로 고를 수 있음
            'team_id'        => 'nullable|integer',
        ]);

        // 팀을 명시적으로 지정했으면 그 팀 소속인지 검증 후 사용, 아니면 기존 로직(활성 팀/개인) 유지
        $requestedTeamId = $data['team_id'] ?? null;
        unset($data['team_id']);
        if ($requestedTeamId !== null && !in_array($requestedTeamId, $user->teamIds(), true)) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::SCHEDULE_NOT_FOUND, 422);
        }

        $wantsPersonal = $requestedTeamId === null
            ? ($request->boolean('is_personal') || !$user->team_id)
            : false;
        $data['team_id']    = $wantsPersonal ? null : ($requestedTeamId ?? $user->team_id);
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
            'title'         => $data['title']         ?? null,
            'start_time'    => $data['start_time']    ?? null,
            'end_time'      => $data['end_time']      ?? null,
            'reminder_time' => $data['reminder_time'] ?? null,
            'employment_type' => $data['employment_type'] ?? 'daily',
            'payment_status'  => $data['payment_status']  ?? 'pending',
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
            'address'        => $data['address']        ?? null,
            'address_detail' => $data['address_detail'] ?? null,
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
        $schedule->load(['users:id,name', 'site:id,address,apt_name,dong,ho', 'workTypeRelation']);

        // ★ DESIGN-CANVAS(NOTIFICATIONS) 추가 — 팀 일정이면 작성자 본인을 뺀 나머지 팀원에게 알림
        if ($schedule->team_id) {
            $otherMemberIds = \Illuminate\Support\Facades\DB::table('team_members')
                ->where('team_id', $schedule->team_id)
                ->where('user_id', '!=', $user->id)
                ->whereNull('deleted_at')
                ->pluck('user_id');

            foreach ($otherMemberIds as $memberId) {
                Notification::create([
                    'user_id'   => $memberId,
                    'category'  => 'team',
                    'title'     => '팀 활동',
                    'body'      => "{$user->name}님이 일정을 추가했어요.",
                    'link_type' => 'schedule',
                    'link_id'   => $schedule->id,
                ]);
            }
        }

        return ApiResponse::success($schedule, '일정이 등록되었습니다.', 201);
    }

    // ─── ③ 스케줄 상세 조회 ───
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $schedule = Schedule::with(['users:id,name', 'site:id,address,apt_name,dong,ho', 'workTypeRelation'])
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
            // ★ v18.34 — 현장 등록 없이 적는 주소 / 동·호수
            'address'        => 'nullable|string|max:255',
            'address_detail' => 'nullable|string|max:100',
            // ★ DESIGN-CANVAS(SCHEDULE_EDIT) 추가
            'title'          => 'nullable|string|max:100',
            'start_time'     => 'nullable|date_format:H:i',
            'end_time'       => 'nullable|date_format:H:i',
            'reminder_time'  => 'nullable|string|max:30',
            'employment_type' => 'nullable|in:daily,freelance',
            'payment_status'  => 'nullable|in:pending,paid',
            'team_id'        => 'nullable|integer',
            'is_personal'    => 'nullable|boolean',
        ]);

        if (array_key_exists('team_id', $data) || $request->has('is_personal')) {
            $requestedTeamId = $data['team_id'] ?? null;
            if ($requestedTeamId !== null && !in_array($requestedTeamId, $user->teamIds(), true)) {
                return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::SCHEDULE_NOT_FOUND, 422);
            }
            $wantsPersonal = $requestedTeamId === null ? $request->boolean('is_personal') : false;
            $data['team_id']  = $wantsPersonal ? null : $requestedTeamId;
            $data['owner_id'] = $wantsPersonal ? $user->id : null;
        }
        unset($data['is_personal']);

        // ★ v18.20 — 인원 배정 해제/날짜 이동 시 "떠나간 쪽" 월별 공수 집계가 그대로 남는
        //   버그 수정. Observer는 저장 시점의 "현재" 배정자·날짜만 재계산하므로, 바뀌기
        //   전의 배정자/월을 미리 기록해뒀다가 그쪽도 따로 재계산해줘야 함.
        $oldUserIds  = $schedule->users()->pluck('users.id')->all();
        $oldYearMonth = $schedule->date instanceof \Carbon\Carbon
            ? $schedule->date->format('Y-m')
            : substr((string) $schedule->date, 0, 7);

        $schedule->update($data);

        $newYearMonth = $schedule->date instanceof \Carbon\Carbon
            ? $schedule->date->format('Y-m')
            : substr((string) $schedule->date, 0, 7);

        // 투입 인원 재배정
        if (isset($data['user_ids'])) {
            $schedule->users()->sync($data['user_ids']);

            // ★ v10.2 패치 — schedule_users 변경 후 Observer 재발동
            //   (monthly_summary 자동 갱신 트리거, 잔류/신규 배정자 대상)
            $schedule->touch();

            // ★ v18.20 — sync()로 완전히 빠진 사람은 위 touch()가 재계산하는 "현재 배정자"
            //   목록에 없어서 공수가 그대로 남아있는 버그 수정. 빠진 사람만 옛 월 기준으로 재계산.
            $removedUserIds = array_diff($oldUserIds, $data['user_ids']);
            foreach ($removedUserIds as $removedUserId) {
                MonthlySummaryService::recalculate((int) $removedUserId, $oldYearMonth);
            }
        }

        // ★ v18.20 — 날짜가 다른 달로 이동한 경우, 잔류(=해제 안 된) 배정자들의 "옛 달"
        //   집계도 재계산해서 옮겨지기 전 달에서 이 일정이 빠졌다는 걸 반영해야 함.
        if ($oldYearMonth !== $newYearMonth) {
            $stayingUserIds = isset($data['user_ids'])
                ? array_intersect($oldUserIds, $data['user_ids'])
                : $oldUserIds;
            foreach ($stayingUserIds as $stayingUserId) {
                MonthlySummaryService::recalculate((int) $stayingUserId, $oldYearMonth);
            }
        }

        $schedule->load(['users:id,name', 'site:id,address,apt_name,dong,ho', 'workTypeRelation']);

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
