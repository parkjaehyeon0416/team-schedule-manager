<?php

// ★ v18.69 — 앱 업데이트 안내·강제(관리 화면은 아직 없음 → 서버 .env에서 바꾸고 php artisan config:cache).
//   비교는 마케팅 버전(MAJOR.MINOR.PATCH, Android versionName / iOS CFBundleShortVersionString)으로, 두 플랫폼 같은 번호.
//   - min    : 이보다 낮은 앱은 API가 426(ERR_APP_001)으로 막힘 → 앱은 강제 업데이트 화면. 헤더 없는 옛 앱(≤v18.68)은 안 막음
//   - latest : 이보다 낮으면 GET /api/app/version이 update='optional'(선택 업데이트 안내)
//   기본값은 둘 다 1.0.0 — 올리기 전까지는 아무도 안 막음. 비교·잘못된 값 처리는 App\Support\AppVersion
return [
    'platforms' => [
        'android' => [
            'min'       => env('APP_MIN_VERSION_ANDROID', '1.0.0'),
            'latest'    => env('APP_LATEST_VERSION_ANDROID', '1.0.0'),
            // ★ v18.69 — 비어 있으면 초대 페이지용 PLAY_STORE_URL(config/workmate.php) → 기본 플레이 주소 순으로 씀
            //   (env()는 "APP_STORE_URL_ANDROID=" 처럼 빈 값이면 기본값 대신 ''를 주므로 ?:로 넘김)
            'store_url' => env('APP_STORE_URL_ANDROID') ?: env('PLAY_STORE_URL') ?: 'https://play.google.com/store/apps/details?id=com.workmatekr.app',
        ],
        'ios' => [
            'min'       => env('APP_MIN_VERSION_IOS', '1.0.0'),
            'latest'    => env('APP_LATEST_VERSION_IOS', '1.0.0'),
            // 비어 있으면 초대 페이지용 APP_STORE_URL을 씀. 앱스토어 등록 전까지 둘 다 비움(null로 응답)
            'store_url' => env('APP_STORE_URL_IOS') ?: env('APP_STORE_URL', ''),
        ],
    ],

    // 업데이트 안내 창에 보여 줄 짧은 문구(선택). 비우면 "이번 업데이트"·"바뀐 점" 칸이 안 보임
    // ★ v18.69 — 여러 줄은 "|"로 구분(줄바꿈·글자 그대로의 \n 도 됨), 줄마다 앞뒤 공백·빈 줄은 빼고 최대 5줄
    //   예: APP_UPDATE_MESSAGE="회원가입 휴대폰 인증이 추가됐어요|자잘한 오류를 고쳤어요"
    //   API는 notes(줄 목록) + message(줄들을 "\n"으로 이은 글)로 줌. 앱은 강제 화면에 2줄, 선택 안내 창에 3줄까지 보여 줌
    //   나누기·정리는 App\Support\AppVersion::notes() — config:cache 뒤에도 원문 그대로 두고 응답할 때 나눔
    'message' => env('APP_UPDATE_MESSAGE'),

    // 스토어 밖에서 APK로 설치한 Android 사용자용 최신 설치 파일(routes/web.php /download/latest)
    'apk_url' => env('APP_APK_URL', 'https://workmatekr.com/download/latest'),
];
