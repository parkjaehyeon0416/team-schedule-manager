<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * ★ v18.72 — 콘텐츠 신고 (Apple 1.2: 앱에서 신고 → 운영자 웹에서 24시간 안에 확인·숨김·정지)
 *
 * 작업 보고서(SiteReport)와 헷갈리지 않게 이름을 ContentReport로.
 * snapshot: 신고 시점의 본문/사진 경로/이름 — 작성자가 먼저 지워도 증거가 남음.
 */
class ContentReport extends Model
{
    use SoftDeletes;

    public const TARGETS = ['team_notice', 'photo', 'user'];

    public const TARGET_LABELS = [
        'team_notice' => '팀 공지',
        'photo'       => '팀 앨범 사진',
        'user'        => '팀원',
    ];

    // 앱 신고 시트의 사유 5개와 같은 키·문구 (앱 moderationApi.ts REPORT_REASONS)
    public const REASONS = [
        'spam'    => '스팸·광고',
        'abuse'   => '욕설·비하·혐오',
        'sexual'  => '음란·선정적인 내용',
        'privacy' => '개인정보 노출',
        'etc'     => '기타',
    ];

    public const STATUSES = ['pending', 'resolved', 'dismissed'];

    protected $fillable = [
        'reporter_id', 'target_type', 'target_id', 'target_user_id', 'team_id',
        'reason', 'detail', 'snapshot', 'status', 'action', 'note', 'handled_by', 'handled_at',
    ];

    protected $casts = [
        'snapshot'   => 'array',
        'handled_at' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    // 화면에 보이는 신고 번호 (문의 Q-1042와 같은 방식: R-1042)
    public function getNumberAttribute(): string
    {
        return 'R-' . (1000 + $this->id);
    }
}
