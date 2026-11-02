<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * ★ v18.72 — 사용자 차단 (Apple 1.2)
 *
 * 한쪽만 적용: blocker 화면에서 blocked가 쓴 팀 공지·팀 앨범 사진·팀 활동이 안 보이고, blocked 때문에 생기는 알림·푸시도 안 받음.
 * 팀원 목록·일정·정산·근태·작업 보고서 같은 업무 기록은 거르지 않음.
 * 조회는 대부분 User::blockedUserIds() / User::blockerIdsOf()로 함.
 */
class UserBlock extends Model
{
    protected $fillable = ['blocker_id', 'blocked_id'];

    public function blocker()
    {
        return $this->belongsTo(User::class, 'blocker_id');
    }

    public function blocked()
    {
        return $this->belongsTo(User::class, 'blocked_id');
    }
}
