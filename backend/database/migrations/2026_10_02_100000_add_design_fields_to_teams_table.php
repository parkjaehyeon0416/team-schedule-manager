<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('photo_path', 255)->nullable()->after('name');
            $table->text('description')->nullable()->after('photo_path');
            $table->string('specialty', 255)->nullable()->after('description'); // 콤마 구분 공정명 목록
            $table->string('activity_area', 100)->nullable()->after('specialty');
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['photo_path', 'description', 'specialty', 'activity_area']);
        });
    }
};
