<?php

namespace App\Support;

/**
 * ★ v18.63 — 로그인 유지 기간(마지막으로 쓴 때부터). 쓸 때마다 연장.
 *   앱: 30일 — 메신저·쇼핑 앱처럼 쓰는 동안은 계속 로그인, 한 달 안 쓰면 다시 로그인.
 *   운영자 웹: 12시간 — 관리자 권한이라 짧게.
 */
class LoginSession
{
    public const APP_IDLE_DAYS = 30;
    public const OPERATOR_IDLE_HOURS = 12;
}
