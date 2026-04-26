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
 *  - 2026-04-26 v11:    카테고리(시공 전/중/후/기타) 지원 + index 메서드 신규
 *                       + site_id 매핑 버그 수정 (scheduleId → schedule->site_id)
 *                       + 다른 팀 일정 접근 차단 (team_id 검증)
 *  - 2026-04-26 v11.1:  paired_with_id 도입 — 시공 후 사진이 어떤 시공 전 사진과 짝인지 명시
 */
class PhotoController extends Controller
{
    /**
     * 일정의 사진 목록 조회 (카테고리별 그룹핑)
     *
     * GET /api/schedules/{scheduleId}/photos
     *
     * 응답 형식:
     *   { before: [...], during: [...], after: [...], other: [...],
     *     counts: { before, during, after, other } }
     */
    public function index(Request $request, int $scheduleId)
    {
        $user = $request->user();

        // ① 일정 존재 + 같은 팀 확인
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ② 현장 미연결 일정 — 빈 결과 반환
        if (!$schedule->site_id) {
            return ApiResponse::success([
                'before' => [], 'during' => [], 'after' => [], 'other' => [],
                'counts' => ['before' => 0, 'during' => 0, 'after' => 0, 'other' => 0],
            ], '사진 목록 조회 성공');
        }

        // ③ 해당 현장의 사진 전체를 sort_order 정순으로
        $photos = SiteFile::where('site_id', $schedule->site_id)
            ->where('file_type', 'photo')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        // ④ 4개 카테고리로 그룹핑
        $grouped = ['before' => [], 'during' => [], 'after' => [], 'other' => []];
        foreach ($photos as $p) {
            $cat = $p->photo_category ?? 'other';
            if (!array_key_exists($cat, $grouped)) {
                $cat = 'other';
            }
            $grouped[$cat][] = $p;
        }

        // ⑤ 카운트
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
     * 사진 업로드 — 카테고리 + (시공 후일 때) 페어 지정 지원
     *
     * POST /api/schedules/{scheduleId}/photos
     *
     * Body:
     *   photo (file, required)
     *   photo_category (string, required): before|during|after|other
     *   description (string, optional)
     *   paired_with_id (int, optional): 시공 후 사진일 때 짝인 시공 전 사진의 id
     */
    public function store(Request $request, int $scheduleId)
    {
        $user = $request->user();

        // ① 입력값 검증
        $validated = $request->validate([
            'photo'          => 'required|image|mimes:jpeg,png,jpg|max:10240',
            'photo_category' => 'required|in:before,during,after,other',
            'description'    => 'nullable|string|max:255',
            // ★ v11.1 — paired_with_id 검증 (선택, 정수, site_files 존재)
            'paired_with_id' => 'nullable|integer|exists:site_files,id',
        ]);

        // ② 일정 존재 + 같은 팀 확인
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        if (!$schedule->site_id) {
            return ApiResponse::error('이 일정에는 현장이 연결되어 있지 않아 사진을 업로드할 수 없습니다.',
                ErrorCode::PHOTO_NO_SITE_LINKED, 422);
        }

        // ③ ★ v11.1 — paired_with_id 추가 검증
        $pairedWithId = $validated['paired_with_id'] ?? null;
        if ($pairedWithId !== null) {
            $pairedError = $this->validatePairedWith($pairedWithId, $schedule->site_id, $validated['photo_category']);
            if ($pairedError) {
                return $pairedError;
            }
        }

        // ④ 파일 저장
        $file   = $request->file('photo');
        $stored = $file->store('site-photos', 'public');

        // ⑤ sort_order 결정 (같은 카테고리 사진 개수)
        $sortOrder = SiteFile::where('site_id', $schedule->site_id)
            ->ofCategory($validated['photo_category'])
            ->count();

        // ⑥ DB 저장
        $record = SiteFile::create([
            'site_id'        => $schedule->site_id,
            'original_name'  => $file->getClientOriginalName(),
            'stored_name'    => basename($stored),
            'mime_type'      => $file->getClientMimeType(),
            'file_size'      => $file->getSize(),
            'file_path'      => $stored,
            'file_type'      => 'photo',
            'uploaded_by'    => $user->id,
            'photo_category' => $validated['photo_category'],
            'description'    => $validated['description'] ?? null,
            'sort_order'     => $sortOrder,
            // ★ v11.1
            'paired_with_id' => $pairedWithId, // 시공 전 사진이면 NULL
        ]);

        return ApiResponse::success($record, '사진이 업로드되었습니다.', 201);
    }

    /**
     * ★ v11.1.1 신규 — 사진 부분 수정 (paired_with_id 변경 전용)
     *
     * PATCH /api/schedules/{scheduleId}/photos/{photoId}
     *
     * Body:
     *   paired_with_id (int|null, required):
     *     - 정수: 그 id의 시공 전 사진과 짝 지움
     *     - null: 짝 해제
     *
     * 사용 시나리오:
     *  1) 시공 후 사진을 "짝 없이 업로드" 했다가 나중에 짝 지정
     *  2) 잘못 지정한 짝을 다른 시공 전 사진으로 변경
     *  3) 짝 자체를 해제 (NULL로)
     */
    public function update(Request $request, int $scheduleId, int $photoId)
    {
        $user = $request->user();

        // ① 입력값 검증 — paired_with_id만 받음
        //    'present' 규칙: 키 자체는 반드시 와야 함 (값은 null이어도 OK)
        $validated = $request->validate([
            'paired_with_id' => 'present|nullable|integer|exists:site_files,id',
        ]);

        // ② 일정 + 팀 확인
        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ③ 수정 대상 사진 조회 + 같은 현장인지 확인
        $photo = SiteFile::where('id', $photoId)
            ->where('site_id', $schedule->site_id)
            ->first();

        if (!$photo) {
            return ApiResponse::error('사진을 찾을 수 없습니다.',
                ErrorCode::PHOTO_NOT_FOUND, 404);
        }

        // ④ 수정 대상은 시공 후 사진이어야만 함
        //    (시공 전 사진의 paired_with_id를 바꾸려는 시도 차단)
        if ($photo->photo_category !== 'after') {
            return ApiResponse::error('짝 지정은 시공 후 사진에만 가능합니다.',
                ErrorCode::PHOTO_PAIR_INVALID, 422);
        }

        $newPairedWithId = $validated['paired_with_id']; // null 또는 int

        // ⑤ 새로 지정하려는 짝 검증 (NULL이 아닐 때만)
        if ($newPairedWithId !== null) {
            // 이전 store와 동일한 검증 — 같은 현장 + before 카테고리 + 미사용
            $pairedError = $this->validatePairedForUpdate(
                $newPairedWithId,
                $schedule->site_id,
                $photoId, // 자기 자신은 중복 검사에서 제외
            );
            if ($pairedError) {
                return $pairedError;
            }
        }

        // ⑥ 변경 적용
        $photo->paired_with_id = $newPairedWithId;
        $photo->save();

        return ApiResponse::success($photo, '사진 정보가 수정되었습니다.');
    }

    /**
     * ★ v11.1.1 — update용 페어 검증 (store와 미세하게 다름)
     *
     * store와의 차이:
     *  - store는 "이 시공 전 사진을 가리키는 시공 후가 있나?" 만 검사
     *  - update는 "내가 아닌 다른 시공 후가 가리키는가?" 검사 (자기 제외)
     *
     * @return null|JsonResponse  null이면 통과
     */
    private function validatePairedForUpdate(int $pairedWithId, int $siteId, int $myPhotoId)
    {
        // 1. 짝 시공 전 사진이 같은 현장 + before 카테고리 + 살아있는지
        $target = SiteFile::where('id', $pairedWithId)
            ->where('site_id', $siteId)
            ->where('photo_category', 'before')
            ->first();

        if (!$target) {
            return ApiResponse::error('짝으로 지정한 시공 전 사진을 찾을 수 없습니다.',
                ErrorCode::PHOTO_PAIR_TARGET_NOT_FOUND, 422);
        }

        // 2. 이미 다른 시공 후가 가리키는지 (자기 자신 제외)
        $alreadyPaired = SiteFile::where('paired_with_id', $pairedWithId)
            ->where('id', '!=', $myPhotoId) // 자기 자신은 제외
            ->exists();

        if ($alreadyPaired) {
            return ApiResponse::error('이 시공 전 사진은 이미 다른 시공 후 사진과 짝지어져 있습니다.',
                ErrorCode::PHOTO_PAIR_DUPLICATE, 422);
        }

        return null;
    }

    /**
     * 사진 삭제 — SoftDelete
     *
     * DELETE /api/schedules/{scheduleId}/photos/{photoId}
     *
     * v11.1 추가: 시공 전 사진을 삭제하면 그것을 가리키던 시공 후 사진의
     *            paired_with_id를 NULL로 자동 해제 (orphan 방지)
     */
    public function destroy(Request $request, int $scheduleId, int $photoId)
    {
        $user = $request->user();

        $schedule = Schedule::when($user->team_id, fn($q) => $q->where('team_id', $user->team_id))
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        $photo = SiteFile::where('id', $photoId)
            ->where('site_id', $schedule->site_id)
            ->first();

        if (!$photo) {
            return ApiResponse::error('사진을 찾을 수 없습니다.',
                ErrorCode::PHOTO_NOT_FOUND, 404);
        }

        // ★ v11.1 — 시공 전 사진 삭제 시, 그것을 가리키던 시공 후 사진의 paired_with_id 해제
        if ($photo->photo_category === 'before') {
            SiteFile::where('paired_with_id', $photo->id)
                ->update(['paired_with_id' => null]);
        }

        $photo->delete(); // SoftDelete

        return ApiResponse::success(null, '사진이 삭제되었습니다.');
    }

    /**
     * ★ v11.1 — paired_with_id 추가 검증 헬퍼
     *
     * 검증 항목:
     *  1. 카테고리 = 'after' 일 때만 허용 (시공 전이 다른 시공 전을 가리키면 안 됨)
     *  2. 가리키는 사진이 같은 현장(site_id)인지
     *  3. 가리키는 사진이 'before' 카테고리인지
     *  4. 가리키는 사진이 이미 다른 시공 후 사진의 짝으로 지정됐는지 (1:1 보장)
     *
     * @return null|JsonResponse  null이면 검증 통과
     */
    private function validatePairedWith(int $pairedWithId, int $siteId, string $category)
    {
        // 1. 시공 후 사진일 때만 허용
        if ($category !== 'after') {
            return ApiResponse::error('짝(paired_with_id)은 시공 후 사진에서만 지정할 수 있습니다.',
                ErrorCode::PHOTO_PAIR_INVALID, 422);
        }

        // 2~3. 짝 사진이 같은 현장 + before 카테고리 + 살아있는지 확인
        $target = SiteFile::where('id', $pairedWithId)
            ->where('site_id', $siteId)
            ->where('photo_category', 'before')
            ->first();

        if (!$target) {
            return ApiResponse::error('짝으로 지정한 시공 전 사진을 찾을 수 없습니다.',
                ErrorCode::PHOTO_PAIR_TARGET_NOT_FOUND, 422);
        }

        // 4. 이미 다른 시공 후가 이 시공 전을 짝으로 가리키고 있는지
        $alreadyPaired = SiteFile::where('paired_with_id', $pairedWithId)->exists();
        if ($alreadyPaired) {
            return ApiResponse::error('이 시공 전 사진은 이미 다른 시공 후 사진과 짝지어져 있습니다.',
                ErrorCode::PHOTO_PAIR_DUPLICATE, 422);
        }

        return null; // 모든 검증 통과
    }
}
