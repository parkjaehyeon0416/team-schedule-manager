<?php

return [
    // 실제 발송 전환: .env의 SMS_DRIVER를 'solapi'로 바꾸면 됨 (그 외 호출부는 수정 불필요).
    'driver' => env('SMS_DRIVER', 'log'),

    'drivers' => [
        'log'    => \App\Services\Sms\LogSmsService::class,
        'solapi' => \App\Services\Sms\SolapiSmsService::class,
    ],

    // ★ v18.43 — 광고성 문자 끝에 붙는 무료 수신거부 안내 (예: '무료거부 0808001234'). 비어 있으면 광고성 문자 발송을 막음.
    'ad_opt_out' => env('SMS_AD_OPT_OUT'),

    'solapi' => [
        'api_key'    => env('SOLAPI_API_KEY'),
        'api_secret' => env('SOLAPI_API_SECRET'),
        'sender'     => env('SOLAPI_SENDER'), // 사전등록 완료된 발신번호(숫자만, 예: 01012345678)
    ],
];
