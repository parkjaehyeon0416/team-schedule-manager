<?php
namespace App\Http\Controllers;
use App\Models\Schedule;
use App\Models\ScheduleUser;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller {

    // ① 월별 스케줄 조회 (캘린더 뷰용)
    public function index(Request $request) {
        $year  = $request->query("year",  now()->year);
        $month = $request->query("month", now()->month);
        $schedules = Schedule::with("assignedUsers.user")
            ->whereYear("date", $year)
            ->whereMonth("date", $month)
            ->where("team_id", auth()->user()->team_id)
            ->orderBy("date")->get();
        return ApiResponse::success($schedules);
    }

    // ② 스케줄 등록
    public function store(Request $request) {
        $data = $request->validate([
            'date'      => 'required|date',
            'district'  => 'nullable|string|max:100',
            'work_type' => 'nullable|in:도배,타일,필름',
            'area_m2'   => 'nullable|numeric|min:0',
            'memo'      => 'nullable|string',
            'user_ids'  => 'nullable|array', // 투입 인원 ID 배열
            'user_ids.*'=> 'integer|exists:users,id',
        ]);
        $data["team_id"] = auth()->user()->team_id;
        $schedule = Schedule::create($data);
        // 투입 인원 등록
        if (!empty($data["user_ids"])) {
            foreach ($data["user_ids"] as $userId) {
                ScheduleUser::create(["schedule_id"=>$schedule->id,"user_id"=>$userId]);
            }
        }
        return ApiResponse::success($schedule->load("assignedUsers.user"), "일정이 등록되었습니다.", 201);
    }

    // ③ 스케줄 상세 조회
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        // ★ 일정 상세 조회 — 팀원, 현장 관계 데이터 포함
        $schedule = Schedule::with(['users:id,name', 'site:id,apt_name,dong,ho'])
            ->when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($id);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.', 'ERR_NOT_FOUND', 404);
        }

        return ApiResponse::success($schedule, '일정 조회 성공');
    }

    // ④ 스케줄 수정
    public function update(Request $request, Schedule $schedule) {
        $data = $request->validate([
            'date'=>'sometimes|date', 'district'=>'nullable|string|max:100',
            'work_type'=>'nullable|in:도배,타일,필름',
            'area_m2'=>'nullable|numeric', 'memo'=>'nullable|string',
        ]);
        $schedule->update($data);
        return ApiResponse::success($schedule, "일정이 수정되었습니다.");
    }

    // ⑤ 스케줄 삭제
    public function destroy(Schedule $schedule) {
        $schedule->delete(); // SoftDelete — DB에서 완전 삭제가 아닌 deleted_at 기록
        return ApiResponse::success(null, "일정이 삭제되었습니다.");
    }
}

