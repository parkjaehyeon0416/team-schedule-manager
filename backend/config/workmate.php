<?php

// ★ v18.43 — 웹 페이지(초대 링크·공지 바로가기)에 쓰는 앱 설치 주소.
//   스토어에 올리기 전에는 비워두면 Android는 서버의 최신 APK(/download/latest)로, iPhone 버튼은 숨김.
return [
    'app_store_url'  => env('APP_STORE_URL'),
    'play_store_url' => env('PLAY_STORE_URL'),
    // ★ v18.48 — 앱 소개 페이지 하단 사업자 정보("상호 · 대표 · 사업자등록번호 · 연락처"). 사업자 등록 전엔 비워 둠(숨김)
    'company_info'   => env('COMPANY_INFO'),
    // ★ v18.68 — 계정 삭제 안내 페이지(/account-delete, 구글 플레이 필수)에 보이는 개발자 이름·문의 메일.
    //   플레이 콘솔 스토어 등록정보의 개발자 이름과 같아야 함(다르면 .env DEVELOPER_NAME으로 맞춤)
    'developer_name' => env('DEVELOPER_NAME', '박재현'),
    'support_email'  => env('SUPPORT_EMAIL', 'workmatekr@gmail.com'),
];
