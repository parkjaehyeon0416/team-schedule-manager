<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ★ v18.18 — 소셜 로그인(구글/카카오)
    // ★ v18.38 — 휴대폰 푸시(FCM) 서비스 계정 키 파일 경로. 파일이 없으면 푸시만 건너뜀.
    'firebase' => [
        'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase-credentials.json')),
    ],

    'google' => [
        // 앱에서 발급받은 OAuth 클라이언트 ID들을 쉼표로 나열(Android용 + Web용 둘 다 여기 넣으면
        // 모바일에서 어떤 클라이언트로 로그인해도 서버가 id_token의 aud를 검증할 수 있음)
        'client_ids' => array_filter(array_map('trim', explode(',', env('GOOGLE_CLIENT_IDS', '')))),
    ],

    // ★ v18.60 — Apple로 로그인: identity token의 aud(앱 번들 ID). 쉼표로 여러 개 가능
    // ★ v18.62 — 카카오 토큰이 우리 앱 것인지 확인(카카오 개발자 콘솔 › 앱 › 앱 ID). 비어 있으면 검사 생략
    'kakao' => [
        'app_id' => env('KAKAO_APP_ID'),
    ],

    'apple' => [
        'client_ids' => array_filter(array_map('trim', explode(',', env('APPLE_CLIENT_IDS', 'com.workmatekr.app')))),
    ],

];
