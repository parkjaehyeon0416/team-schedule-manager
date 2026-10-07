<?php

// ★ v18.43 — 웹 페이지(초대 링크·공지 바로가기)에 쓰는 앱 설치 주소.
//   스토어에 올리기 전에는 비워두면 Android는 서버의 최신 APK(/download/latest)로, iPhone 버튼은 숨김.
return [
    'app_store_url'  => env('APP_STORE_URL'),
    'play_store_url' => env('PLAY_STORE_URL'),
    // ★ v18.48 — 앱 소개 페이지 하단 사업자 정보("상호 · 대표 · 사업자등록번호 · 연락처"). 사업자 등록 전엔 비워 둠(숨김)
    'company_info'   => env('COMPANY_INFO'),
];
