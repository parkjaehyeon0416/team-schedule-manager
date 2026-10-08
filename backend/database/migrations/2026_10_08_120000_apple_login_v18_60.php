<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ★ v18.60 — Apple로 로그인(앱스토어 심사 4.8: 소셜 로그인 앱은 Apple 로그인도 제공해야 함)
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('apple_id')->nullable()->unique()->after('kakao_linked_at');
            $table->timestamp('apple_linked_at')->nullable()->after('apple_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['apple_id']);
            $table->dropColumn(['apple_id', 'apple_linked_at']);
        });
    }
};
