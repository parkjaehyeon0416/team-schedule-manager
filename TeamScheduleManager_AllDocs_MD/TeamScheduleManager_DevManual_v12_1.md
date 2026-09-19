*Team Schedule Manager  |  개발 매뉴얼 v12.1 (견적 작성 + PDF)*

**Team Schedule Manager**

**개발 매뉴얼 v12.1**

**견적 작성 + PDF (기존 v12~v13 자리, 뒤늦게 구현)**

*기획서 ServicePlan_v2_6/2_7 반영 — 로드맵 2순위 기능, 이번 세션에서 스킵됐다가 사후 확인 후 구현*

작성일: 2026-09-19

대상 OS: Windows 10/11

*기준: v17(수입·경비 정리) 완료*

| **★ v12.1 핵심 안내** **• 원래 로드맵은 "견적 작성(v12) → 견적서 PDF+명함+일정연동(v13) → 자동 보고서(v14~v15)" 순서였습니다. 그런데 이번 세션에서는 이 순서를 착각해서 "자동 보고서"(현 v12/v13 매뉴얼)를 먼저 만들고 "견적서"는 통째로 빼먹었습니다. 로드맵을 다시 확인하는 과정에서 발견해 뒤늦게 이 매뉴얼(v12.1)로 구현했습니다.** **• 매뉴얼 번호가 기존 v12/v13(자동 보고서)과 충돌하지 않도록 v12.1로 표기합니다 — 실제 버전 순서보다 "이 기능이 원래 있어야 했던 자리"를 나타내는 용도입니다.** **• 이미 있는 자동 보고서(v12~v13)와 명함(v14) 기능의 QR 삽입 패턴을 그대로 재사용했습니다.** |
| --- |

# **1. 설계서 대비 구현 범위**

| **기획서 항목(v2.6 3-2/3-3절)** | **구현 여부** |
| --- | --- |
| DB: material_categories / user_materials / quotes / quote_lines (4개) | user_materials/quotes/quote_lines 3개만 생성. material_categories는 만들지 않고 기존 `work_types`(v10.1)를 카테고리로 재사용 |
| 기본 템플릿(도배/타일/필름/도장) Seeder | 미구현 — 사용자가 처음부터 자유 입력, 입력한 항목이 자동으로 user_materials에 쌓여 이후 자동완성됨 |
| QuoteController / UserMaterialController | 구현 |
| 모바일 화면(QuoteListScreen 등) | 미구현 — 웹 대시보드 "견적서 관리" 페이지로 대체 |
| 단순 텍스트 공유(카톡) | 미구현 |
| QuotePdfService (9개 섹션) | 단순화된 1개 섹션 PDF로 구현(표지 없이 고객정보+항목표+합계+메모+명함QR) |
| 워터마크 + QR코드 | 명함 QR만 구현(견적서 자체를 가리키는 다운로드 QR은 미구현) |
| MyMaterialsScreen(자재 관리 화면) | 미구현 — API(`GET/DELETE /api/materials`)만 존재, 전용 화면 없음(견적 작성 폼의 자동완성으로만 노출) |
| 자주 쓰는 항목 학습(usage_count) | 구현 — `QuoteController::learnMaterial()` |
| 견적 → 일정 자동 전환 | 구현 — `QuoteController::approve()` |
| 카톡 공유 | 미구현 |

# **2. 백엔드 구현**

## **2.1 DB 설계 (기획서 대비 단순화)**

- `user_materials`: `user_id`, `work_type_id`(work_types 재사용), `name`, `unit`, `default_unit_price`, `usage_count`, `last_used_at`, `is_hidden`.
- `quotes`: 고객 정보(`client_name`/`client_contact`/`address`), `site_id`(선택), `work_type_id`, `desired_date`, `memo`, `subtotal_amount`/`discount_amount`/`total_amount`, `status`(draft/sent/approved/rejected), `approved_schedule_id`.
- `quote_lines`: `quote_id`, `user_material_id`(선택), `name`/`spec`/`quantity`/`unit`/`unit_price`/`amount`/`sort_order`.

## **2.2 QuoteController**

- `store()`: 트랜잭션 안에서 견적+라인을 함께 생성하고, 각 라인 이름으로 `learnMaterial()`을 호출해 `user_materials`에 upsert(이미 있으면 `usage_count++`/`last_used_at`/`default_unit_price` 갱신, 없으면 신규 생성).
- `approve()`: 이미 승인됨(409)·희망 시공일 없음(422) 검증 후, `site_id`가 없고 `address`만 있으면 그 자리에서 `Site`를 새로 만들어 연결하고, `Schedule`을 생성(`daily_wage`에 견적 총액을 그대로 넣음 — 공수 기반이 아니라 견적 기반 계약이라 임시로 이렇게 매핑, 실제 공수/단가 재계산이 필요하면 사용자가 일정에서 수정해야 함)한 뒤 `quotes.status='approved'` + `approved_schedule_id` 기록.
- `downloadPdf()`: 저장하지 않고 요청마다 즉석 렌더링(자동 보고서와 달리 견적은 수정 가능성이 높아 캐시하지 않음). `BusinessCard`가 있으면 명함 QR을 자동 삽입(v14 패턴 재사용).

## **2.3 UserMaterialController**

`index()`(자주 쓰는 순 정렬), `destroy()`(완전 삭제 대신 `is_hidden=true` — 과거 견적의 `user_material_id` 참조가 끊기지 않도록).

# **3. 웹 프론트엔드 구현**

- `frontend/src/api/quote.ts`, `frontend/src/api/workType.ts`(신규 — 기존에 work-types를 쓰는 프론트 API 모듈이 없어서 새로 만듦).
- `frontend/src/pages/Quotes.tsx`: 목록 테이블(고객명/현장/희망시공일/총견적가/상태) + 작성 모달(줄 단위 항목 추가/삭제, `AutoComplete`로 내 자재 목록 자동완성, 실시간 소계 계산) + PDF 다운로드/승인/삭제 액션.
- 사이드 메뉴에 "견적서 관리" 추가(스케줄 관리 바로 아래 — 견적이 일정보다 먼저 쓰이는 흐름을 반영).

# **4. 테스트 결과 (2026-09-19 수행)**

| **#** | **시나리오** | **결과** |
| --- | --- | --- |
| 1 | 항목 2개(자재+인건비)로 견적 생성, 할인 10,000원 적용 | subtotal 350,000 - discount 10,000 = total 340,000 정확히 계산됨 |
| 2 | GET /api/materials로 방금 쓴 항목 확인 | usage_count=1, default_unit_price가 방금 입력한 단가로 정확히 저장됨 |
| 3 | GET /api/quotes/{id}/pdf | 3페이지 PDF 정상 생성, 항목표/합계/메모 정상 렌더링 (첫 시도에서 희망시공일이 "2026-10-01 00:00:00"으로 시각까지 표시되는 버그 발견 → `?->format('Y-m-d')`로 수정) |
| 4 | POST /api/quotes/{id}/approve (site_id 없이 address만 있는 견적) | Site 자동 생성 + Schedule 생성 + quote.status=approved 전부 확인 |
| 5 | 승인된 견적 재승인 시도 | 409 ERR_QUOTE_002 정상 차단 |
| 6 | 웹 브라우저: 로그인 → 견적서 관리 → 작성 모달에서 항목 입력 → 실시간 소계 확인(100,000원) → 생성 | 목록에 즉시 반영, 상태 "작성중" 정상 표시 |

테스트에 사용한 팀/사용자/견적/자재/일정/현장은 전부 정리했습니다.

# **5. 알려진 제한 사항**

- **모바일 앱 미구현**: 견적 작성은 웹에서만 가능합니다.
- **PDF 공유/QR 다운로드 없음**: 자동 보고서(v13)처럼 `share_token` 기반 공개 열람 링크가 없습니다 — 견적서는 아직 로그인 사용자만 다운로드해 직접 전달하는 방식입니다.
- **자재 카테고리 시드 없음**: 기본 템플릿(도배/타일/필름/도장 표준 항목)이 미리 채워져 있지 않고, 사용자가 쓴 항목이 쌓이면서 자동완성이 채워지는 구조라 첫 사용 경험이 기획서 의도(바로 템플릿에서 고르기)보다 빈 상태로 시작합니다.
- **daily_wage 매핑이 임시방편**: 견적 승인 시 생성되는 일정의 `daily_wage`에 견적 총액을 그대로 넣습니다 — 공수(`work_units`)는 항상 1로 고정되어, 기존 "공수×단가=수입" 계산 로직과 정확히 맞물리지 않을 수 있습니다. 실제 공수 기반 정산이 필요하면 승인 후 일정에서 수동 조정이 필요합니다.
- **자재 관리 전용 화면 없음**: `MyMaterialsScreen`에 해당하는 화면이 없어 숨김 처리(`DELETE /api/materials/{id}`)를 호출할 UI가 없습니다(API만 존재).

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v12.1 | 2026-09-19 | user_materials/quotes/quote_lines 마이그레이션, UserMaterial/Quote/QuoteLine 모델, QuoteController(CRUD+승인+PDF)/UserMaterialController 신규, resources/views/quotes/basic.blade.php 신규(명함 QR 재사용), 웹 프론트엔드 "견적서 관리" 페이지 신규. 견적 승인 시 Site/Schedule 자동 생성 흐름 구현 |

*— v12.1 매뉴얼 — 로드맵 2순위 기능(견적)을 뒤늦게 채워 넣음, 1차 출시 7대 핵심 기능 전부 실제로 구현 완료 —*

© 2026 Team Schedule Manager
