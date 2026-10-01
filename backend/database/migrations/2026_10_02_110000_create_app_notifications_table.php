<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 테이블명은 Laravel 기본 DatabaseNotification(Notifiable 트레이트)이 기대하는
        // `notifications` 스키마와 겹치지 않도록 의도적으로 `app_notifications`로 분리함.
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 20); // schedule | team | quote | tax
            $table->string('title', 100);
            $table->string('body', 255);
            $table->string('link_type', 30)->nullable(); // schedule | team | quote | tax_month
            $table->unsignedBigInteger('link_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
