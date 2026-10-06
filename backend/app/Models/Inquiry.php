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

    protected $fillable = ['user_id', 'category', 'title', 'content', 'status', 'answer', 'answered_by', 'answered_at'];

    protected $casts = ['answered_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
