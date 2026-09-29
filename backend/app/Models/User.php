<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'google_id',
        'kakao_id',
        // ★ v18.23 — 팀원 간 프로필/연락처 공유
        'avatar_color',
        'avatar_image_path',
        'kakao_talk_id',
        'role_id',
        'team_id',
        // ★ v1.9 추가 — 프리랜서 모드 지원
        'user_type',
        'individual_plan',
        'individual_plan_expires_at',
    ];
    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // ── 관계 설정 ──

    /**
     * belongsTo: "이 User는 하나의 Role에 속한다"
     * User::find(1)->role  →  SELECT * FROM roles WHERE id = user.role_id
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * belongsTo: "이 User는 하나의 (활성) Team에 속한다"
     *   ★ v18.21부터 team_id는 "지금 활동 중인 팀"만 가리킴 — 실제 소속 팀
     *   전체는 teams()/teamIds() 참고 (여러 팀 동시 소속 가능).
     */
    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * ★ v18.21 — 여러 팀 동시 소속. team_members 중간 테이블을 통해 연결.
     *   $user->teams  →  이 사람이 소속된 모든 Team 목록
     */
    public function teams()
    {
        return $this->belongsToMany(Team::class, 'team_members')
                    ->withPivot('role_id', 'joined_at')
                    ->wherePivotNull('deleted_at')
                    ->withTimestamps();
    }

    /**
     * 이 사람이 소속된 모든 팀의 id 배열 (Schedule/Site의 "team" 스코프에서
     * 여러 팀 게시판을 한 캘린더로 합치는 데 사용).
     */
    public function teamIds(): array
    {
        return $this->teams()->pluck('teams.id')->all();
    }
}
