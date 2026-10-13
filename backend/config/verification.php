<?php

/*
|--------------------------------------------------------------------------
| ★ v18.67 — 인증번호(문자·이메일) 발송 제한 (App\Services\SmsGuard)
|--------------------------------------------------------------------------
| 아이디 찾기·비밀번호 재설정·본인 확인(탈퇴·비밀번호 설정·번호 변경)·새 번호 인증 문자를
| 보내기 전에 모두 여기 값으로 막음. 문자 폭탄·문자 요금 소진·Gmail 하루 한도(500통) 소진 방지.
| 숫자를 바꾼 뒤 실서버에서는 `php artisan config:cache` 다시 실행.
*/

return [
    // 같은 대상(번호·이메일)+같은 용도로 다시 받기까지 기다리는 시간(초)
    'resend_seconds' => (int) env('VERIFY_RESEND_SECONDS', 60),

    // 대상+용도별 하루 발송 수 (예: 한 번호로 하루 아이디 찾기 문자 5통)
    'per_target_purpose_daily' => (int) env('VERIFY_PER_TARGET_PURPOSE_DAILY', 5),

    // 대상별 하루 발송 수(모든 용도 합산) — 한 번호로 가는 인증 문자 총량
    'per_target_daily' => (int) env('VERIFY_PER_TARGET_DAILY', 10),

    // 로그인한 계정별 하루 발송 수(모든 용도 합산)
    'per_user_daily' => (int) env('VERIFY_PER_USER_DAILY', 10),

    // IP별 하루 요청 수(발송 요청 기준, 모든 용도 합산)
    'per_ip_daily' => (int) env('VERIFY_PER_IP_DAILY', 20),

    // 서비스 전체 하루 발송 상한 — 넘으면 429 + 경고 로그
    'global_sms_daily'   => (int) env('VERIFY_GLOBAL_SMS_DAILY', 500),
    'global_email_daily' => (int) env('VERIFY_GLOBAL_EMAIL_DAILY', 400), // Gmail SMTP 하루 500통보다 낮게

    // 용도별 서비스 전체 하루 상한 — 아무 번호로나 보낼 수 있는 새 번호 인증이
    // 전체 상한을 다 써 버려서 아이디·비밀번호 찾기 문자까지 막히는 일이 없게 따로 묶음
    'global_purpose_daily' => [
        'new_phone' => (int) env('VERIFY_GLOBAL_NEW_PHONE_DAILY', 200),
    ],

    // 서비스 전체 사용량이 이 비율을 넘으면 하루 한 번 경고 로그
    'warn_ratio' => 0.8,
];
