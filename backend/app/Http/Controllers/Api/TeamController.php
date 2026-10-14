<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TeamController extends Controller
{
    /**
     * ─── ① 팀 목록 조회 ───
     *   본인이 소속된 모든 팀(★ v18.21 — 여러 팀 동시 소속 지원)
     *   각 팀에 active(지금 활성 팀인지) 플래그를 같이 내려줌.
     *   ★ v18.68 보안 — 예전엔 role_id=1(superadmin)이면 전체 팀 목록을 줬음. 운영자는 앱 API가 막혀 있고
     *   (BlockOperatorFromApp), 일반 계정의 role_id가 1이 돼도 남의 팀이 보이면 안 되므로 그 우회를 없앰.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $teams = $user->teams()->orderByDesc('teams.id')->get();
        $teams->each(function ($team) use ($user) {
            $team->is_active = $team->id === $user->team_id;
            // ★ v18.44 — 팀마다 내 역할(활성 팀과 무관하게 앱이 팀장 기능을 보여줄지 판단)
            $team->my_role_id = (int) $team->pivot->role_id;
            $team->is_leader  = $team->my_role_id <= 2;
            // ★ v18.47 — 부팀장(일정 배정 가능), 팀 요금제 기능 사용 가능 여부(앱이 메뉴를 보여줄지 판단)
            $team->is_sub_leader = $user->isSubLeaderOf($team->id);
            $team->can_assign    = $team->is_leader || $team->is_sub_leader;
            $team->team_features = collect(['team_attendance', 'team_settlement', 'team_album', 'team_sub_leader', 'team_notice', 'team_unlimited_members'])
                ->mapWithKeys(fn($f) => [$f => \App\Services\PlanService::teamCan($team->id, $f)])->all();
            // ★ v18.48 — 팀 상세 메뉴 타일: 안 읽은 공지 수(남이 쓴 것), 현장 앨범 사진 수
            $readAt = DB::table('team_members')->where('team_id', $team->id)->where('user_id', $user->id)->whereNull('deleted_at')->value('notices_read_at');
            $team->notice_unread = \App\Models\TeamNotice::where('team_id', $team->id)->where('user_id', '!=', $user->id)
                ->when($readAt, fn($q) => $q->where('created_at', '>', $readAt))->count();
            $team->photo_count = DB::table('site_files')->join('sites', 'sites.id', '=', 'site_files.site_id')
                ->where('sites.team_id', $team->id)->whereNull('sites.deleted_at')->whereNull('site_files.deleted_at')
                ->where('site_files.file_type', 'photo')->count();
        });

        return ApiResponse::success($teams, '팀 목록 조회 성공');
    }

    /**
     * ─── ② 팀 생성 ───
     *   ★ v18.21 — 이미 다른 팀에 소속되어 있어도 새 팀을 만들 수 있음(여러 팀 동시 소속).
     *   새로 만든 팀이 바로 "활성 팀"이 되고, 그 팀 안에서 manager로 등록됨.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'description'   => 'nullable|string|max:1000',
            'specialty'     => 'nullable|string|max:255',
            'activity_area' => 'nullable|string|max:100',
            'photo'         => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        // ★ v18.47 — 무료는 팀장으로 1팀까지(여러 팀 운영은 팀 요금제)
        $ledLimit = \App\Services\PlanService::limit($user, 'led_teams', 'multi_team_lead');
        if ($ledLimit !== null && count($user->ledTeamIds()) >= $ledLimit) {
            return \App\Services\PlanService::denied('multi_team_lead', '무료로는 팀을 1개까지 만들 수 있어요. 여러 팀 운영은 팀 요금제에서 쓸 수 있어요.',
                ['limit' => $ledLimit, 'used' => count($user->ledTeamIds()), 'unit' => '팀']);
        }
        if ($fail = $this->teamPhotoError($request, $user)) { // ★ v18.67
            return $fail;
        }

        $team = Team::create([
            'name'          => $data['name'],
            'description'   => $data['description'] ?? null,
            'specialty'     => $data['specialty'] ?? null,
            'activity_area' => $data['activity_area'] ?? null,
            'photo_path'    => $request->hasFile('photo') ? $request->file('photo')->store('teams', 'public') : null,
            'invite_code'   => $this->generateInviteCode(),
            'invite_expires_at' => now()->addDays(Team::INVITE_DAYS),
            'created_by'    => $user->id,
        ]);

        // 팀 생성과 동시에 그 팀의 manager
        //   ★ v18.68 — 예전엔 superadmin(role_id=1)이면 팀 안 역할도 1로 넣었음 → 활성 팀 전환 때 전역 role_id=1이
        //   다시 생겨 우회 권한의 씨앗이 됐음. 누구든 팀장(2)으로.
        $team->members()->attach($user->id, [
            'role_id'    => 2,
            'joined_at'  => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 새로 만든 팀을 활성 팀으로 전환
        $user->team_id = $team->id;
        $user->user_type = 'team';
        if ($user->role_id > 2) {
            $user->role_id = 2;
        }
        $user->save();

        return ApiResponse::success($team, '팀이 생성되었습니다.', 201);
    }

    /**
     * ─── ③ 팀 상세 조회 ───
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        // ★ v18.68 보안 — role_id=1 우회 제거: 지금 소속된 팀만(나갔거나 내보내진 팀은 404)
        $team = Team::whereIn('id', $user->teamIds())->find($id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        return ApiResponse::success($team, '팀 조회 성공');
    }

    /**
     * ─── ④ 팀 정보 수정 ───
     *   ★ v18.44 — 그 팀의 팀장만(활성 팀과 무관). superadmin은 전체.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $team = $this->ledTeam($user, $id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'description'   => 'nullable|string|max:1000',
            'specialty'     => 'nullable|string|max:255',
            'activity_area' => 'nullable|string|max:100',
            'photo'         => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($request->hasFile('photo')) {
            if ($fail = $this->teamPhotoError($request, $user)) { // ★ v18.67
                return $fail;
            }
            if ($team->photo_path) {
                Storage::disk('public')->delete($team->photo_path);
            }
            $data['photo_path'] = $request->file('photo')->store('teams', 'public');
        }
        unset($data['photo']);

        $team->update($data);

        return ApiResponse::success($team, '팀 정보가 수정되었습니다.');
    }

    /**
     * ─── 팀 사진 업로드/삭제 ───  ★ DESIGN-CANVAS(TEAM_CREATE) 추가
     */
    public function uploadPhoto(Request $request, string $id)
    {
        $user = $request->user();
        $team = $this->ledTeam($user, $id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);
        if ($fail = $this->teamPhotoError($request, $user)) { // ★ v18.67
            return $fail;
        }

        if ($team->photo_path) {
            Storage::disk('public')->delete($team->photo_path);
        }

        $path = $request->file('photo')->store('teams', 'public');
        $team->update(['photo_path' => $path]);

        return ApiResponse::success($team->fresh(), '팀 사진이 등록되었습니다.');
    }

    /**
     * ★ v18.67 보안 — 팀 사진(생성·수정·사진 등록 공통): 저장 전에 사진 머리글 확인(6000픽셀 이하)
     *   + 사용자당 하루 20장까지. 사진이 없으면 통과(null).
     */
    private function teamPhotoError(Request $request, User $user)
    {
        if (!$request->hasFile('photo')) {
            return null;
        }
        return \App\Support\UploadGuard::imageError($request->file('photo'))
            ?? \App\Support\UploadGuard::dailyLimit('team_photo', $user->id, 1, 20, '팀 사진');
    }

    public function deletePhoto(Request $request, string $id)
    {
        $user = $request->user();
        $team = $this->ledTeam($user, $id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        if ($team->photo_path) {
            Storage::disk('public')->delete($team->photo_path);
            $team->update(['photo_path' => null]);
        }

        return ApiResponse::success($team->fresh(), '팀 사진이 삭제되었습니다.');
    }

    /**
     * ─── 초대코드 미리보기 ───  ★ DESIGN-CANVAS(TEAM_JOIN) 추가
     *   가입하지 않고도 초대코드만으로 팀 이름/사진/인원수/공정/지역/팀장 이름을 미리 볼 수 있게 함.
     *   ★ v18.43 — 초대 코드 7일 만료(만료된 코드는 유효하지 않은 코드로 처리)
     */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'invite_code' => 'required|string',
        ]);

        $team = Team::findByValidInvite($data['invite_code']);

        if (!$team) {
            return ApiResponse::error('초대 코드가 유효하지 않거나 만료되었습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        // ★ v18.68 — 내보내진 사람이 그 전 코드를 넣으면 참여 화면에서 바로 안내(가입 단계에서도 같은 검사)
        if ($blocked = $this->rejoinBlocked($team, $request->user())) {
            return $blocked;
        }

        $leader = DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->where('team_members.team_id', $team->id)
            ->where('team_members.role_id', 2)
            ->whereNull('team_members.deleted_at')
            ->orderBy('team_members.joined_at')
            ->value('users.name');

        $memberCount = DB::table('team_members')
            ->where('team_id', $team->id)
            ->whereNull('deleted_at')
            ->count();

        return ApiResponse::success([
            'id'            => $team->id,
            'name'          => $team->name,
            'photo_path'    => $team->photo_path,
            'specialty'     => $team->specialty,
            'activity_area' => $team->activity_area,
            'member_count'  => $memberCount,
            'leader_name'   => $leader,
            'invite_expires_at' => $team->invite_expires_at?->toIso8601String(),
        ], '팀 미리보기 조회 성공');
    }

    /**
     * ─── ⑤ 팀 삭제(해체) ───
     *   ★ v18.44 — 그 팀의 팀장만(예전엔 활성 팀에서 팀장이면 팀원으로만 있는 다른 팀도
     *   해체할 수 있었던 구멍이 있었음). superadmin은 전체.
     *
     *   해체해도 팀 소속이었던 일정/현장의 team_id는 그대로 둠(데이터 삭제도,
     *   개인 전환도 안 함) — Team은 SoftDeletes라 이름도 보존되므로, 팀원이었던
     *   사람이 나중에 "팀" 필터로 그때 일했던 기록을 계속 조회할 수 있음
     *   (Schedule::scopeForUser 참고). 팀원 전원만 소속 해제함:
     *     - team_id → null, role_id → 2(팀 없는 개인은 스스로 manager),
     *       user_type → freelancer
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        $team = $this->ledTeam($user, $id);

        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        DB::transaction(function () use ($team) {
            $memberIds = DB::table('team_members')
                ->where('team_id', $team->id)
                ->whereNull('deleted_at')
                ->pluck('user_id');

            DB::table('team_members')
                ->where('team_id', $team->id)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);

            // 이 팀이 활성 팀이었던 사람들은 남은 팀 중 하나로 전환(없으면 개인으로)
            foreach ($memberIds as $userId) {
                $affected = User::find($userId);
                if ($affected && $affected->team_id === $team->id) {
                    $this->switchActiveTeam($affected, $this->pickFallbackTeamId($affected, $team->id));
                }
            }

            $team->delete();
        });

        return ApiResponse::success(null, '팀이 해체되었습니다. 그동안의 일정·현장 기록은 각자 "팀" 필터에서 계속 조회할 수 있습니다.');
    }

    /**
     * ─── ⑧ 팀 탈퇴 ───
     *   본인이 스스로 팀을 나감. ★ v18.21 — 여러 팀 소속 중 하나만 나가는 것이므로
     *   body에 team_id를 받되, 생략하면 지금 활성 팀을 나가는 것으로 처리(하위호환).
     *   일정/현장의 team_id는 손대지 않음 — 탈퇴 후에도 "팀" 필터로 그때 일했던
     *   기록을 볼 수 있어야 하기 때문(Schedule::scopeForUser 참고).
     */
    public function leave(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'team_id' => 'nullable|integer',
        ]);
        $teamId = $data['team_id'] ?? $user->team_id;

        if (!$teamId) {
            return ApiResponse::error('소속된 팀이 없습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $membership = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        // ★ v18.68 — 팀장이 내보내기(kickMember)와 같은 처리(removeMembership)로 통일
        if (!$membership || !$this->removeMembership($user, (int) $teamId)) {
            return ApiResponse::error('소속된 팀이 없습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        return ApiResponse::success($user->fresh(), '팀에서 탈퇴했습니다. 그동안의 일정·현장 기록은 "팀" 필터에서 계속 조회할 수 있습니다.');
    }

    /**
     * ─── ⑥ 팀 가입 ───
     *   초대코드로 팀에 합류. ★ v18.21 — 이미 다른 팀에 소속되어 있어도 추가로
     *   가입 가능(여러 팀 동시 소속). 같은 팀에 이미 가입돼 있으면 에러.
     *   새로 가입한 팀이 바로 활성 팀이 됨.
     */
    public function join(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'invite_code' => 'required|string',
        ]);

        $team = Team::findByValidInvite($data['invite_code']);

        if (!$team) {
            return ApiResponse::error('초대 코드가 유효하지 않거나 만료되었습니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        // ★ v18.68 — 나간(내보내진) 기록까지 같이 찾음: team_members는 (team_id, user_id)가 고유라서
        //   예전엔 나갔다가 다시 들어오면 새 행을 넣다가 500이었음 → 아래에서 옛 행을 되살림
        $previous = DB::table('team_members')
            ->where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->first();

        if ($previous && $previous->deleted_at === null) {
            return ApiResponse::error('이미 가입된 팀입니다.', ErrorCode::TEAM_ALREADY_JOINED, 409);
        }
        if ($blocked = $this->rejoinBlocked($team, $user, $previous)) {
            return $blocked;
        }

        // ★ v18.47 — 무료 팀은 3명까지(팀장 포함). 팀장이 팀 요금제면 무제한
        $memberLimit = \App\Services\PlanService::teamLimit($team->id, 'team_members', 'team_unlimited_members');
        if ($memberLimit !== null && ($used = $team->members()->count()) >= $memberLimit) {
            return \App\Services\PlanService::denied('team_unlimited_members', "이 팀은 무료 인원({$memberLimit}명)이 다 찼어요. 팀장에게 팀 요금제를 요청해 주세요.",
                ['limit' => $memberLimit, 'used' => $used, 'unit' => '명']);
        }

        // 초대코드로 들어온 사람은 팀장이 아니라 팀원
        if ($previous) {
            // ★ v18.68 — 다시 들어오면 처음 들어온 것처럼: 팀원부터, 부팀장·공지 읽음 표시 초기화
            DB::table('team_members')->where('id', $previous->id)->update([
                'deleted_at'         => null,
                'role_id'            => 3,
                'is_sub_leader'      => false,
                'notices_read_at'    => null,
                'kicked_at'          => null,
                'kicked_invite_code' => null,
                'joined_at'          => now(),
                'updated_at'         => now(),
            ]);
        } else {
            DB::table('team_members')->insert([
                'team_id'    => $team->id,
                'user_id'    => $user->id,
                'role_id'    => 3,
                'joined_at'  => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 새로 가입한 팀을 활성 팀으로 전환 — 남의 팀에 들어가면서 manager 등급을
        // 유지한 채면 권한 상승이 되므로 반드시 member로 강등해야 함
        $this->switchActiveTeam($user, $team->id);

        // ★ DESIGN-CANVAS(NOTIFICATIONS) 추가 — 기존 팀원들에게 새 팀원 참여 알림
        $existingMemberIds = DB::table('team_members')
            ->where('team_id', $team->id)
            ->where('user_id', '!=', $user->id)
            ->whereNull('deleted_at')
            ->pluck('user_id');

        foreach ($existingMemberIds as $memberId) {
            \App\Models\Notification::create([
                'user_id'   => $memberId,
                'category'  => 'team',
                'title'     => '팀 활동',
                'body'      => "{$user->name}님이 팀에 참여했어요.",
                'link_type' => 'team',
                'link_id'   => $team->id,
            ]);
        }

        return ApiResponse::success($user->fresh(), '팀에 가입되었습니다.');
    }

    /**
     * ─── ⑨ 활성 팀 전환 ───  ★ v18.21 신규 — 여러 팀 소속 중 "지금 활동할 팀"을 바꿈.
     *   일정/현장 등록, 팀원 목록 조회 등은 전부 이 활성 팀 기준으로 동작함.
     */
    public function switchActive(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'team_id' => 'required|integer',
        ]);

        $membership = DB::table('team_members')
            ->where('team_id', $data['team_id'])
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$membership) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        $this->switchActiveTeam($user, (int) $data['team_id']);

        return ApiResponse::success($user->fresh(), '활성 팀이 변경되었습니다.');
    }

    /**
     * ─── ⑦ 내 팀 멤버 목록 조회 ───  (일정 등록 시 투입 인원 선택용)
     *   ★ v18.21 — team_members 기준으로 조회하도록 변경(users.team_id는 이제
     *   "활성 팀"만 가리켜서, 비활성 상태인 다른 팀의 멤버는 안 잡혔었음).
     *   ?team_id= 쿼리로 특정 팀을 지정할 수 있고, 생략하면 지금 활성 팀 기준.
     *
     *   응답 데이터:
     *     - id          : 사용자 고유 ID (투입 인원 등록 시 사용)
     *     - name        : 사용자 이름 (화면 표시용)
     *     - role_id     : 그 팀 안에서의 역할 레벨 (1=superadmin, 2=manager, 3=member)
     *
     *   보안:
     *     - 요청자가 실제로 소속된 팀인지 확인 → 다른 팀 노출 방지
     *     - email, phone 등 민감 정보 제외
     */
    public function members(Request $request)
    {
        $user = $request->user();
        $teamId = $request->query('team_id') ?: $user->team_id;

        if (!$teamId) {
            return ApiResponse::success([], '소속된 팀이 없습니다.');
        }

        // ★ v18.68 보안 — role_id=1 우회 제거(지금 소속된 팀만)
        if (!in_array((int) $teamId, array_map('intval', $user->teamIds()), true)) {
            return ApiResponse::error('소속되지 않은 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        // ★ v18.23 — 같은 팀 사람끼리는 연락처/카카오톡 아이디/아바타까지 볼 수 있게
        //   확장(전체 공개 아님 — 위에서 이미 요청자가 이 팀 소속인지 확인함).
        $members = User::query()
            ->join('team_members', 'team_members.user_id', '=', 'users.id')
            ->where('team_members.team_id', $teamId)
            ->whereNull('team_members.deleted_at')
            ->whereNull('users.deleted_at')
            ->select(
                'users.id',
                'users.name',
                'users.phone',
                'users.kakao_talk_id',
                'users.avatar_color',
                'users.avatar_image_path',
                'team_members.role_id',
                'team_members.is_sub_leader', // ★ v18.47 부팀장
            )
            ->orderBy('team_members.role_id')
            ->orderBy('users.name')
            ->get();

        return ApiResponse::success($members, '팀원 목록 조회 성공');
    }

    /**
     * 활성 팀을 바꾸고, 그 팀 안에서의 역할(team_members.role_id)로 전역 role_id도
     * 맞춰줌 — RoleMiddleware가 전역 role_id 하나만 보고 권한을 판단하는 구조라서
     * (여러 팀에서 역할이 다를 수 있다는 한계는 알고 있음, v1은 활성 팀 기준으로만 동작).
     */
    private function switchActiveTeam(User $user, ?int $teamId): void
    {
        if ($teamId === null) {
            $user->team_id   = null;
            $user->role_id   = 2; // 팀 없는 개인은 스스로 manager
            $user->user_type = 'freelancer';
            $user->save();
            return;
        }

        $membership = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        $user->team_id   = $teamId;
        $user->role_id   = $membership->role_id ?? 3;
        $user->user_type = 'team';
        $user->save();
    }

    /**
     * ─── 부팀장 지정/해제 ───  ★ v18.47 (팀 요금제)
     *   PUT /teams/{id}/members/{userId}/sub-leader  { enabled: bool }
     *   팀장만. 부팀장은 그 팀 일정·현장 등록/수정과 팀원 배정, 근태 조회, 팀 공지를 할 수 있음
     *   (팀 정보 수정·해체·부팀장 지정·정산표는 팀장만).
     */
    public function setSubLeader(Request $request, string $id, string $userId)
    {
        $user = $request->user();
        $team = $this->ledTeam($user, $id);
        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        if (!\App\Services\PlanService::teamCan($team->id, 'team_sub_leader')) {
            return \App\Services\PlanService::denied('team_sub_leader', \App\Services\PlanService::upgradeMessage('team_sub_leader'));
        }
        $data = $request->validate(['enabled' => 'required|boolean']);

        $membership = DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', (int) $userId)->whereNull('deleted_at')->first();
        if (!$membership) {
            return ApiResponse::error('이 팀의 팀원이 아니에요.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        if ((int) $membership->role_id <= 2) {
            return ApiResponse::error('팀장은 부팀장으로 지정할 수 없어요.', 'ERR_VALIDATION', 422);
        }

        DB::table('team_members')->where('id', $membership->id)
            ->update(['is_sub_leader' => $data['enabled'], 'updated_at' => now()]);

        if ($data['enabled']) {
            \App\Models\Notification::create([
                'user_id'   => (int) $userId,
                'category'  => 'team',
                'title'     => '부팀장 지정',
                'body'      => "{$team->name}의 부팀장이 되었어요. 이제 팀 일정을 등록하고 팀원을 배정할 수 있어요.",
                'link_type' => 'team',
                'link_id'   => $team->id,
            ]);
        }

        return ApiResponse::success(['user_id' => (int) $userId, 'is_sub_leader' => (bool) $data['enabled']],
            $data['enabled'] ? '부팀장으로 지정했어요.' : '부팀장을 해제했어요.');
    }

    /**
     * ─── 팀원 내보내기 ───  ★ v18.68 (TEAM_DETAIL_KICK)
     *   DELETE /teams/{id}/members/{userId}
     *   그 팀의 팀장만(팀별 역할 isLeaderOf — 활성 팀·전역 role_id와 무관). 본인·팀장은 못 내보냄.
     *   처리는 스스로 나가기(leave)와 같음(removeMembership): 소속에 나간 때 표시 + 부팀장 해제 + 활성 팀 전환.
     *   지난 일정·정산 기록은 그대로 남고(정산표엔 "나간 팀원"), 다시 오려면 내보낸 뒤에 만든 새 초대 코드로
     *   가입해야 함(그 전 코드는 이 사람에게만 막힘 — rejoinBlocked).
     *   앞으로의 팀 일정에서는 빠짐(releaseFutureSchedules — 배정·만든 사람). 소속 해제와 한 트랜잭션.
     *   내보내진 사람에게는 앱 알림(+푸시)을 보냄 — 이미 못 들어가는 팀이라 눌러도 팀 화면으로 안 보냄(link 없음).
     */
    public function kickMember(Request $request, string $id, string $userId)
    {
        $user = $request->user();

        // 지금 소속된 팀이 아니면(남의 팀·해체된 팀·나간 팀) 팀이 있는지도 알려주지 않음
        $team = Team::whereIn('id', $user->teamIds())->find($id);
        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀이에요.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        if (!$user->isLeaderOf((int) $team->id)) {
            return ApiResponse::error('팀장만 팀원을 내보낼 수 있어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
        }
        if ((int) $userId === (int) $user->id) {
            return ApiResponse::error('본인은 내보낼 수 없어요. 팀을 나가려면 팀 나가기를 이용해 주세요.', ErrorCode::TEAM_KICK_NOT_ALLOWED, 422);
        }

        $membership = ctype_digit($userId) ? DB::table('team_members')
            ->where('team_id', $team->id)->where('user_id', (int) $userId)->whereNull('deleted_at')->first() : null;
        $target = $membership ? User::find($membership->user_id) : null;
        if (!$membership || !$target) {
            return ApiResponse::error('이 팀의 팀원이 아니에요. 이미 나갔을 수 있어요.', ErrorCode::TEAM_NOT_MEMBER, 422);
        }
        if ((int) $membership->role_id <= 2) {
            return ApiResponse::error('팀장은 내보낼 수 없어요.', ErrorCode::TEAM_KICK_NOT_ALLOWED, 422);
        }

        // 동시에 두 번 눌렀거나 그 사이 스스로 나갔으면 이미 빠진 것 → 팀원이 아님
        //   ★ v18.68 — 소속 해제 + 앞으로의 일정에서 빼기는 함께(중간에 실패하면 둘 다 안 된 것으로)
        $kicked = DB::transaction(function () use ($target, $team, $user) {
            if (!$this->removeMembership($target, (int) $team->id, kicked: true)) {
                return false;
            }
            $this->releaseFutureSchedules($team, $target, $user);
            return true;
        });
        if (!$kicked) {
            return ApiResponse::error('이 팀의 팀원이 아니에요. 이미 나갔을 수 있어요.', ErrorCode::TEAM_NOT_MEMBER, 422);
        }

        // 알림은 덤 — 실패해도 내보내기는 그대로 성공
        try {
            \App\Models\Notification::create([
                'user_id'   => $target->id,
                'category'  => 'team',
                'title'     => '팀 활동',
                'body'      => "'{$team->name}' 팀에서 나가게 됐어요",
                'link_type' => null,
                'link_id'   => null,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[Team] 내보내기 알림 실패', ['team_id' => $team->id, 'user_id' => $target->id, 'error' => $e->getMessage()]);
        }

        return ApiResponse::success(null, "{$target->name}님을 팀에서 내보냈어요");
    }

    /**
     * ★ v18.68 — 팀에서 빠지는 공통 처리(스스로 나가기 leave · 팀장이 내보내기 kickMember)
     *   - 소속 기록은 지우지 않고 deleted_at만 찍음(= 나간 때. 나간 뒤 올라온 사진·보고서를 가리는 기준 Site::leftTeamAt,
     *     다시 들어오면 join이 이 행을 되살림)
     *   - 부팀장 표시도 끔
     *   - 내보낸 거면 kicked_at + kicked_invite_code(그 순간의 팀 초대 코드 — 이 코드로는 다시 못 들어옴, rejoinBlocked)
     *   - 그 팀이 활성 팀이었으면 남은 팀 중 하나로 전환(없으면 개인으로)
     *   일정·현장·정산의 team_id는 손대지 않음 — 지난 기록은 "팀" 필터·정산표에 그대로 남음.
     *   이미 빠진 뒤였으면(동시에 두 번 요청 등) false.
     */
    private function removeMembership(User $member, int $teamId, bool $kicked = false): bool
    {
        $removed = DB::table('team_members')
            ->where('team_id', $teamId)
            ->where('user_id', $member->id)
            ->whereNull('deleted_at')
            ->update([
                'deleted_at'         => now(),
                'is_sub_leader'      => false,
                'kicked_at'          => $kicked ? now() : null,
                // ★ v18.68 — 같은 UPDATE 안에서 그 순간의 코드를 읽음(사이에 새 코드 만들기가 끼어도 어긋나지 않게)
                'kicked_invite_code' => $kicked ? DB::raw('(select invite_code from teams where id = ' . (int) $teamId . ')') : null,
                'updated_at'         => now(),
            ]);

        if (!$removed) {
            return false;
        }

        if ((int) $member->team_id === $teamId) {
            $this->switchActiveTeam($member, $this->pickFallbackTeamId($member, $teamId));
        }

        return true;
    }

    /**
     * ★ v18.68 — 내보낸 사람을 그 팀의 "앞으로의" 일정에서 뺌(지난 일정·정산은 그대로). kickMember 트랜잭션 안에서 호출.
     *   예전엔 소속만 지워서, 앞으로의 팀 일정에 계속 배정·작성자로 남아 그 일정(팀장이 나중에 바꾼 주소·메모까지)을
     *   계속 보고(Schedule::forUser가 배정·created_by로도 보여 줌), 일정 알림 푸시(현장 주소)를 받고,
     *   그 일당이 내 수입(월별 집계)과 팀 정산표("나간 팀원")에 잡혔음.
     *   - 투입 인원: 내일부터의 일정에서 뺌 + 빠진 달 공수 집계 재계산(ScheduleController::update v18.20과 같은 방식).
     *     오늘 일정은 남김 — 이미 일했을 수 있는데 한 번 빼면 팀원이 아니라 다시 넣을 수 없음(checkRefs).
     *     안 왔으면 팀장이 일정 수정에서 빼면 됨.
     *   - 만든 사람(created_by, 부팀장 때 등록한 일정): 오늘부터의 일정은 내보낸 팀장으로 넘김. created_by로도
     *     보기 범위·배정 없는 일정의 알림 대상(SendScheduleReminders)·현장 자동 생성 주인(ensureSite)이 정해지기 때문.
     *     (그래서 이 일정들의 홈 "팀 활동" 등록자 표시는 팀장이 됨)
     */
    private function releaseFutureSchedules(Team $team, User $member, User $leader): void
    {
        $today = now()->toDateString();

        $assigned = DB::table('schedules')
            ->join('schedule_users', 'schedule_users.schedule_id', '=', 'schedules.id')
            ->where('schedules.team_id', $team->id)
            ->where('schedules.date', '>', $today)
            ->where('schedule_users.user_id', $member->id)
            ->whereNull('schedule_users.deleted_at')
            ->get(['schedules.id', 'schedules.date']);

        if ($assigned->isNotEmpty()) {
            $ids = $assigned->pluck('id')->all();
            DB::table('schedule_users')
                ->whereIn('schedule_id', $ids)
                ->where('user_id', $member->id)
                ->whereNull('deleted_at')
                ->delete();
            // 투입 인원이 바뀐 일정 표시만(남은 사람 공수는 그대로라 Observer 재계산은 필요 없음)
            DB::table('schedules')->whereIn('id', $ids)->update(['updated_at' => now()]);

            $months = $assigned->map(fn($s) => substr((string) $s->date, 0, 7))->unique();
            foreach ($months as $yearMonth) {
                \App\Services\MonthlySummaryService::recalculate((int) $member->id, $yearMonth);
            }
        }

        DB::table('schedules')
            ->where('team_id', $team->id)
            ->where('date', '>=', $today)
            ->where('created_by', $member->id)
            ->update(['created_by' => $leader->id]);
    }

    /**
     * ★ v18.68 — 팀장이 내보낸 사람이 "내보낼 때 쓰이던" 초대 코드로 다시 들어오려 하면 막음
     *   (예전 단톡방 링크로 바로 돌아오면 내보내기가 의미 없음). 그 뒤에 팀장·부팀장이 새 코드를 만들었거나
     *   만료돼 새로 발급된 코드면 들어올 수 있음. 스스로 나간 사람(kicked_at 없음)은 예전처럼 같은 코드로 다시 들어옴.
     *   코드 자체를 비교함(kicked_invite_code) — 예전엔 만든 때(만료일 − 7일)와 내보낸 때를 초 단위로 비교해서
     *   내보낸 그 초에 만든 새 코드도 막혔음.
     *   막을 땐 403 응답, 아니면 null. $previous: 이미 조회한 이 팀 소속 행(없으면 여기서 찾음)
     */
    private function rejoinBlocked(Team $team, User $user, ?object $previous = null)
    {
        $previous ??= DB::table('team_members')->where('team_id', $team->id)->where('user_id', $user->id)->first();
        if (!$previous || $previous->deleted_at === null || !$previous->kicked_at
            || $previous->kicked_invite_code === null || $previous->kicked_invite_code !== $team->invite_code) {
            return null;
        }
        return ApiResponse::error('이 팀에서 내보내진 뒤라 예전 초대 코드로는 다시 들어갈 수 없어요. 팀장에게 새 초대 링크를 받아 주세요.',
            ErrorCode::AUTH_NO_PERMISSION, 403);
    }

    /**
     * ★ v18.44 — 내가 팀장인 팀만 찾음. 팀원이거나 남의 팀이면 null
     *   ★ v18.68 보안 — 예전엔 superadmin(role_id=1)이면 아무 팀이나 통과 → 우회 제거(운영자는 앱 API 자체가 막힘)
     */
    private function ledTeam(User $user, string $id): ?Team
    {
        return Team::whereIn('id', $user->ledTeamIds())->find($id);
    }

    /**
     * 특정 팀에서 나가고 난 뒤, 활성 팀으로 삼을 다른 소속 팀을 하나 고름(없으면 null).
     */
    private function pickFallbackTeamId(User $user, int $excludeTeamId): ?int
    {
        $fallback = DB::table('team_members')
            ->where('user_id', $user->id)
            ->where('team_id', '!=', $excludeTeamId)
            ->whereNull('deleted_at')
            ->orderByDesc('joined_at')
            ->first();

        return $fallback->team_id ?? null;
    }

    /**
     * ─── 초대 코드 조회 ───  ★ v18.43 (TEAM_INVITE)
     *   팀원이면 누구나 초대 링크를 받을 수 있음. 만료됐으면 새 코드를 만들어 7일 연장
     *   (예전에 보낸 링크는 더 이상 동작하지 않음).
     *   ★ v18.68 — can_regenerate(팀장·부팀장만 "새 코드 만들기" 버튼), role_id=1 우회 제거(지금 소속된 팀만)
     */
    public function invite(Request $request, string $id)
    {
        $user = $request->user();
        $team = Team::whereIn('id', $user->teamIds())->find($id);
        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404);
        }

        if ($team->inviteExpired()) {
            $team->update([
                'invite_code'       => $this->generateInviteCode(),
                'invite_expires_at' => now()->addDays(Team::INVITE_DAYS),
            ]);
        }

        return ApiResponse::success($this->invitePayload($team, $user), '초대 코드 조회 성공');
    }

    /**
     * ─── 초대 코드 새로 만들기 ───  ★ v18.68 (TEAM_INVITE_NEW_CODE)
     *   POST /teams/{id}/invite/regenerate — 코드·링크가 엉뚱한 사람에게 갔을 때. 팀장·부팀장만.
     *   새 6자리 코드(7일 유효)로 바꾸면 옛 코드는 그 즉시 /teams/join·/teams/preview·웹 /join/{코드} 전부에서 안 됨
     *   (셋 다 Team::findByValidInvite로 "지금 코드"만 찾음). 응답은 GET invite와 같은 모양.
     */
    public function regenerateInvite(Request $request, string $id)
    {
        $user = $request->user();
        $team = Team::whereIn('id', $user->teamIds())->find($id);
        if (!$team) {
            return ApiResponse::error('존재하지 않는 팀이에요.', ErrorCode::TEAM_NOT_FOUND, 404);
        }
        if (!$user->canAssignIn((int) $team->id)) {
            return ApiResponse::error('팀장이나 부팀장만 초대 코드를 새로 만들 수 있어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
        }

        $team->update([
            'invite_code'       => $this->generateInviteCode(),
            'invite_expires_at' => now()->addDays(Team::INVITE_DAYS),
        ]);

        return ApiResponse::success($this->invitePayload($team, $user), '새 초대 코드를 만들었어요.');
    }

    /** ★ v18.68 — 초대 코드 응답(GET invite · 새로 만들기 공용) */
    private function invitePayload(Team $team, User $user): array
    {
        return [
            'team_id'        => $team->id,
            'team_name'      => $team->name,
            'member_count'   => $team->members()->count(),
            'invite_code'    => $team->invite_code,
            'expires_at'     => $team->invite_expires_at->toIso8601String(),
            'invite_url'     => url('/join/' . $team->invite_code),
            'can_regenerate' => $user->canAssignIn((int) $team->id),
        ];
    }

    /**
     * ★ v18.68 QA — 초대 코드에 쓰는 글자: 헷갈리는 0/O, 1/I/L을 뺀 대문자 + 숫자(디자인 예시 K8M2TD처럼)
     *   말로 불러 주거나 손으로 옮겨 적을 때 틀리지 않게. 31글자 6자리 ≈ 8.9억 가지.
     *   (예전 코드는 Str::random을 대문자로 바꿔 0/O, 1/I가 섞였음 — 이미 만든 코드는 만료·새로 만들기 전까지 그대로 동작)
     */
    private const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    private function generateInviteCode(): string
    {
        // ★ v18.68 — 해체된(soft delete) 팀의 코드도 DB 고유 키에 걸리므로 같이 피함(예전엔 겹치면 500)
        $max = strlen(self::INVITE_CODE_CHARS) - 1;
        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= self::INVITE_CODE_CHARS[random_int(0, $max)];
            }
        } while (Team::withTrashed()->where('invite_code', $code)->exists());

        return $code;
    }
}
