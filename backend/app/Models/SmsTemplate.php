<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ★ v18.43 — 운영자 문자 템플릿. kind=ad(광고성)는 마케팅 수신 동의자에게만, info(안내성)는 전체 회원에게.
 */
class SmsTemplate extends Model
{
    protected $fillable = ['name', 'kind', 'body', 'notice_id', 'created_by'];

    public function notice()
    {
        return $this->belongsTo(Notice::class);
    }
}
