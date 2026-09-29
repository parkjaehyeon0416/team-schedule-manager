<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ★ v18.23 — 팀원끼리 서로 연락할 수 있도록 프로필 커스터마이징 필드 추가.
     *   kakao_talk_id는 소셜 로그인의 kakao_id(OAuth 고유번호)와 다른 필드 —
     *   여기 저장하는 건 사람이 직접 입력하는 "연락용 카카오톡 아이디"임.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_color', 7)->default('#1F3864')->after('phone');
            $table->string('avatar_image_path')->nullable()->after('avatar_color');
            $table->string('kakao_talk_id')->nullable()->after('avatar_image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_color', 'avatar_image_path', 'kakao_talk_id']);
        });
    }
};
