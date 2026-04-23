<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * user_type ENUM에 'operator' 추가
     *
     * 기획 배경:
     *  - 웹 관리자 페이지(localhost:3000)는 "앱 운영자(개발자)" 전용
     *  - 일반 사용자(도배 기사 등)는 모바일 앱만 사용
     *  - 따라서 user_type으로 접근 가능한 플랫폼을 구분
     *
     * user_type 정책:
     *  - 'operator'   : 웹 관리자만 접속 가능 (앱 운영자)
     *  - 'team'       : 모바일 앱 사용자 (팀 소속)
     *  - 'freelancer' : 모바일 앱 사용자 (프리랜서, 개인)
     *
     * ★ ENUM 변경은 일반 Blueprint로는 불가능하므로 DB::statement로 직접 ALTER
     *   (Laravel의 enum() 메서드는 ENUM 값 '추가' 변경을 지원하지 않음)
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN user_type
            ENUM('operator', 'team', 'freelancer')
            NOT NULL DEFAULT 'team'
        ");
    }

    public function down(): void
    {
        // 롤백 시: 먼저 'operator' 값을 가진 유저의 값을 'team'으로 되돌림
        // (ENUM 축소 시 데이터 손실 방지)
        DB::statement("
            UPDATE users SET user_type = 'team'
            WHERE user_type = 'operator'
        ");

        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN user_type
            ENUM('team', 'freelancer')
            NOT NULL DEFAULT 'team'
        ");
    }
};
