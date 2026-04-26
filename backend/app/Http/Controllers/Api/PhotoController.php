<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Schedule;
use App\Models\SiteFile;
use Illuminate\Http\Request;

/**
 * 현장 사진 관리 컨트롤러
 *
 * 변경 이력:
 *  - 2026-04-26 v11: 카테고리(시공 전/중/후/기타) 지원 + index 메서드 신규
 *                    + site_id 매핑 버그 수정 (scheduleId → schedule->site_id)
 *                    + 다른 팀 일정 접근 차단 (team_id 검증)
 */
class PhotoController extends Controller
{
    /**
     * ★ v11 신규 — 일정의 사진 목록 조회 (카테고리별 그룹핑)
     *
     * GET /api/schedules/{scheduleId}/photos
     *
     * 응답 형식:
     *   { before: [...], during: [...], after: [...], other: [...],
     *     counts: { before: 3, during: 2, after: 5, other: 0 } }
     *
     * 4개 카테고리를 한 번의 호출로 묶어 반환 — 모바일 사진 탭 UI에 최적
     */
    public function index(Request $request, int $scheduleId)
    {
        $user = $request->user();

        // ① 일정 존재 + 같은 팀인지 확인 (다른 팀 일정 접근 차단)
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ② 현장 미연결 일정 — 빈 결과 반환 (에러 아님)
        if (!$schedule->site_id) {
            return ApiResponse::success([
                'before' => [], 'during' => [], 'after' => [], 'other' => [],
                'counts' => ['before' => 0, 'during' => 0, 'after' => 0, 'other' => 0],
            ], '사진 목록 조회 성공');
        }

        // ③ 해당 현장의 사진 전체를 sort_order 정순으로 가져오기
        $photos = SiteFile::where('site_id', $schedule->site_id)
            ->where('file_type', 'photo')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        // ④ 4개 카테고리로 그룹핑 (DB 쿼리 1번으로 끝)
        $grouped = ['before' => [], 'during' => [], 'after' => [], 'other' => []];
        foreach ($photos as $p) {
            $cat = $p->photo_category ?? 'other';
            // 안전장치 — 알 수 없는 값이면 other로
            if (!array_key_exists($cat, $grouped)) {
                $cat = 'other';
            }
            $grouped[$cat][] = $p;
        }

        // ⑤ 카운트 동시 계산 (모바일 탭 뱃지에 표시)
        $counts = [
            'before' => count($grouped['before']),
            'during' => count($grouped['during']),
            'after'  => count($grouped['after']),
            'other'  => count($grouped['other']),
        ];

        return ApiResponse::success([
            'before' => $grouped['before'],
            'during' => $grouped['during'],
            'after'  => $grouped['after'],
            'other'  => $grouped['other'],
            'counts' => $counts,
        ], '사진 목록 조회 성공');
    }

    /**
     * 사진 업로드 — 카테고리 지원 (★ v11 확장)
     *
     * POST /api/schedules/{scheduleId}/photos
     * Body: photo (file), photo_category (string), description (string, optional)
     */
    public function store(Request $request, int $scheduleId)
    {
        $user = $request->user();

        // ① 입력값 검증 — 카테고리 ENUM 4가지 외 차단
        $validated = $request->validate([
            'photo'          => 'required|image|mimes:jpeg,png,jpg|max:10240', // 10MB
            'photo_category' => 'required|in:before,during,after,other',
            'description'    => 'nullable|string|max:255',
        ]);

        // ② 일정 존재 + 같은 팀 확인
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ③ 현장 미연결 일정은 업로드 불가 (★ v11)
        if (!$schedule->site_id) {
            return ApiResponse::error('이 일정에는 현장이 연결되어 있지 않아 사진을 업로드할 수 없습니다.',
                ErrorCode::PHOTO_NO_SITE_LINKED, 422);
        }

        // ④ 파일 저장 (storage/app/public/site-photos/ 에 저장)
        $file   = $request->file('photo');
        $stored = $file->store('site-photos', 'public');

        // ⑤ 같은 카테고리 사진 개수로 sort_order 결정 (★ v11)
        $sortOrder = SiteFile::where('site_id', $schedule->site_id)
            ->ofCategory($validated['photo_category'])
            ->count();

        // ⑥ DB 저장 — ★ v11 버그 수정: site_id에 $schedule->site_id 사용 (이전: $scheduleId)
        $record = SiteFile::create([
            'site_id'        => $schedule->site_id,                          // ★ 버그 수정
            'original_name'  => $file->getClientOriginalName(),
            'stored_name'    => basename($stored),
            'mime_type'      => $file->getClientMimeType(),
            'file_size'      => $file->getSize(),
            'file_path'      => $stored,
            'file_type'      => 'photo',
            'uploaded_by'    => $user->id,
            // ★ v11 신규
            'photo_category' => $validated['photo_category'],
            'description'    => $validated['description'] ?? null,
            'sort_order'     => $sortOrder,
        ]);

        return ApiResponse::success($record, '사진이 업로드되었습니다.', 201);
    }

    /**
     * 사진 삭제 — SoftDelete (★ v11 보안 강화)
     *
     * DELETE /api/schedules/{scheduleId}/photos/{photoId}
     *
     * 변경: 다른 팀의 사진을 삭제하는 공격 차단 (team_id + site_id 이중 검증)
     */
    public function destroy(Request $request, int $scheduleId, int $photoId)
    {
        $user = $request->user();

        // ① 일정 존재 + 같은 팀 확인
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ② 사진이 해당 일정의 현장 사진인지 확인 (★ v11 보안)
        //    악의적 사용자가 다른 현장의 photoId를 보내도 차단
        $photo = SiteFile::where('id', $photoId)
            ->where('site_id', $schedule->site_id)
            ->first();

        if (!$photo) {
            return ApiResponse::error('사진을 찾을 수 없습니다.',
                ErrorCode::PHOTO_NOT_FOUND, 404);
        }

        $photo->delete(); // SoftDelete (deleted_at에 시각만 기록)

        return ApiResponse::success(null, '사진이 삭제되었습니다.');
    }
}
