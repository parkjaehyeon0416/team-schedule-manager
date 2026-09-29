<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * ★ v18.21 — 여러 팀 동시 소속 지원.
     *   users.team_id는 "지금 활동 중인(활성) 팀" 하나만 가리키는 단일 컬럼이라
     *   원래는 팀을 두 개 이상 가질 수 없었음. team_members를 따로 두고,
     *   users.team_id는 하위호환을 위해 "활성 팀" 포인터로만 계속 씀
     *   (기존 스케줄/현장/단가설정 등 team_id 기준 로직을 안 건드리기 위함).
     */
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('role_id')->default(3); // 이 팀 안에서의 역할(2=manager, 3=member)
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes(); // 탈퇴해도 이력은 남겨서 과거 소속 조회에 사용
            $table->unique(['team_id', 'user_id']);
        });

        // 기존에 이미 team_id가 있던 사용자들을 team_members로 백필
        DB::table('users')
            ->whereNotNull('team_id')
            ->whereNull('deleted_at')
            ->select('id', 'team_id', 'role_id')
            ->orderBy('id')
            ->get()
            ->each(function ($user) {
                DB::table('team_members')->insert([
                    'team_id'    => $user->team_id,
                    'user_id'    => $user->id,
                    'role_id'    => $user->role_id,
                    'joined_at'  => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
