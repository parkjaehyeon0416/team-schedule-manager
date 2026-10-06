<?php

// ★ v18.43 — 웹 페이지(초대 링크·공지 바로가기)에 쓰는 앱 설치 주소.
//   스토어에 올리기 전에는 비워두면 Android는 서버의 최신 APK(/download/latest)로, iPhone 버튼은 숨김.
return [
    'app_store_url'  => env('APP_STORE_URL'),
    'play_store_url' => env('PLAY_STORE_URL'),
];
