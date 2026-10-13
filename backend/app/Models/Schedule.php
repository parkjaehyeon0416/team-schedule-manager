<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Schedule extends Model
{
    use HasFactory, SoftDeletes;

    // ★ 대량할당 허용 필드 (create(), update() 시 필요)
    protected $fillable = [
        'site_id',
        // ★ v18.34 — 현장 등록 없이 적는 주소 / 동·호수
        'address',
        'address_detail',
        'team_id',
        'owner_id',
        'created_by',
        'date',
        // ★ DESIGN-CANVAS 추가 — 제목/시간/알림
        'title',
        'start_time',
        'end_time',
        'reminder_time',
        // ★ DESIGN-CANVAS(TAX_MONTH_DETAIL/INCOME_DETAIL) 추가 — 고용형태/지급상태
        'employment_type',
        'payment_status',
        // 공정 (v7 ENUM + v9.0 외래키 둘 다 지원)
        'work_type',
        'work_type_id',
        // ★ v9.0 추가 — 공수·급여·경비
        'daily_wage',
        'work_units',
        'expenses',
        'expenses_memo',
        // 기타
        'district',
        'area_m2',
        'memo',
        'status',
    ];

    // ★ v9.0 추가 — 숫자 컬럼 자동 변환 ($casts)
    protected $casts = [
        'date'         => 'date:Y-m-d',
        'daily_wage'   => 'decimal:2',
        'work_units'   => 'decimal:1',
        'expenses'     => 'decimal:2',
        'area_m2'      => 'decimal:2',
    ];

    // ────────────────────────────────────────────────
    // [관계 1] 하나의 일정은 하나의 현장에 속함
    //   $schedule->site  →  Site 객체 반환
    // ────────────────────────────────────────────────
    public function site()
    {
        return $this->belongsTo(Site::class);
    }

    /**
     * ★ v18.35 — 현장 등록 없이 주소만 적은 일정에서 사진 업로드/보고서 생성을 할 때,
     *   그 주소로 현장을 자동 생성해 연결한다(사진·보고서가 현장 단위로 저장되는 구조라 필요).
     *   주소/상세주소는 현장으로 옮기고 일정 쪽은 비움 — 표시할 때 중복되지 않게.
     *   이미 현장이 있으면 그대로, 주소도 없으면 null.
     */
    public function ensureSite(int $userId): ?int
    {
        if ($this->site_id) {
            return $this->site_id;
        }
        if (!$this->address) {
            return null;
        }

        $site = Site::create([
            'address'    => $this->address,
            'apt_name'   => $this->address_detail,
            'team_id'    => $this->team_id,
            'owner_id'   => $this->team_id ? null : ($this->owner_id ?? $userId),
            // ★ v18.67 보안 — 팀 일정이면 처음 사진을 올린 팀원이 아니라 일정을 만든 사람(팀장·부팀장)을 만든 사람으로.
            //   예전엔 팀원이 만든 사람으로 기록돼, 팀을 나간 뒤에도(Site::forUser의 created_by) 그 현장의 새 사진을 계속 봤음
            'created_by' => $this->team_id ? ($this->created_by ?? $userId) : $userId,
        ]);

        $this->site_id        = $site->id;
        $this->address        = null;
        $this->address_detail = null;
        // 위치 정보만 바뀌므로 공수 집계 Observer는 돌릴 필요 없음
        $this->saveQuietly();

        return $site->id;
    }

    // ────────────────────────────────────────────────
    // [관계 2] 하나의 일정은 하나의 팀에 속함
    //   $schedule->team  →  Team 객체 반환
    // ────────────────────────────────────────────────
    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    // ────────────────────────────────────────────────
    // [관계 3] 하나의 일정에 여러 팀원이 배정됨 (다대다)
    //   schedule_users 중간 테이블을 통해 연결
    //   $schedule->users  →  User 배열 반환
    // ────────────────────────────────────────────────
    public function users()
    {
        return $this->belongsToMany(User::class, 'schedule_users')
                    ->withTimestamps()
                    ->wherePivotNull('deleted_at');   // ★ SoftDelete된 연결 제외
    }

    // ────────────────────────────────────────────────
    // [관계 4] ★ v9.0 추가 — 공정 (work_type_id 외래키)
    //   $schedule->workType  →  WorkType 객체 반환
    // ────────────────────────────────────────────────
    public function workType()
    {
        return $this->belongsTo(WorkType::class, 'work_type_id');
    }

    // API 응답용 — `workType`으로 로드하면 JSON 키가 기존 `work_type` 문자열 컬럼을 객체로 덮어써서
    // 앱이 문자열로 렌더링하다 크래시함. 이 이름으로 로드하면 `work_type_relation` 키로 분리되어 나감.
    public function workTypeRelation()
    {
        return $this->belongsTo(WorkType::class, 'work_type_id');
    }

    // ────────────────────────────────────────────────
    // [스코프] 로그인 사용자 기준 조회 범위로 필터링
    //
    //   팀 소속 여부와 무관하게 "개인 일정"을 만들 수 있음(owner_id) — 팀에
    //   있어도 개인용으로 등록한 일정은 team_id가 null. 그래서 필터가 3가지:
    //     - 'personal' : 내가 owner_id로 등록한 개인 일정
    //     - 'team'     : 지금 소속 팀의 공유 일정 + (팀이 없거나 예전 팀 것도)
    //                    내가 만들었거나 투입 인원으로 배정됐던 과거 팀 일정
    //                    → 팀을 나간 뒤에도 "그때 일한 스케줄"을 조회할 수 있음
    //     - 'all'(기본): 위 둘의 합집합
    //
    //   과거 팀 일정은 team_id를 그대로 두고(탈퇴해도 team_id를 null로 바꾸지
    //   않음) created_by/투입인원으로만 접근을 판별함 — TeamController::leave/
    //   destroy 참고.
    // ────────────────────────────────────────────────
    public function scopeForUser($query, $user, string $filter = 'all')
    {
        $personal = fn ($q) => $q->where('owner_id', $user->id);

        // ★ v18.21 — 여러 팀 동시 소속: "지금 활성 팀" 하나가 아니라, 소속된
        //   모든 팀의 일정을 합쳐서 보여줌(통합 캘린더).
        $teamIds = $user->teamIds();

        $team = function ($q) use ($user, $teamIds) {
            $q->whereNotNull('team_id')->where(function ($q2) use ($user, $teamIds) {
                if (!empty($teamIds)) {
                    $q2->orWhereIn('team_id', $teamIds);
                }
                $q2->orWhere('created_by', $user->id)
                    ->orWhereHas('users', fn ($q3) => $q3->where('users.id', $user->id));
            });
        };

        if ($filter === 'personal') {
            return $query->where($personal);
        }
        if ($filter === 'team') {
            return $query->where($team);
        }

        return $query->where(function ($q) use ($personal, $team) {
            $q->where($personal)->orWhere($team);
        });
    }

    // ────────────────────────────────────────────────
    // [스코프] 수정/삭제 가능 범위 — 과거 팀 일정은 조회만 가능하고 수정은 불가.
    //   - 내 개인 일정(owner_id)이거나
    //   - ★ v18.44 내가 팀장인 팀의 일정(활성 팀이 아니어도 됨)
    // ────────────────────────────────────────────────
    public function scopeEditableBy($query, $user)
    {
        $led = $user->assignableTeamIds();
        return $query->where(function ($q) use ($user, $led) {
            $q->where('owner_id', $user->id);
            if (!empty($led)) {
                $q->orWhereIn('team_id', $led);
            }
        });
    }

    /** ★ v18.44 — 앱이 수정/삭제 버튼을 보여줄지 판단하는 값 */
    public function canEditBy($user): bool
    {
        return (int) $this->owner_id === (int) $user->id
            || ($this->team_id && $user->canAssignIn((int) $this->team_id));
    }

    /**
     * ★ v18.67 보안 — 이 일정에서 사진 올리기·보고서 만들기·공유 같은 "쓰기"를 할 수 있나.
     *   보기 범위(forUser)에는 팀을 나간 뒤에도 "그때 일한 팀 일정"이 남지만(v18.7), 쓰기는 지금 소속일 때만.
     *   - 개인 일정: 주인 본인
     *   - 팀 일정: 지금 그 팀 팀원(팀장·부팀장 포함)
     */
    public function canContributeBy($user): bool
    {
        if ($this->team_id) {
            return $user->isMemberOf((int) $this->team_id);
        }
        return (int) $this->owner_id === (int) $user->id;
    }

    /**
     * ★ v18.67 보안 — 이 일정으로 사진·보고서를 어디까지 볼 수 있나(Site::viewCutoffFor 참고).
     *   현장이 있으면 현장 기준, 없으면 일정 기준(팀을 나갔으면 나간 때까지).
     */
    public function viewCutoffFor($user): \Illuminate\Support\Carbon|false|null
    {
        $site = $this->site_id ? Site::withTrashed()->find($this->site_id) : null;
        if ($site) {
            return $site->viewCutoffFor($user, $this);
        }
        if ($this->canContributeBy($user)) {
            return null;
        }
        return $this->team_id ? Site::leftTeamAt($user, (int) $this->team_id) : false;
    }

    /**
     * ★ v18.67 보안 — 팀 일정에는 다른 팀 현장을 붙일 수 없음(어느 경로로 저장되든 공통 안전장치).
     *   일정 API는 checkRefs가 422로 먼저 막지만, 견적 승인처럼 다른 경로로 만들어지는 일정이 있어서
     *   (예: A팀 팀장이면서 B팀 팀원인 사람이 B팀 현장으로 견적을 승인 → A팀 일정에 B팀 현장) 모델에서 한 번 더 확인.
     *   어긋나면 현장 연결만 비움(견적 승인은 원래도 볼 수 없는 현장이면 연결을 비우고 진행했음).
     */
    protected static function booted(): void
    {
        static::saving(function (Schedule $s) {
            if ($s->site_id && $s->team_id && ($s->isDirty('site_id') || $s->isDirty('team_id'))) {
                $siteTeamId = Site::withTrashed()->whereKey($s->site_id)->value('team_id');
                if ($siteTeamId && (int) $siteTeamId !== (int) $s->team_id) {
                    $s->site_id = null;
                }
            }
        });
    }
}
