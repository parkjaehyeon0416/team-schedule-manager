<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * ★ v18.43 — 고객 문의 (앱에서 작성 → 운영자 웹에서 답변 → 앱 '내 문의' + 푸시로 확인)
 */
class Inquiry extends Model
{
    use SoftDeletes;

    public const CATEGORIES = ['usage', 'bug', 'account', 'payment', 'etc'];

    protected $fillable = [
        'user_id', 'category', 'title', 'content', 'app_version', 'device', 'push_enabled', 'notify',
        'status', 'answer', 'answered_by', 'answered_at', 'answer_seen_at', 'helpful',
    ];

    protected $casts = [
        'answered_at'    => 'datetime',
        'answer_seen_at' => 'datetime',
        'push_enabled'   => 'boolean',
        'notify'         => 'boolean',
        'helpful'        => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function files()
    {
        return $this->hasMany(InquiryFile::class);
    }

    // 화면에 보이는 문의 번호 (디자인: Q-1042)
    public function getNumberAttribute(): string
    {
        return 'Q-' . (1000 + $this->id);
    }

    // 첨부 사진 경로 "/storage/inquiries/…" — 앱은 서버 주소를 앞에 붙이고, 운영자 웹은 그대로 사용
    public function filePaths(): array
    {
        return $this->files->map(fn($f) => '/storage/' . $f->path)->all();
    }
}
