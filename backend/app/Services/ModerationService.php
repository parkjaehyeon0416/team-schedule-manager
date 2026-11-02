<?php

namespace App\Services;

use App\Models\ContentReport;
use App\Models\SiteFile;
use App\Models\TeamNotice;
use App\Models\User;
use App\Support\ReportPhotoCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.72 — 신고된 콘텐츠 숨김/숨김 풀기 (Apple 1.2, 운영자 웹 "신고 관리")
 *
 *   숨김 = 소프트 삭제(deleted_at) + hidden_at/hidden_by/hidden_reason 기록.
 *     읽는 곳(팀 공지·앨범·활동·일정 사진·현장 사진·보고서 PDF·공개 명함)이 이미 모두 deleted_at을 거르므로
 *     읽는 쿼리를 하나도 안 고쳐도 모든 화면에서 사라짐. hidden_*는 '작성자가 지움'과 구분하고 숨김을 풀 때 씀.
 *   사진은 공개 폴더(/storage/...) 파일을 비공개 디스크 moderation/hidden/{원래 경로}로 옮김 → 옛 주소로도 안 열림.
 *     보고서 PDF용 줄인 사진(ReportPhotoCache)도 지움(공개 명함·보고서 PDF에서도 사라짐).
 *     짝(paired_with_id)은 풀지 않음 — 짝을 쓰는 곳이 모두 없는 사진을 견디고, 숨김을 풀면 짝도 그대로 살아남.
 *   신고 증거 사본: 사진 신고 때 moderation/evidence/report-{신고 id}.{확장자}로 복사(작성자가 먼저 지우면
 *     PhotoController가 실제 파일을 지우므로). 운영자 웹은 서명 링크(AdminReportController::signedPhoto)로만 봄.
 */
class ModerationService
{
    public const HIDDEN_DIR   = 'moderation/hidden';
    public const EVIDENCE_DIR = 'moderation/evidence';

    /** 숨길 수 있는 신고 대상(팀원 신고는 숨길 콘텐츠가 없음 → 계정 정지로 처리) */
    public const HIDEABLE = ['team_notice', 'photo'];

    /**
     * 신고 대상 숨기기 + 같은 대상의 처리 대기 신고를 모두 처리 완료로.
     *   반환 ['result' => hidden | already_hidden | already_deleted, 'resolved' => 처리한 신고 수, 'file_moved' => bool|null]
     *   작성자가 이미 지운 콘텐츠(또는 기록 없음)는 숨기지 않고 신고만 처리 완료(조치 없음).
     */
    public function hide(ContentReport $r, User $op, ?string $reason): array
    {
        $model = $this->targetModel($r);

        if (!$model || ($model->trashed() && !$model->hidden_at)) {
            return ['result' => 'already_deleted', 'resolved' => $this->resolveSameTarget($r, $op, 'none'), 'file_moved' => null];
        }
        if ($model->hidden_at) {
            return ['result' => 'already_hidden', 'resolved' => $this->resolveSameTarget($r, $op, 'hidden'), 'file_moved' => null];
        }

        $reason = trim((string) $reason) ?: self::defaultReason($r);
        DB::transaction(function () use ($model, $op, $reason) {
            $model->hidden_at = now();
            $model->hidden_by = $op->id;
            $model->hidden_reason = mb_substr($reason, 0, 255);
            if ($model instanceof TeamNotice) {
                $model->pinned = false; // 숨김을 풀었을 때 맨 위 고정으로 다시 튀어나오지 않게
            }
            $model->save();   // delete()는 deleted_at만 저장하므로 hidden_*를 먼저 저장
            $model->delete(); // 소프트 삭제 → 모든 목록에서 사라짐
        });

        // 목록에서 먼저 뺀 다음 파일을 옮김(옮기기에 실패해도 목록에는 안 나오고, 운영자에게 file_moved=false로 알림)
        $fileMoved = null;
        if ($model instanceof SiteFile) {
            $fileMoved = $this->moveToHidden($model);
            ReportPhotoCache::forget((int) $model->id);
        }

        return ['result' => 'hidden', 'resolved' => $this->resolveSameTarget($r, $op, 'hidden'), 'file_moved' => $fileMoved];
    }

    /**
     * 숨김 풀기 — 운영자가 숨긴 것(hidden_at 있음)만. 파일을 원래 자리로 되돌리고 hidden_*를 비운 뒤 복원.
     *   숨김으로 처리했던 같은 대상의 신고는 다시 '처리 대기'로(운영자가 처리 완료·기각을 다시 고름).
     *   반환 ['result' => restored | not_hidden, 'reopened' => 다시 대기로 바꾼 신고 수, 'file_restored' => bool|null]
     */
    public function unhide(ContentReport $r, User $op): array
    {
        $model = $this->targetModel($r);
        if (!$model || !$model->hidden_at) {
            return ['result' => 'not_hidden', 'reopened' => 0, 'file_restored' => null];
        }

        // 파일 먼저 되돌림(복원된 사진이 목록에 나오는 순간 파일이 있게)
        $fileRestored = $model instanceof SiteFile ? $this->restoreFromHidden($model) : null;

        DB::transaction(function () use ($model) {
            $model->hidden_at = null;
            $model->hidden_by = null;
            $model->hidden_reason = null;
            $model->restore(); // deleted_at=null + 위 변경을 함께 저장
        });

        if ($model instanceof SiteFile && $fileRestored) {
            ReportPhotoCache::warmAfterResponse($model); // 보고서 PDF용 보관본 다시 만들어 둠
        }

        $reopened = ContentReport::where('target_type', $r->target_type)->where('target_id', $r->target_id)
            ->where('status', 'resolved')->where('action', 'hidden')
            ->update(['status' => 'pending', 'action' => null, 'handled_by' => null, 'handled_at' => null]);

        return ['result' => 'restored', 'reopened' => $reopened, 'file_restored' => $fileRestored];
    }

    /** 신고 대상 모델(지운 것 포함). 팀원 신고는 null */
    public function targetModel(ContentReport $r): TeamNotice|SiteFile|null
    {
        return match ($r->target_type) {
            'team_notice' => TeamNotice::withTrashed()->find($r->target_id),
            'photo'       => SiteFile::withTrashed()->where('file_type', 'photo')->find($r->target_id),
            default       => null,
        };
    }

    /** 이 신고 + 같은 대상의 처리 대기 신고를 처리 완료로 — 처리한 개수 */
    private function resolveSameTarget(ContentReport $r, User $op, string $action): int
    {
        $ids = ContentReport::where('target_type', $r->target_type)->where('target_id', $r->target_id)
            ->where(fn($w) => $w->where('status', 'pending')->orWhere('id', $r->id))
            ->pluck('id');
        ContentReport::whereIn('id', $ids)->update([
            'status'     => 'resolved',
            'action'     => $action,
            'handled_by' => $op->id,
            'handled_at' => now(),
        ]);

        return $ids->count();
    }

    /** 공개 폴더 → 비공개 moderation/hidden/{원래 경로}. 옮겼으면 true, 실패 false, 옮길 파일이 없으면 null */
    private function moveToHidden(SiteFile $photo): ?bool
    {
        $path = $photo->file_path;
        if (!$path) {
            return null;
        }
        $public = Storage::disk('public');
        $local = Storage::disk('local');
        if (!$public->exists($path)) {
            return $local->exists(self::hiddenPath($path)) ? true : null;
        }

        try {
            if (!self::copyStream($public, $path, $local, self::hiddenPath($path))) {
                Log::warning('신고 숨김: 사진 파일 옮기기 실패', ['photo_id' => $photo->id]);
                return false;
            }
            $public->delete($path);
            return true;
        } catch (\Throwable $e) {
            Log::warning('신고 숨김: 사진 파일 옮기기 실패', ['photo_id' => $photo->id, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /** 비공개 moderation/hidden → 공개 폴더 원래 자리. 되돌렸으면 true, 실패 false, 되돌릴 파일이 없으면 null */
    private function restoreFromHidden(SiteFile $photo): ?bool
    {
        $path = $photo->file_path;
        if (!$path) {
            return null;
        }
        $public = Storage::disk('public');
        $local = Storage::disk('local');
        $hidden = self::hiddenPath($path);
        if (!$local->exists($hidden)) {
            return $public->exists($path) ? true : null;
        }

        try {
            // 숨길 때 옮기기에 실패해 공개 파일이 남아 있으면 덮어쓰지 않고 숨김 사본만 지움
            if (!$public->exists($path) && !self::copyStream($local, $hidden, $public, $path)) {
                Log::warning('신고 숨김 풀기: 사진 파일 되돌리기 실패', ['photo_id' => $photo->id]);
                return false;
            }
            $local->delete($hidden);
            return true;
        } catch (\Throwable $e) {
            Log::warning('신고 숨김 풀기: 사진 파일 되돌리기 실패', ['photo_id' => $photo->id, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /** 디스크 사이 파일 복사(스트림 — 큰 사진도 메모리에 통째로 올리지 않음) */
    private static function copyStream($fromDisk, string $from, $toDisk, string $to): bool
    {
        $stream = $fromDisk->readStream($from);
        if (!$stream) {
            return false;
        }
        try {
            return (bool) $toDisk->writeStream($to, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    /**
     * 사진 신고 증거 사본 — 신고 시점 공개 파일을 비공개 디스크로 복사(실패해도 신고는 그대로 접수).
     *   작성자가 나중에 사진을 지우면 공개 파일은 지워지지만 운영자는 이 사본으로 확인 가능.
     */
    public static function copyEvidence(ContentReport $r): void
    {
        $path = $r->snapshot['file_path'] ?? null;
        if ($r->target_type !== 'photo' || !$path) {
            return;
        }
        try {
            $public = Storage::disk('public');
            if ($public->exists($path)) {
                self::copyStream($public, $path, Storage::disk('local'), self::evidencePath((int) $r->id, $path));
            }
        } catch (\Throwable $e) {
            Log::warning('신고 증거 사본 만들기 실패', ['report_id' => $r->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * 운영자 웹에서 보여 줄 신고 사진 파일(절대 경로) — 없으면 null.
     *   ① 지금 공개 파일 ② 운영자가 숨겨서 옮긴 파일 ③ 신고 때 복사한 증거 사본 순서로 찾음.
     */
    public static function photoFile(ContentReport $r): ?string
    {
        if ($r->target_type !== 'photo') {
            return null;
        }
        $path = SiteFile::withTrashed()->whereKey($r->target_id)->value('file_path') ?: ($r->snapshot['file_path'] ?? null);
        if (!$path) {
            return null;
        }
        $public = Storage::disk('public');
        $local = Storage::disk('local');
        foreach ([[$public, $path], [$local, self::hiddenPath($path)], [$local, self::evidencePath((int) $r->id, $path)]] as [$disk, $rel]) {
            if ($disk->exists($rel)) {
                return $disk->path($rel);
            }
        }

        return null;
    }

    public static function hiddenPath(string $filePath): string
    {
        return self::HIDDEN_DIR . '/' . ltrim($filePath, '/');
    }

    public static function evidencePath(int $reportId, string $filePath): string
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION)) ?: 'jpg';
        return self::EVIDENCE_DIR . "/report-{$reportId}.{$ext}";
    }

    /** 운영자 목록·메일에 보이는 한 줄 요약(신고 시점 snapshot 기준) */
    public static function excerpt(ContentReport $r, int $width = 60): string
    {
        $s = $r->snapshot ?? [];
        $text = match ($r->target_type) {
            'team_notice' => (string) ($s['body'] ?? ''),
            'photo'       => trim('[사진] ' . ($s['site_name'] ?? '') . (!empty($s['description']) ? ' · ' . $s['description'] : '')),
            'user'        => trim(($s['name'] ?? '') . (!empty($s['team_name']) ? " ({$s['team_name']})" : '')),
            default       => '',
        };

        return mb_strimwidth(trim(preg_replace('/\s+/u', ' ', $text)), 0, $width, '…');
    }

    /** 숨김 사유를 안 적었을 때 기본값: "신고 R-1042 · 욕설·비하·혐오" */
    private static function defaultReason(ContentReport $r): string
    {
        return '신고 ' . $r->number . ' · ' . (ContentReport::REASONS[$r->reason] ?? $r->reason);
    }
}
