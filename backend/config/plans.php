<?php

/**
 * ★ v18.47 — 요금제 (2026-10-07 사용자 확정: 개인 프로 / 팀 / 팀+프로 묶음, 팀원은 항상 무료)
 *   출시 기념으로 launch_free_until 전까지는 모든 기능을 무료로 연다(제한 검사는 들어가 있지만 통과).
 *   결제(앱스토어 구독)는 2027년 1월 사업자 등록 후 연결 예정.
 */
return [
    'launch_free_until' => env('PLAN_LAUNCH_FREE_UNTIL', '2027-01-01'),

    'plans' => [
        'free'     => ['name' => '무료',      'monthly' => 0,     'yearly' => 0],
        'pro'      => ['name' => '개인 프로', 'monthly' => 4900,  'yearly' => 49000],
        'team'     => ['name' => '팀',        'monthly' => 14900, 'yearly' => 149000],
        'team_pro' => ['name' => '팀 + 프로', 'monthly' => 17900, 'yearly' => 179000],
    ],

    // 기능 → 그 기능을 주는 요금제
    'features' => [
        // 개인 프로: 내 일로 돈 벌기(고객에게 보내는 결과물·장부)
        'quote_unlimited'  => ['pro', 'team_pro'],
        'quote_branding'   => ['pro', 'team_pro'], // 견적서 하단 "WorkMate로 작성" 문구 제거
        'report_unlimited' => ['pro', 'team_pro'],
        'tax_export'       => ['pro', 'team_pro'],
        'photo_unlimited'  => ['pro', 'team', 'team_pro'],
        // 팀: 사람 굴리기 — 팀을 만든 팀장의 요금제로 판단
        'team_unlimited_members' => ['team', 'team_pro'],
        'team_attendance'        => ['team', 'team_pro'],
        'team_settlement'        => ['team', 'team_pro'],
        'team_album'             => ['team', 'team_pro'],
        'team_sub_leader'        => ['team', 'team_pro'],
        'team_notice'            => ['team', 'team_pro'],
        'multi_team_lead'        => ['team', 'team_pro'],
    ],

    // 무료일 때 한도
    'free_limits' => [
        'quotes_per_month'  => 3,
        'reports_per_month' => 2,
        'photos_per_site'   => 20,
        'team_members'      => 3,
        'led_teams'         => 1,
    ],
];
