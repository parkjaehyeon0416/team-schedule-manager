<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 디자인 캔버스(SCHEDULE_DETAIL/CREATE/EDIT/DAY) 기준 추가.
 * title — 지금까지는 memo를 제목처럼 써왔는데 디자인은 "제목"과 "메모"를 분리된 입력으로 둠.
 * start_time/end_time — SCHEDULE_DAY가 시간순 정렬·표시를 전제로 하고, SCHEDULE_DETAIL도
 *   "09:00 - 17:00 (8시간)"을 보여주는데 날짜(date)만으로는 표현 불가능해서 추가.
 * reminder_time — 일정 등록/수정 화면의 "알림" 필드(일정별로 다르게 설정 가능).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->string('title', 100)->nullable()->after('date');
            $table->time('start_time')->nullable()->after('title');
            $table->time('end_time')->nullable()->after('start_time');
            $table->string('reminder_time', 30)->nullable()->after('memo');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['title', 'start_time', 'end_time', 'reminder_time']);
        });
    }
};
