<?php

return [
    // 지금은 'log'만 존재 — 실제 SMS 서비스(다이렉트샌드 등) 연동 시
    // 'drivers'에 새 클래스를 추가하고 .env의 SMS_DRIVER만 바꾸면 됨.
    'driver' => env('SMS_DRIVER', 'log'),

    'drivers' => [
        'log' => \App\Services\Sms\LogSmsService::class,
    ],
];
