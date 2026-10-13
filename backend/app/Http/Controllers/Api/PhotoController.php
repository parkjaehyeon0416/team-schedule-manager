<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Schedule;
use App\Models\Site;
use App\Models\SiteFile;
use App\Support\ReportPhotoCache;
use App\Support\UploadGuard;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;

/**
 * 현장 사진 관리 컨트롤러
 *
 * 변경 이력:
 *  - 2026-04-26 v11:    카테고리(시공 전/중/후/기타) 지원 + index 메서드 신규
 *                       + site_id 매핑 버그 수정 (scheduleId → schedule->site_id)
 *                       + 다른 팀 일정 접근 차단 (team_id 검증)
 *  - 2026-04-26 v11.1:  paired_with_id 도입 — 시공 후 사진이 어떤 시공 전 사진과 짝인지 명시
 *  - ★ v18.67 보안:     올리기·수정·삭제 권한을 "거쳐 온 일정"이 아니라 "사진이 속한 현장" 기준으로 판단,
 *                       팀을 나간 사람은 보기만(나간 뒤 올라온 사진은 안 보임), 삭제하면 파일도 지움,
 *                       가로·세로 6000픽셀·하루 300장·2GB 한도, 올리면 보고서용 줄인 사진을 미리 만듦
 */
class PhotoController extends Controller implements HasMiddleware
{
    // ★ v18.67 — 요금제와 별개인 남용 방지 한도(출시 기념 무료로 요금제 한도가 꺼져 있어도 적용)
    private const DAILY_UPLOAD_LIMIT  = 300;                      // 사용자당 하루 사진 장수(지운 사진도 셈)
    private const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;   // 사용자당 올린 사진 총용량 2GB

    /** ★ v18.67 보안 — 운영자 계정은 앱 사진 API 사용 불가(routes/api.php 대신 컨트롤러에서 붙임) */
    public static function middleware(): array
    {
        return [new Middleware(\App\Http\Middleware\BlockOperatorFromApp::class)];
    }

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
        $schedule = Schedule::forUser($user)
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
        // ★ v18.67 보안 — 보기만 하는 사람(팀을 나간 사람 등)은 나가기 전에 올라온 사진 + 본인 사진만
        //   (나가기 전에 개인 일정에 팀 현장을 붙여 두거나, 배정됐던 옛 팀 일정으로 나간 뒤 새 사진을 계속 보던 것 차단)
        $photos = Site::applyViewCutoff(
            SiteFile::where('site_id', $schedule->site_id)->where('file_type', 'photo'),
            $schedule->viewCutoffFor($user), $user, 'uploaded_by'
        )
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

        // ★ v18.67 — 저장 전에 머리글(getimagesize)만 읽어 진짜 JPG·PNG인지, 가로·세로 6000픽셀 이하인지 확인
        //   (용량은 작아도 픽셀이 엄청 큰 이미지 = 압축 폭탄. 보고서 PDF를 만들 때 서버를 수십 초씩 붙잡았음)
        if ($fail = UploadGuard::imageError($request->file('photo'))) {
            return $fail;
        }

        // ② 일정 존재 + 같은 팀 확인
        $schedule = Schedule::forUser($user)
            ->find($scheduleId);

        if (!$schedule) {
            return ApiResponse::error('일정을 찾을 수 없습니다.',
                ErrorCode::SCHEDULE_NOT_FOUND, 404);
        }

        // ★ v18.67 보안 — 팀을 나간 사람은 옛 팀 일정을 보기만(사진 올리기 불가). 현장 자동 생성보다 먼저 확인
        if (!$schedule->canContributeBy($user)) {
            return ApiResponse::error('지금 소속된 팀의 일정에만 사진을 올릴 수 있어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
        }
        if ($fail = $this->abuseLimitError($user, (int) $request->file('photo')->getSize())) {
            return $fail;
        }

        // ★ v18.35 — 주소만 적은 일정이면 그 주소로 현장을 자동 생성해 연결
        if (!$schedule->ensureSite($user->id)) {
            return ApiResponse::error('일정에 현장이나 주소를 먼저 지정해야 사진을 올릴 수 있습니다.',
                ErrorCode::PHOTO_NO_SITE_LINKED, 422);
        }
        // ★ v18.67 보안 — 올릴 수 있는지는 "현장" 기준. 개인 일정에 붙인 팀 현장(그 팀을 나간 경우)이나
        //   다른 팀 현장처럼 볼 수만 있는 현장에는 못 올림
        $site = Site::withTrashed()->find($schedule->site_id);
        if (!$site || !$site->canContributeBy($user, $schedule)) {
            return ApiResponse::error('이 현장에는 사진을 올릴 수 없어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
        }
        if ($limitError = $this->photoLimitError($user, (int) $schedule->site_id, $schedule->team_id)) {
            return $limitError;
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
        // ★ v18.67 — 보고서 PDF용 줄인 사진을 응답을 보낸 뒤 미리 만들어 둠(PDF 만들 때 큰 원본을 펼치지 않게)
        ReportPhotoCache::warmAfterResponse($record);

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
        $schedule = Schedule::forUser($user)
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

        // ★ v18.62 보안 — 올린 사람 본인 또는 팀장·부팀장만 수정·삭제(예전엔 팀원 누구나 남의 사진을 지울 수 있었음)
        // ★ v18.67 보안 — 판단 기준을 "거쳐 온 일정"이 아니라 "사진이 속한 현장"으로(내 개인 일정에 팀 현장을 붙여 우회하던 것 차단)
        if ($fail = $this->modifyDenied($user, $photo, $schedule)) {
            return $fail;
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

        $schedule = Schedule::forUser($user)
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

        // ★ v18.62 보안 — 올린 사람 본인 또는 팀장·부팀장만 수정·삭제(예전엔 팀원 누구나 남의 사진을 지울 수 있었음)
        // ★ v18.67 보안 — 판단 기준을 "거쳐 온 일정"이 아니라 "사진이 속한 현장"으로(내 개인 일정에 팀 현장을 붙여 우회하던 것 차단)
        if ($fail = $this->modifyDenied($user, $photo, $schedule)) {
            return $fail;
        }

        $this->deletePhoto($photo);

        return ApiResponse::success(null, '사진이 삭제되었습니다.');
    }

    /**
     * ★ v18.67 보안 — 사진 수정·삭제 권한(현장 기준)
     *   - 현장을 관리하는 사람(개인 현장 주인, 그 팀 팀장·부팀장): 누구 사진이든
     *   - 올린 사람 본인: 지금도 그 현장에 사진을 올릴 수 있을 때만(팀을 나간 뒤엔 보기만)
     */
    private function modifyDenied($user, SiteFile $photo, ?Schedule $via)
    {
        $site = Site::withTrashed()->find($photo->site_id);
        if ($site && $site->canEditBy($user)) {
            return null;
        }
        if ($site && (int) $photo->uploaded_by === (int) $user->id && $site->canContributeBy($user, $via)) {
            return null;
        }
        return ApiResponse::error('본인이 올린 사진만 수정·삭제할 수 있어요.', ErrorCode::AUTH_NO_PERMISSION, 403);
    }

    /**
     * ★ v18.67 — 사진 삭제: 기록은 소프트 삭제로 남기되 공개 폴더의 실제 파일은 지움.
     *   예전엔 지운 사진도 /storage/site-photos/... 주소로 계속 열렸음(개인정보 파기·디스크 낭비).
     *   시공 전 사진이면 그것을 가리키던 시공 후 사진의 짝(paired_with_id)도 해제(★ v11.1).
     */
    private function deletePhoto(SiteFile $photo): void
    {
        if ($photo->photo_category === 'before') {
            SiteFile::where('paired_with_id', $photo->id)
                ->update(['paired_with_id' => null]);
        }

        $photo->delete(); // SoftDelete

        if ($photo->file_path) {
            try {
                Storage::disk('public')->delete($photo->file_path);
                // 보고서 PDF용으로 줄여 둔 사진(비공개 폴더)도 같이
                ReportPhotoCache::forget((int) $photo->id);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('사진 파일 삭제 실패', ['photo_id' => $photo->id, 'error' => $e->getMessage()]);
            }
        }
    }

    /**
     * ★ v18.67 — 요금제와 별개인 남용 방지 한도(무료 계정 하나로 /data 디스크를 채우지 못하게)
     *   - 하루 300장(지운 사진도 셈 → 올렸다 지우기 반복으로 우회 불가) → 429
     *   - 내가 올린 사진(지우지 않은 것) 총용량 2GB → 422
     */
    private function abuseLimitError($user, int $incomingBytes)
    {
        $today = SiteFile::withTrashed()
            ->where('uploaded_by', $user->id)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();
        if ($today >= self::DAILY_UPLOAD_LIMIT) {
            return ApiResponse::error('사진은 하루에 ' . self::DAILY_UPLOAD_LIMIT . '장까지 올릴 수 있어요. 내일 다시 올려주세요.',
                ErrorCode::TOO_MANY_REQUESTS, 429);
        }

        $used = (int) SiteFile::where('uploaded_by', $user->id)->sum('file_size');
        if ($used + max(0, $incomingBytes) > self::STORAGE_LIMIT_BYTES) {
            return ApiResponse::error('사진 저장 공간(2GB)을 다 썼어요. 필요 없는 사진을 지운 뒤 다시 올려주세요.',
                'ERR_PHOTO_006', 422);
        }

        return null;
    }

    /**
     * ★ DESIGN-CANVAS(SITE_DETAIL/CREATE) 추가 — 현장 단위 사진 (일정 경유 없이 현장 자체에 직접 업로드)
     *
     * GET /api/sites/{siteId}/photos
     */
    public function siteIndex(Request $request, int $siteId)
    {
        $user = $request->user();

        $site = Site::forUser($user)->find($siteId);
        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }

        // ★ v18.67 보안 — 직접 만든 옛 팀 현장(created_by)도 팀을 나간 뒤엔 나가기 전 사진 + 본인 사진만
        $photos = Site::applyViewCutoff(
            SiteFile::where('site_id', $siteId)->where('file_type', 'photo'),
            $site->viewCutoffFor($user), $user, 'uploaded_by'
        )
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        $grouped = ['before' => [], 'during' => [], 'after' => [], 'other' => []];
        foreach ($photos as $p) {
            $cat = $p->photo_category ?? 'other';
            if (!array_key_exists($cat, $grouped)) {
                $cat = 'other';
            }
            $grouped[$cat][] = $p;
        }

        return ApiResponse::success([
            'before' => $grouped['before'],
            'during' => $grouped['during'],
            'after'  => $grouped['after'],
            'other'  => $grouped['other'],
            'counts' => array_map('count', $grouped),
        ], '사진 목록 조회 성공');
    }

    /**
     * POST /api/sites/{siteId}/photos
     * Body: photo (file), photo_category (before|after), description (optional)
     */
    public function siteStore(Request $request, int $siteId)
    {
        $user = $request->user();

        $site = Site::editableBy($user)->find($siteId);
        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }
        if ($limitError = $this->photoLimitError($user, $site->id, $site->team_id)) {
            return $limitError;
        }

        $validated = $request->validate([
            'photo'          => 'required|image|mimes:jpeg,png,jpg|max:10240',
            'photo_category' => 'required|in:before,during,after,other',
            'description'    => 'nullable|string|max:255',
        ]);

        // ★ v18.67 — 가로·세로 6000픽셀(압축 폭탄 차단) + 하루 300장·총 2GB 한도(일정 경유 업로드와 같음)
        if ($fail = UploadGuard::imageError($request->file('photo'))) {
            return $fail;
        }
        if ($fail = $this->abuseLimitError($user, (int) $request->file('photo')->getSize())) {
            return $fail;
        }

        $file   = $request->file('photo');
        $stored = $file->store('site-photos', 'public');

        $sortOrder = SiteFile::where('site_id', $siteId)
            ->ofCategory($validated['photo_category'])
            ->count();

        $record = SiteFile::create([
            'site_id'        => $siteId,
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
        ]);
        // ★ v18.67 — 보고서 PDF용 줄인 사진을 응답을 보낸 뒤 미리 만들어 둠
        ReportPhotoCache::warmAfterResponse($record);

        return ApiResponse::success($record, '사진이 업로드되었습니다.', 201);
    }

    /**
     * DELETE /api/sites/{siteId}/photos/{photoId}
     */
    public function siteDestroy(Request $request, int $siteId, int $photoId)
    {
        $user = $request->user();

        $site = Site::editableBy($user)->find($siteId);
        if (!$site) {
            return ApiResponse::error('현장을 찾을 수 없습니다.', ErrorCode::SITE_NOT_FOUND, 404);
        }

        $photo = SiteFile::where('id', $photoId)->where('site_id', $siteId)->first();
        if (!$photo) {
            return ApiResponse::error('사진을 찾을 수 없습니다.', ErrorCode::PHOTO_NOT_FOUND, 404);
        }

        // ★ v18.67 — 짝 해제 + 소프트 삭제 + 공개 폴더의 실제 파일도 삭제
        $this->deletePhoto($photo);

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
    /**
     * ★ v18.47 — 무료는 현장당 사진 20장. 올리는 사람이 프로/팀 요금제이거나, 팀 현장이면 그 팀장이 팀 요금제일 때 무제한
     */
    private function photoLimitError($user, int $siteId, ?int $teamId)
    {
        if (\App\Services\PlanService::can($user, 'photo_unlimited')
            || ($teamId && \App\Services\PlanService::teamCan($teamId, 'photo_unlimited'))) {
            return null;
        }
        $limit = (int) config('plans.free_limits.photos_per_site');
        if (($used = SiteFile::where('site_id', $siteId)->where('file_type', 'photo')->count()) >= $limit) {
            return \App\Services\PlanService::denied('photo_unlimited',
                "무료로는 현장마다 사진을 {$limit}장까지 올릴 수 있어요. 개인 프로나 팀 요금제에서 무제한으로 쓸 수 있어요.",
                ['limit' => $limit, 'used' => $used, 'unit' => '장']);
        }
        return null;
    }

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
