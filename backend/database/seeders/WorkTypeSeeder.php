<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WorkTypeSeeder extends Seeder
{
    /**
     * work_types 기본 공정 데이터
     *
     * team_id = NULL → 시스템 공통 공정 (모든 사용자가 사용 가능)
     * 사용자가 커스텀 공정 추가 시 team_id를 채워서 저장
     *
     * 색상 기준: Material Design 색상 팔레트
     * 대비가 뚜렷해서 캘린더에서 식별 용이
     */
    public function run(): void
    {
        $now = Carbon::now();

        // ⭐ 중복 방지: 이미 데이터가 있으면 스킵
        // (개발 중 여러 번 실행해도 중복 데이터가 안 쌓이도록)
        if (DB::table('work_types')->count() > 0) {
            $this->command->info('work_types 테이블에 이미 데이터가 있어 스킵합니다.');
            return;
        }

        $workTypes = [
            // ─── 내장·마감 공정 (가장 많이 사용) ───
            [
                'name'       => '도배',
                'code'       => 'wallpaper',
                'color'      => '#FF5722',   // Deep Orange
                'icon'       => 'wallpaper',
                'sort_order' => 1,
            ],
            [
                'name'       => '타일',
                'code'       => 'tile',
                'color'      => '#2196F3',   // Blue
                'icon'       => 'grid',
                'sort_order' => 2,
            ],
            [
                'name'       => '필름',
                'code'       => 'film',
                'color'      => '#4CAF50',   // Green
                'icon'       => 'layers',
                'sort_order' => 3,
            ],
            [
                'name'       => '페인트',
                'code'       => 'paint',
                'color'      => '#9C27B0',   // Purple
                'icon'       => 'brush',
                'sort_order' => 4,
            ],
            [
                'name'       => '마루',
                'code'       => 'flooring',
                'color'      => '#795548',   // Brown
                'icon'       => 'view-day',
                'sort_order' => 5,
            ],

            // ─── 설치 공정 ───
            [
                'name'       => '샷시',
                'code'       => 'window',
                'color'      => '#00BCD4',   // Cyan
                'icon'       => 'border-all',
                'sort_order' => 6,
            ],
            [
                'name'       => '전기',
                'code'       => 'electric',
                'color'      => '#FFC107',   // Amber
                'icon'       => 'bolt',
                'sort_order' => 7,
            ],
            [
                'name'       => '설비',
                'code'       => 'plumbing',
                'color'      => '#607D8B',   // Blue Grey
                'icon'       => 'water',
                'sort_order' => 8,
            ],

            // ─── 구조 공정 ───
            [
                'name'       => '목공',
                'code'       => 'carpentry',
                'color'      => '#8D6E63',   // Brown
                'icon'       => 'construction',
                'sort_order' => 9,
            ],
            [
                'name'       => '철거',
                'code'       => 'demolition',
                'color'      => '#F44336',   // Red
                'icon'       => 'delete-forever',
                'sort_order' => 10,
            ],

            // ─── 마무리 공정 ───
            [
                'name'       => '청소',
                'code'       => 'cleaning',
                'color'      => '#03A9F4',   // Light Blue
                'icon'       => 'cleaning-services',
                'sort_order' => 11,
            ],
            [
                'name'       => '기타',
                'code'       => 'other',
                'color'      => '#9E9E9E',   // Grey
                'icon'       => 'more-horiz',
                'sort_order' => 99,         // 항상 맨 뒤
            ],
        ];

        // 공통 컬럼(team_id, is_active, timestamps) 일괄 부여
        $data = array_map(function ($item) use ($now) {
            return array_merge($item, [
                'team_id'    => null,    // 시스템 공통 공정
                'is_active'  => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, $workTypes);

        // 일괄 INSERT (개별 INSERT보다 빠름)
        DB::table('work_types')->insert($data);

        $this->command->info(count($data) . '개의 기본 공정이 등록되었습니다.');
    }
}
