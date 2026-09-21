<?php

namespace App\Constants;

/**
 * 전역 에러 코드 상수 정의
 *
 * 사용법:
 *   'error_code' => ErrorCode::WAGE_NOT_FOUND
 *
 * 오류코드 정의서 v1.0 / v1.1 과 동기화 유지
 */
class ErrorCode
{
    // ═══════════════════════════════════════════════
    // 인증 관련 (v6 / v9.1)
    // ═══════════════════════════════════════════════
    public const AUTH_LOGIN_FAILED       = 'ERR_AUTH_001';
    public const AUTH_NO_PERMISSION      = 'ERR_AUTH_002';
    public const AUTH_TOKEN_INVALID      = 'ERR_AUTH_003';
    public const AUTH_WEB_ONLY           = 'ERR_AUTH_007';   // v9.1
    public const AUTH_MOBILE_ONLY        = 'ERR_AUTH_008';   // v9.1
    public const AUTH_ACCOUNT_NOT_FOUND  = 'ERR_AUTH_009';   // v18.5 — 아이디 찾기: 이름+전화번호 불일치
    public const AUTH_RESET_CODE_INVALID = 'ERR_AUTH_010';   // v18.5 — 비밀번호 재설정: 인증코드 불일치/만료

    // ═══════════════════════════════════════════════
    // 입력 검증 (v6)
    // ═══════════════════════════════════════════════
    public const VALID_GENERAL           = 'ERR_VALID_001';
    public const VALID_EMAIL_DUPLICATE   = 'ERR_VALID_002';
    public const VALID_DATE_FORMAT       = 'ERR_VALID_003';
    public const VALID_REQUIRED          = 'ERR_VALID_004';

    // ═══════════════════════════════════════════════
    // 스케줄 (v7)
    // ═══════════════════════════════════════════════
    public const SCHEDULE_NOT_FOUND      = 'ERR_SCHEDULE_001';
    public const SCHEDULE_DUPLICATE      = 'ERR_SCHEDULE_002';

    // ═══════════════════════════════════════════════
    // 현장 / 파일 / 근태 / 팀 (v7)
    // ═══════════════════════════════════════════════
    public const SITE_NOT_FOUND          = 'ERR_SITE_001';
    public const FILE_TYPE_INVALID       = 'ERR_FILE_001';
    public const ATTEND_ALREADY_IN       = 'ERR_ATTEND_001';
    public const ATTEND_NO_CHECK_IN      = 'ERR_ATTEND_002';
    public const ATTEND_ALREADY_OUT      = 'ERR_ATTEND_003';
    public const TEAM_NOT_FOUND          = 'ERR_TEAM_001';
    public const TEAM_ALREADY_JOINED     = 'ERR_TEAM_002';

    // ═══════════════════════════════════════════════
    // ★ v10.1 공수·급여 자동 계산 ★
    // ═══════════════════════════════════════════════
    public const WAGE_NOT_FOUND          = 'ERR_WAGE_001';
    public const WAGE_DUPLICATE          = 'ERR_WAGE_002';
    public const WAGE_NEGATIVE           = 'ERR_WAGE_003';
    public const SUMMARY_INVALID_PERIOD  = 'ERR_SUMMARY_001';
    public const SUMMARY_CALC_FAILED     = 'ERR_SUMMARY_002';
    public const WORKTYPE_NOT_FOUND      = 'ERR_WORKTYPE_001';

    // ═══════════════════════════════════════════════
    // 서버 일반
    // ═══════════════════════════════════════════════
    public const SERVER_ERROR            = 'ERR_SERVER_001';

    // ═══════════════════════════════════════════════
    // ★ v11 현장 사진 ★
    // ═══════════════════════════════════════════════
    public const PHOTO_NOT_FOUND         = 'ERR_PHOTO_001';
    public const PHOTO_NO_SITE_LINKED    = 'ERR_PHOTO_002';
    // ★ v11.1 페어 매칭
    public const PHOTO_PAIR_INVALID         = 'ERR_PHOTO_003'; // 시공 전 사진에서 paired 지정
    public const PHOTO_PAIR_TARGET_NOT_FOUND = 'ERR_PHOTO_004'; // 짝 시공 전 사진 없음
    public const PHOTO_PAIR_DUPLICATE       = 'ERR_PHOTO_005'; // 이미 다른 짝이 지정됨

    // ═══════════════════════════════════════════════
    // ★ v12 자동 보고서 (PDF) ★
    // ═══════════════════════════════════════════════
    public const REPORT_NOT_FOUND        = 'ERR_REPORT_001';
    public const REPORT_NO_SITE_LINKED   = 'ERR_REPORT_002'; // 현장이 연결되지 않은 일정은 보고서 생성 불가
    public const REPORT_PDF_FAILED       = 'ERR_REPORT_003'; // PDF 생성 실패

    // ═══════════════════════════════════════════════
    // ★ v14 모바일 명함 ★
    // ═══════════════════════════════════════════════
    public const CARD_NOT_FOUND       = 'ERR_CARD_001';
    public const CARD_ALREADY_EXISTS  = 'ERR_CARD_002'; // 사용자당 1개 제한
    public const CARD_PRIVATE         = 'ERR_CARD_003'; // is_public=false인 명함 공개 접근 시도

    // ═══════════════════════════════════════════════
    // ★ v12~v13 견적서 ★
    // ═══════════════════════════════════════════════
    public const QUOTE_NOT_FOUND         = 'ERR_QUOTE_001';
    public const QUOTE_ALREADY_APPROVED  = 'ERR_QUOTE_002'; // 이미 승인된 견적을 다시 승인 시도
    public const QUOTE_MISSING_DATE      = 'ERR_QUOTE_003'; // 승인하려는데 희망 시공일 없음
    public const QUOTE_PDF_FAILED        = 'ERR_QUOTE_004';
    public const MATERIAL_NOT_FOUND      = 'ERR_MATERIAL_001';
}
