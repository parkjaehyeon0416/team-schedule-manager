*Team Schedule Manager  |  개발 매뉴얼 v12 (자동 보고서 생성 1단계 — PDF)*

**Team Schedule Manager**

**개발 매뉴얼 v12**

**자동 보고서 생성 1단계 (PDF)**

*기획서 v2.3 로드맵 2순위 — v11.0 매뉴얼 12장 예고분 실현*

작성일: 2026-09-19

대상 OS: Windows 10/11

*기준: v11.8(팀 기능) 완료 / DevManual v11.0 로드맵*

| **★ v12 핵심 안내** **• v11.0 매뉴얼이 예고한 대로, v11 사진 구조화 데이터(시공 전/중/후/기타 + 페어 매칭)를 재료로 PDF 시공 완료 보고서를 자동 생성합니다.** **• `site_reports` 테이블은 v9.0에서 이미 마이그레이션되어 있었으므로 DB 작업은 없었습니다.** **• 우선순위 1단계만 구현: 기본 템플릿 1종 PDF 생성 + 웹 대시보드 연동. 공유 URL·열람 추적(v13), 모바일 미리보기, 카카오톡 공유는 이번 범위 밖입니다.** **• 진행 중 두 가지 예상 밖 문제(한글 폰트 깨짐, CORS 미들웨어가 파일 다운로드 응답에서 에러)를 만났고 둘 다 해결했습니다 — 9장 참조.** |
| --- |

# **0. 전체 매뉴얼 시리즈 (갱신)**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v1~v11.8 | (이전 매뉴얼 참조, 생략) | ✅ 완료 |
| **v12 ◀** | **자동 보고서 생성 1단계 (PDF)** | **▶ 현재** |
| v13 | 자동 보고서 2단계 (공유 + 열람 추적) | ⏳ 예정 |
| v14 | 게스트 참여 + 달력 이력 자동 기록 | ⏳ 예정 |
| v15 | 출시 준비 + 안드로이드 빌드 | ⏳ 예정 |

# **1. 사전 점검**

- `site_reports` 테이블(v9.0, `2026_04_23_155532_create_site_reports_table` 마이그레이션): id, schedule_id, user_id, title, client_name, client_contact, greeting_message, template_id, share_token(unique), view_count, last_viewed_at, pdf_path, timestamps, softDeletes. **1단계에서는 share_token/view_count/last_viewed_at 컬럼을 만들어만 두고 실제로 공유·추적 로직에는 아직 사용하지 않습니다** (share_token은 파일명 충돌 방지용으로만 재사용).
- `App\Models\SiteReport`가 존재하지 않아 신규 작성.

# **2. 백엔드 구현**

## **2.1 DomPDF 설치**

| composer require barryvdh/laravel-dompdf |
| --- |

Laravel 패키지 자동 탐색(auto-discovery) 덕분에 별도 ServiceProvider 등록 없이 `Barryvdh\DomPDF\Facade\Pdf` 파사드를 바로 사용할 수 있습니다.

## **2.2 SiteReport 모델**

파일 위치: `backend/app/Models/SiteReport.php` (신규) — `Schedule`, `User`에 대한 `belongsTo` 관계 추가.

## **2.3 SiteReportController 신규**

파일 위치: `backend/app/Http/Controllers/Api/SiteReportController.php`

| **메서드** | **엔드포인트** | **동작** |
| --- | --- | --- |
| index | GET /api/schedules/{id}/reports | 일정별 보고서 목록 |
| store | POST /api/schedules/{id}/reports | 보고서 row 생성 → PDF 즉시 렌더링·저장 → pdf_path 갱신 |
| show | GET /api/reports/{id} | 메타데이터 조회 |
| download | GET /api/reports/{id}/download | `response()->download()`로 PDF 스트리밍 |
| destroy | DELETE /api/reports/{id} | PDF 파일 + row soft delete |

`store()`는 현장이 연결되지 않은 일정(`site_id === null`)이면 `ERR_REPORT_002`로 차단합니다. PDF 렌더링 실패 시 방금 만든 `SiteReport` row를 롤백(delete)하고 `ERR_REPORT_003`을 반환합니다.

**사진 페어링 로직 재사용**: `PhotoController`가 v11.1에서 만든 `paired_with_id`(시공 후 사진 → 시공 전 사진 참조)를 그대로 활용해, `after` 카테고리 중 `paired_with_id`가 있는 사진만 골라 "시공 전·후 비교" 섹션에 나란히 배치합니다.

## **2.4 Blade 템플릿**

파일 위치: `backend/resources/views/reports/basic.blade.php` (신규)

구성: 표지(제목) → 고객/현장/작업 정보 표 → 인사말 박스 → 시공 전·후 비교 페어 → 카테고리별 사진 그리드(전/중/후/기타) → 푸터.

## **2.5 라우트**

`backend/routes/api.php`에 member+ 권한으로 5개 라우트 추가(작업자 본인도 보고서를 만들 수 있도록 photo 라우트와 동일한 권한 정책 적용).

# **3. SiteFile 모델 확장 — absolute_path 접근자**

DomPDF는 `<img src="http://...">` 같은 원격 URL을 기본적으로 불러오지 못합니다(보안 설정상 원격 로딩이 꺼져 있음). `SiteFile`에 접근자를 추가해 서버 로컬 파일시스템 경로를 직접 넘겨줍니다.

| public function getAbsolutePathAttribute(): ?string {     if (!\$this->file_path) return null;     return Storage::disk('public')->path(\$this->file_path); } |
| --- |

Blade에서는 `<img src="{{ $photo->absolute_path }}">` 로 사용합니다.

# **4. 웹 프론트엔드 구현**

- `frontend/src/api/report.ts` (신규): `getReports`, `createReport`, `deleteReport`, `downloadReport`.
  - **`downloadReport`가 `<a href>` 직접 링크가 아닌 이유**: 다운로드 API는 `Authorization: Bearer` 토큰이 필요한데, `<a href="...">`로는 커스텀 헤더를 붙일 수 없습니다. 대신 axios로 `responseType: 'blob'`을 받아 `URL.createObjectURL`로 임시 URL을 만들고, 숨겨진 `<a>` 태그를 코드로 클릭시켜 다운로드를 트리거합니다.
- `frontend/src/pages/Schedule.tsx` 확장: FullCalendar에 `eventClick` 핸들러 추가 → 일정 상세 모달을 열어 (1) 보고서 생성 폼(제목/고객명/연락처/인사말), (2) 생성된 보고서 목록(다운로드·삭제 버튼)을 보여줌. 현장이 연결되지 않은 일정은 생성 버튼이 비활성화되고 안내 문구가 표시됩니다.

# **5. 테스트 결과 (2026-09-19 수행)**

Laravel(MySQL) + 웹 프론트엔드를 실제로 띄우고 다음을 검증했습니다.

| **#** | **시나리오** | **결과** |
| --- | --- | --- |
| 1 | 현장 등록 → 일정 등록(현장 연결) → 시공 전/후 사진 업로드(페어 매칭) | 정상 |
| 2 | curl로 POST .../reports 호출 | 201 Created, 3페이지 PDF 즉시 생성 |
| 3 | GET .../reports/{id}/download | PDF 바이너리 정상 반환(`file` 명령으로 유효성 확인) |
| 4 | 웹 캘린더에서 일정 클릭 → 보고서 생성 폼 작성 → 생성 | 목록에 즉시 반영 |
| 5 | 웹에서 "다운로드" 버튼 클릭 | 네트워크 탭에서 200 확인, blob 다운로드 트리거 정상 |
| 6 | 현장 미연결 일정에서 생성 버튼 | 비활성화 + 안내 문구 정상 표시 |

테스트에 사용한 팀/현장/일정/사진/보고서는 전부 정리했습니다.

# **6. 최종 산출 PDF 구성**

1. 표지 — 보고서 제목
2. 표 — 고객명, 연락처, 현장(아파트/동/호/주소), 작업일, 공정, 면적, 공수
3. 인사말 박스 (선택 입력 시)
4. 시공 전·후 비교 섹션 (페어 매칭된 사진만, 좌우 배치)
5. 카테고리별 전체 사진 그리드 (시공 전 → 중 → 후 → 기타 순, 캡션 포함)
6. 푸터 — 생성 안내 문구 + 생성 시각

# **7. 발생한 시행착오**

## **7.1 한글이 전부 "?"로 깨짐**

증상: PDF는 정상 생성되지만 모든 한글 텍스트가 물음표로 표시됨. 영문/숫자는 정상.

원인: DomPDF에 내장된 기본 폰트(DejaVu 계열)에는 한글(Hangul) 글리프가 없음. CSS에 `font-family: 'nanumgothic'`을 지정해도 DomPDF가 그 이름의 폰트를 실제로 갖고 있지 않으면 무시하고 기본 폰트로 대체함.

해결: Windows에 기본 내장된 맑은 고딕(`malgun.ttf`, `malgunbd.ttf`)을 `backend/public/fonts/`에 복사해두고, Blade 템플릿에서 `@font-face`로 직접 등록:

| @font-face {   font-family: 'malgun';   src: url('{{ public_path('fonts/malgun.ttf') }}');   font-weight: normal; } @font-face {   font-family: 'malgun';   src: url('{{ public_path('fonts/malgunbd.ttf') }}');   font-weight: bold; } body { font-family: 'malgun', sans-serif; } |
| --- |

**중요**: `font-weight: bold`를 쓰는 요소(제목, 표 라벨 등)가 있다면 반드시 bold 웨이트용 `@font-face`도 별도로 등록해야 합니다. normal만 등록하면 bold 텍스트만 다시 깨집니다(실제로 이 함정에 걸렸다가 두 번째 시도에서 발견).

추가로, `backend/storage/fonts/` 디렉터리가 없으면 DomPDF가 폰트 메트릭 캐시 파일을 못 만들어 `fwrite(): Argument #1 ($stream) must be of type resource, false given` 오류가 남 — 디렉터리를 미리 만들어두고 `.gitkeep`으로 저장소에 포함시켰습니다.

| **⚠️ 프로덕션 배포 시 주의** **`malgun.ttf`는 Windows 전용 폰트입니다. Linux 서버에 배포할 계획이라면 나눔고딕 등 리눅스에서도 라이선스상 자유롭게 배포 가능한 한글 폰트로 교체해야 합니다.** |
| --- |

## **7.2 다운로드 API가 500 에러 — CORS 미들웨어와 BinaryFileResponse 충돌**

증상: `/api/reports/{id}/download` 호출 시 `Call to undefined method Symfony\Component\HttpFoundation\BinaryFileResponse::header()`.

원인: 기존 `App\Http\Middleware\CorsMiddleware`가 모든 응답에 `$response->header(...)`를 체이닝하는데, 이 메서드는 Laravel의 `Illuminate\Http\Response`가 제공하는 매크로일 뿐 Symfony 원본 `Response`(그리고 `response()->download()`가 반환하는 `BinaryFileResponse`)에는 존재하지 않습니다. 이 프로젝트가 파일 다운로드 응답을 반환한 건 이번이 처음이라 지금까지 드러나지 않았던 잠재 버그였습니다.

해결: `->header()` 체이닝 대신 모든 응답 타입에 공통으로 존재하는 `$response->headers->set(...)`(Symfony `HeaderBag`)로 교체.

| // ❌ 이전 — BinaryFileResponse에서 에러 return \$response     ->header('Access-Control-Allow-Origin', '*')     ->header('Access-Control-Allow-Methods', '...')     ->header('Access-Control-Allow-Headers', '...'); // ✅ 수정 — 모든 응답 타입에서 동작 \$response->headers->set('Access-Control-Allow-Origin', '*'); \$response->headers->set('Access-Control-Allow-Methods', '...'); \$response->headers->set('Access-Control-Allow-Headers', '...'); return \$response; |
| --- |

# **8. 알려진 제한 사항 / v13 예고**

- **공유 URL 미구현**: `share_token` 컬럼은 있지만 비로그인 고객이 이 토큰으로 접근하는 라우트가 없습니다. v13에서 `GET /report/{share_token}` 같은 공개 라우트 + `view_count`/`last_viewed_at` 갱신 로직을 추가해야 합니다.
- **모바일 미리보기 없음**: React Native 앱에는 "보고서 생성" 버튼이 없습니다(웹 대시보드에서만 가능). 로드맵 v12 3순위(모바일 미리보기)는 이번 범위 밖입니다.
- **템플릿 1종만 지원**: `template_id` 컬럼은 있지만 실제로는 `'basic'` 하나만 존재합니다.
- **한글 폰트 파일이 무거움**: `malgun.ttf`+`malgunbd.ttf` 합쳐 약 26MB가 저장소에 추가됨. 리눅스 배포 시 더 가벼운 서브셋 폰트로 교체 검토 필요.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v12.0 | 2026-09-19 | DomPDF 설치, SiteReport 모델·컨트롤러·Blade 템플릿 신규, 시공 전/후 페어 비교 PDF 렌더링, 웹 프론트엔드(일정 상세 모달) 연동. 한글 폰트 깨짐(맑은고딕 임베드로 해결) 및 CORS 미들웨어의 BinaryFileResponse 비호환(headers->set()으로 해결) 버그 수정 |

*— v12 매뉴얼 — PDF 자동 보고서 1단계 완료 —*

*다음: v13 — 자동 보고서 2단계 (공유 URL + 열람 추적)*

© 2026 Team Schedule Manager
