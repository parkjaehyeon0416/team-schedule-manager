<?php

namespace App\Mail;

use App\Models\ContentReport;
use App\Services\ModerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * ★ v18.72 — 운영자에게 새 신고 알림 메일 (Apple 1.2: 24시간 안에 확인). 받는 곳은 config('workmate.support_email').
 *   신고자·대상자 이름은 넣지 않음(메일함에 개인정보를 남기지 않게) — 자세한 내용은 운영자 웹 링크에서.
 *   보내는 곳: ContentReportController::store (응답을 보낸 뒤, 실패해도 신고는 그대로 접수)
 */
class ContentReportMail extends Mailable
{
    use Queueable;

    public function __construct(public ContentReport $report)
    {
    }

    public function envelope(): Envelope
    {
        $type = ContentReport::TARGET_LABELS[$this->report->target_type] ?? $this->report->target_type;
        $reason = ContentReport::REASONS[$this->report->reason] ?? $this->report->reason;

        return new Envelope(subject: "[현장메이트] 새 신고 {$this->report->number} ({$type} · {$reason})");
    }

    public function content(): Content
    {
        $r = $this->report;

        return new Content(view: 'emails.content-report', with: [
            'no'          => $r->number,
            'typeLabel'   => ContentReport::TARGET_LABELS[$r->target_type] ?? $r->target_type,
            'reasonLabel' => ContentReport::REASONS[$r->reason] ?? $r->reason,
            'teamName'    => $r->team?->name ?? ($r->snapshot['team_name'] ?? null),
            'excerpt'     => ModerationService::excerpt($r, 120),
            'hasDetail'   => filled($r->detail),
            'reportedAt'  => $r->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
            'link'        => rtrim((string) config('app.url'), '/') . '/admin/reports/' . $r->id,
        ]);
    }
}
