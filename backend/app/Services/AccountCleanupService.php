<?php

namespace App\Services;

use App\Models\BusinessCard;
use App\Models\CardView;
use App\Models\DeviceToken;
use App\Models\Inquiry;
use App\Models\InquiryFile;
use App\Models\SiteReport;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * ★ v18.67 — 회원 탈퇴 때 개인정보 정리 (보안 점검 audit66: 탈퇴 후 공개 명함·공유 링크·이메일이 남던 문제)
 *
 * AuthController::withdraw()에서 소프트 삭제($user->delete()) 바로 전에 부른다.
 * 여러 번 불러도 결과가 같다(멱등) — 이미 탈퇴한 계정을 정리하는 마이그레이션에서도 같은 함수를 쓴다.
 *
 * 지우는 것
 *   - 공개 명함: 비공개로 바꾸고 이름·연락처 등 내용을 모두 비운 뒤 삭제 → /c/{code} 404, PDF 속 QR도 더는 안 열림
 *   - 명함 조회 기록(방문자 IP 해시), 프로필 사진 파일
 *   - 내가 만든 보고서의 공유 링크(즉시 만료)
 *   - 고객 문의 첨부 사진 파일
 *   - 휴대폰 번호·카카오톡 아이디·주요 공정(★ v18.68), 푸시 기기 등록
 *   (★ v18.68 비밀번호 해시·remember_token은 본인 확인이 끝난 뒤 AuthController::withdraw()가 직접 비움 — 여기서 지우면
 *    이 함수를 본인 확인 전에 불렀을 때 비밀번호 확인이 깨짐. 탈퇴 회원의 접속 기록·마지막 로그인 시각은 3개월 뒤
 *    routes/console.php 'prune-withdrawn-login-records'가 지움)
 *   - 원래 이메일 → 알아볼 수 없는 값(withdrawn_{id}_{시각}@deleted.local)으로 바꿈
 * 남기는 것 (기존 정책 그대로)
 *   - 이름: 팀원들의 과거 일정·정산 기록에 표시
 *   - 팀원과 함께 쓰는 일정·현장·사진·견적·보고서 기록(팀 필터 조회용), 문의 글(응대 기록)
 * 건드리지 않는 것
 *   - 소셜 로그인 ID·Apple 토큰: AuthController가 카카오 연결 끊기·Apple revoke를 먼저 한 뒤 직접 비움
 */
class AccountCleanupService
{
    /** 탈퇴 계정 이메일 자리표시 도메인(실제로 메일이 가지 않는 주소) */
    public const EMAIL_DOMAIN = 'deleted.local';

    public function onWithdraw(User $user): void
    {
        $this->removeBusinessCard($user);
        $this->removeAvatar($user);
        $this->expireReportShareLinks($user);
        $this->removeInquiryAttachments($user);

        DeviceToken::where('user_id', $user->id)->delete();

        $this->clearContactAndEmail($user);
    }

    /** 공개 명함 닫기: 비공개 + 내용 비움 + 소프트 삭제 (공유 코드는 남겨서 옛 링크가 다른 명함으로 열리는 일이 없게) */
    private function removeBusinessCard(User $user): void
    {
        $cards = BusinessCard::withTrashed()->where('user_id', $user->id)->get();

        foreach ($cards as $card) {
            if ($card->profile_photo_path) {
                Storage::disk('public')->delete($card->profile_photo_path);
            }

            $card->forceFill([
                'is_public'          => false,
                'display_name'       => null,
                'contact_phone'      => null,
                'job_title'          => null,
                'years_experience'   => null,
                'service_area'       => null,
                'specialty'          => null,
                'tagline'            => null,
                'profile_photo_path' => null,
                'showcase_photo_ids' => [],
            ])->save();

            if (!$card->trashed()) {
                $card->delete();
            }
        }

        if ($cards->isNotEmpty()) {
            CardView::whereIn('card_id', $cards->pluck('id'))->delete();
        }
    }

    private function removeAvatar(User $user): void
    {
        if (!$user->avatar_image_path) {
            return;
        }

        Storage::disk('public')->delete($user->avatar_image_path);
        $user->forceFill(['avatar_image_path' => null])->save();
    }

    /** 이미 보낸 보고서 링크(최대 3일)도 탈퇴 즉시 닫음 — SiteReportController::publicView는 만료된 링크를 막음 */
    private function expireReportShareLinks(User $user): void
    {
        SiteReport::withTrashed()
            ->where('user_id', $user->id)
            ->where('share_expires_at', '>', now())
            ->update(['share_expires_at' => now()->subSecond()]);
    }

    private function removeInquiryAttachments(User $user): void
    {
        $files = InquiryFile::whereIn(
            'inquiry_id',
            Inquiry::withTrashed()->where('user_id', $user->id)->select('id')
        )->get();

        foreach ($files as $file) {
            Storage::disk('public')->delete($file->path);
        }

        if ($files->isNotEmpty()) {
            InquiryFile::whereIn('id', $files->pluck('id'))->delete();
        }
    }

    /**
     * 연락처를 비우고 이메일을 알아볼 수 없는 값으로 바꿈.
     *   예전(v18.62~v18.66)엔 'original@x.com.withdrawn.시각'으로 원래 이메일이 그대로 남았음.
     *   id가 들어가 있어 고유값 충돌이 없고, 원래 이메일로 다시 가입할 수 있음.
     */
    private function clearContactAndEmail(User $user): void
    {
        $changes = [];

        if ($user->phone !== null) {
            $changes['phone'] = null;
        }
        if ($user->kakao_talk_id !== null) {
            $changes['kakao_talk_id'] = null;
        }
        if ($user->main_work_types !== null) {
            $changes['main_work_types'] = null; // ★ v18.68 회원가입 '주요 공정'(선택 항목)도 탈퇴 때 지움
        }
        if (!self::isPlaceholderEmail((string) $user->email)) {
            $changes['email'] = 'withdrawn_' . $user->id . '_' . time() . '@' . self::EMAIL_DOMAIN;
        }

        if ($changes) {
            $user->forceFill($changes)->save();
        }
    }

    public static function isPlaceholderEmail(string $email): bool
    {
        return str_starts_with($email, 'withdrawn_') && str_ends_with($email, '@' . self::EMAIL_DOMAIN);
    }
}
