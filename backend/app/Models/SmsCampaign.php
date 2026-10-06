<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ★ v18.43 — 문자 발송 기록 (보낼 때마다 1행)
 */
class SmsCampaign extends Model
{
    protected $fillable = ['template_id', 'kind', 'target', 'body', 'recipient_count', 'success_count', 'fail_count', 'status', 'sent_by'];

    public function template()
    {
        return $this->belongsTo(SmsTemplate::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
