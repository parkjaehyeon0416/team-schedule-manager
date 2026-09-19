*Team Schedule Manager  |  개발 매뉴얼 v13 (자동 보고서 2단계 — 공유 URL + 열람 추적)*

**Team Schedule Manager**

**개발 매뉴얼 v13**

**자동 보고서 공유 URL + 열람 추적**

*기획서 v2.3 로드맵 2순위 완성분 — v12 매뉴얼 8장 예고분 실현*

작성일: 2026-09-19

대상 OS: Windows 10/11

*기준: v12(자동 보고서 1단계) 완료*

| **★ v13 핵심 안내** **• v9.0에서 만들어만 두고 안 쓰던 `share_token`/`view_count`/`last_viewed_at` 컬럼을 드디어 실제로 사용합니다.** **• 고객은 로그인 없이 URL 하나로 PDF를 바로 브라우저에서 열람할 수 있습니다(다운로드가 아니라 인라인 표시).** **• 진행 중 이 프로젝트의 **전역 예외 처리기 자체의 버그**를 발견했습니다 — 8장 참조. 앞으로 컨트롤러를 작성할 때 반드시 알아야 할 내용입니다.** |
| --- |

# **0. 전체 매뉴얼 시리즈 (갱신)**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v1~v12 | (이전 매뉴얼 참조, 생략) | ✅ 완료 |
| **v13 ◀** | **자동 보고서 공유 URL + 열람 추적** | **▶ 현재** |
| v14 | 게스트 참여 + 달력 이력 자동 기록 | ⏳ 예정 |

# **1. 구현 내용**

## **1.1 공개 라우트**

`backend/routes/api.php`의 `auth:sanctum` 미들웨어 밖(공개 라우트 섹션)에 추가:

| Route::get('/report/{token}', [SiteReportController::class, 'publicView']); |
| --- |

실제 접근 URL은 `{APP_URL}/api/report/{share_token}` 형태입니다(이 프로젝트의 `routes/api.php`는 `bootstrap/app.php`에서 `apiPrefix: 'api'`로 등록되어 있어 `/api`가 자동으로 붙습니다).

## **1.2 SiteReportController::publicView()**

- `share_token`으로 보고서를 조회 (인증 없음 — 토큰 자체가 접근 키).
- 없거나 PDF 파일이 실제로 존재하지 않으면 404.
- 있으면 `view_count`를 1 증가시키고 `last_viewed_at`을 현재 시각으로 갱신.
- `response()->file()`로 `Content-Disposition: inline`을 지정해 반환 — 다운로드 대신 브라우저가 PDF를 바로 렌더링하게 함(고객이 클릭 한 번으로 바로 볼 수 있도록).

## **1.3 프론트엔드**

- `frontend/src/api/report.ts`에 `getPublicReportUrl(shareToken)` 추가 — `{axios baseURL}/api/report/{token}` 조합.
- `Schedule.tsx`의 보고서 목록에 "공유 링크 복사" 버튼 추가 — `navigator.clipboard.writeText()`로 링크를 복사하고, 실패 시(비보안 컨텍스트 등) `message.info()`로 링크를 직접 노출.
- 보고서 목록 항목에 `열람 N회 · 마지막 열람 YYYY-MM-DD HH:mm`을 표시해 팀장이 고객이 봤는지 확인할 수 있게 함.

# **2. 테스트 결과 (2026-09-19 수행)**

| **#** | **시나리오** | **결과** |
| --- | --- | --- |
| 1 | curl로 인증 헤더 없이 `GET /api/report/{token}` 호출 | 200, `Content-Disposition: inline`, 유효한 PDF 바이너리 |
| 2 | 같은 링크를 두 번 호출 | 인증된 `GET /api/reports/{id}`로 확인 시 `view_count`가 2로 증가, `last_viewed_at` 갱신 확인 |
| 3 | 존재하지 않는 토큰으로 호출 | (최초 시도 시 500 버그 발견 → 수정 후) 404 정상 반환 — 8장 참조 |

# **3. 알려진 제한 사항**

- **만료 개념 없음**: 공유 링크는 보고서를 삭제하지 않는 한 영구적으로 유효합니다. 링크 만료 기한이나 재발급 기능은 없습니다.
- **접근 제한 없음**: 토큰 문자열(64자 랜덤)을 아는 사람은 누구나 볼 수 있습니다 — 비밀번호 보호나 IP 제한은 없습니다(기획 의도상 "URL만 알면 열람 가능"이 맞음).
- **열람 추적은 단순 카운터뿐**: 언제/몇 번 봤는지는 기록하지만, 누가(어느 IP/기기) 봤는지는 기록하지 않습니다.
- **모바일 공유 없음**: 앱에서 공유 링크를 카카오톡 등으로 바로 보내는 기능(로드맵 v12 3순위)은 여전히 미구현.

# **4. 발생한 시행착오 — 전역 예외 처리기가 모든 에러를 500으로 뭉갬 (중요, 재발 방지용)**

증상: `publicView()`에서 존재하지 않는 토큰에 대해 `abort(404, '...')`를 호출했는데, 실제 응답은 **500 + `ERR_SERVER_001`**로 나왔습니다.

원인: `backend/bootstrap/app.php`의 `withExceptions()`에 다음 코드가 있습니다.

| \$exceptions->render(function (\Throwable \$e, \$request) {     if (\$request->is('api/*')) {         return response()->json([             'success' => false,             'message' => \$e->getMessage() ?: '서버 오류가 발생했습니다.',             'error_code' => 'ERR_SERVER_001',         ], 500);     } }); |
| --- |

이 핸들러는 `\Throwable`(모든 예외의 최상위 타입)을 잡아서 **원래 예외의 HTTP 상태 코드를 무시하고 무조건 500**을 반환합니다. `abort(404)`, `abort(403)`, 심지어 라우트 모델 바인딩 실패(`ModelNotFoundException`, 원래 404)까지도 전부 500으로 나갑니다.

**왜 지금까지 안 드러났나**: 기존 컨트롤러들은 전부 `abort()`나 `findOrFail()`을 쓰지 않고, `if (!$model) return ApiResponse::error(..., 404);` 패턴으로 **예외를 던지지 않고 직접 응답을 return**해왔습니다. 이 예외 핸들러 버그를 우회하는 셈이었지만, 아무도 의도적으로 그런 게 아니라 우연히 이 패턴을 계속 써온 것으로 보입니다. `publicView()`가 이 프로젝트에서 처음으로 `abort()`를 쓴 코드였고, 그래서 처음 걸린 것입니다.

**해결 (이번 코드에 적용)**: `abort(404, ...)` 대신 기존 컨트롤러들과 동일하게 `return ApiResponse::error(..., ErrorCode::REPORT_NOT_FOUND, 404);`로 직접 응답하도록 수정.

| **⚠️ 향후 컨트롤러 작성 시 반드시 지킬 규칙** **이 프로젝트에서는 `abort()`, `findOrFail()`, `firstOrFail()` 등 예외를 던지는 헬퍼를 컨트롤러에서 쓰지 말 것. 항상 `if (!$model) { return ApiResponse::error(...); }` 패턴으로 직접 응답을 반환해야 올바른 HTTP 상태 코드가 나갑니다. 근본 원인(`bootstrap/app.php`의 전역 예외 핸들러)을 고치는 게 정공법이지만, 그 핸들러를 건드리면 다른 모든 500 에러 응답 포맷에 영향을 주므로 이번 작업 범위에서는 손대지 않고 우회했습니다.** |
| --- |

**남은 과제**: `bootstrap/app.php`의 전역 예외 핸들러를 `HttpException`이면 `$e->getStatusCode()`를 쓰도록 고치는 근본 수정은 이번에 하지 않았습니다. 이 프로젝트 전체를 감사(audit)해서 `abort()`/`findOrFail()`을 쓰는 다른 곳이 있는지 확인하고, 있다면 같은 버그가 숨어있을 수 있습니다 — 별도 작업으로 분리 권장.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v13.0 | 2026-09-19 | SiteReportController::publicView() 신규(공유 링크 공개 열람 + view_count/last_viewed_at 갱신), 공개 라우트 추가, 웹 프론트엔드 공유 링크 복사 버튼 + 열람 횟수 표시. 전역 예외 핸들러가 모든 Throwable을 500으로 뭉개는 기존 버그를 발견(우회 처리, 근본 수정은 별도 과제로 남김) |

*— v13 매뉴얼 — 자동 보고서 2단계 완료 —*

*다음: v14 — 게스트 참여 + 달력 이력 자동 기록*

© 2026 Team Schedule Manager
