*Team Schedule Manager  |  개발 매뉴얼 v11.8 (팀 기능 구현)*

**Team Schedule Manager**

**개발 매뉴얼 v11.8**

**팀 생성 · 가입 · 관리 기능 구현**

*v11.5 "팀기능 보존목록" 문서가 실제로는 미착수 상태였던 것을 확인하고 처음부터 구현*

작성일: 2026-09-19

대상 OS: Windows 10/11

*기준: v11.6~v11.7 완료 / DevManual v11.6 문서*

| **★ v11.8 핵심 안내** **• v11.5 문서("팀 관련 백엔드·모바일 코드를 모두 완성했다")는 실제로는 사실이 아니었습니다([[project-doc-code-gap-v11-5]] 참고). `TeamController`는 `members()` 하나만 동작하고 나머지는 전부 501 스텁이었습니다.** **• 이번 작업은 "이미 만들어진 걸 켜는 것"이 아니라 0부터 새로 구현하는 작업이었습니다.** **• 웹 관리자 대시보드만 연동했습니다. 모바일 앱(React Native)의 팀 생성/가입 화면은 이번 범위에 포함되지 않았습니다 — 필요 시 별도 작업.** |
| --- |

# **1. 설계 결정 사항**

기존 라우트 구조(`role:manager` 그룹 안에 `index/show/update/destroy`만 있고 `store`가 없음)와 컨트롤러 docblock 주석("superadmin 전용")을 참고했지만, 실제로 팀을 처음 만드는 주체는 아직 role_id가 없는 일반 사용자이므로 다음과 같이 설계했습니다.

| **엔드포인트** | **권한** | **동작** |
| --- | --- | --- |
| POST /api/teams | member 이상 (단, 이미 팀이 있으면 409) | 새 팀 생성. 생성자를 자동으로 manager(role_id=2)로 승격하고 해당 팀에 소속시킴 |
| POST /api/teams/join | member 이상 (단, 이미 팀이 있으면 409) | 초대 코드로 기존 팀에 가입 (역할은 유지) |
| GET /api/teams | member 이상 | superadmin은 전체 팀, 그 외는 본인 소속 팀만(없으면 빈 배열) |
| GET /api/teams/{id} | member 이상 | 본인 소속 팀만 조회 가능(404 처리), superadmin은 전체 |
| PUT/DELETE /api/teams/{id} | manager 이상 | 본인 소속 팀만 수정/삭제 가능(superadmin 제외 스코프) |

기존에 `role:manager` 미들웨어 그룹 안에 있던 `index`/`show`를 member+ 그룹으로 옮겼습니다 — 팀이 아직 없는 사용자도 "내가 팀이 있는지" 확인할 수 있어야 하기 때문입니다(원래 구조로는 member가 GET /api/teams를 호출하면 403이 나서 "팀 없음" 상태를 프론트엔드가 판별할 방법이 없었습니다).

# **2. 백엔드 구현**

파일 위치: `backend/app/Http/Controllers/Api/TeamController.php` (전체 재작성)

핵심 로직만 요약합니다 (전체 코드는 파일 참조):

- `store()`: `$user->team_id`가 이미 있으면 `ERR_TEAM_002`(409). 없으면 `invite_code`를 6자리 랜덤 대문자로 생성(중복 시 재생성)해 팀을 만들고, `role_id > 2`(member)인 경우 2(manager)로 승격.
- `join()`: `invite_code`로 팀을 찾아 `team_id`만 갱신. 이미 팀이 있으면 409, 코드가 유효하지 않으면 `ERR_TEAM_001`(404).
- `index()`/`show()`: `role_id === 1`(superadmin)이 아니면 항상 `$user->team_id`로 스코프.
- `update()`/`destroy()`: 라우트 미들웨어(`role:manager`)로 1차 방어 + 본인 팀 여부를 컨트롤러에서 재검증.

라우트 변경: `backend/routes/api.php`에서 `/teams`, `/teams/{id}` GET을 member+ 그룹으로, POST `/teams`를 member+ 그룹(신규)으로, PUT/DELETE만 `role:manager` 그룹에 남김.

# **3. 웹 프론트엔드 구현**

파일 위치: `frontend/src/api/team.ts`, `frontend/src/pages/Teams.tsx`

- 소속 팀이 없으면(`GET /api/teams` 결과가 빈 배열) "팀 생성" / "초대 코드로 가입" 탭이 있는 안내 화면(`NoTeamPanel`)을 표시.
- 소속 팀이 있으면 팀 이름(인라인 수정) + 초대 코드 + 팀 삭제 버튼 + 팀원 목록 테이블을 표시.
- 팀 생성/가입/수정/삭제 모두 React Query mutation으로 처리, 성공 시 `teams`/`team-members` 쿼리를 무효화해 즉시 재조회.

# **4. 테스트 결과 (2026-09-19 수행)**

Laravel(MySQL) + 웹 프론트엔드를 실제로 띄우고 브라우저로 다음 시나리오를 직접 검증했습니다.

| **#** | **시나리오** | **결과** |
| --- | --- | --- |
| 1 | 팀 없는 member 계정으로 로그인 → 팀/팀원 관리 진입 | "아직 소속된 팀이 없습니다" 안내 화면 정상 표시 |
| 2 | 팀 이름 입력 후 "생성" | 201 Created, role_id가 3→2(관리자)로 자동 승격, 화면이 팀 상세로 즉시 전환 |
| 3 | 같은 사용자가 팀 재생성 시도 | 409 ERR_TEAM_002 정상 차단 |
| 4 | 두 번째 계정이 잘못된 초대 코드로 가입 시도 | 404 ERR_TEAM_001 정상 반환 |
| 5 | 두 번째 계정이 올바른 초대 코드로 가입 | 200, team_id 갱신, `/api/team/members`에 2명 모두 노출 |
| 6 | 웹에서 팀 이름 인라인 수정 | 200, 화면 즉시 반영 |
| 7 | 웹에서 팀 삭제(Popconfirm 확인) | 200, soft delete, 화면이 "팀 없음" 상태로 복귀 |

테스트에 사용한 계정/팀은 전부 삭제 처리했습니다.

# **5. 알려진 제한 사항 / 다음 단계**

- **모바일 앱 미연동**: React Native 쪽에는 팀 생성/가입 화면이 없습니다. 현재 모바일 신규 가입자는 `AuthController::register()`에서 항상 `team_id=null`, `role_id=3`으로 생성되므로, 팀에 들어가려면 웹에서 팀을 만든 뒤 초대 코드를 공유받아 앱에서 어떤 식으로든 가입 플로우가 필요합니다 — 이번 범위 밖.
- **팀 탈퇴 기능 없음**: 한 번 가입하면 스스로 나가는 API가 없습니다(관리자가 강제로 뺄 수 있는 기능도 없음). 필요 시 별도 `leave()` 엔드포인트 추가 검토.
- **팀원 추방(kick) 기능 없음**: manager가 특정 팀원을 팀에서 제외하는 기능은 미구현.
- **superadmin 전용 팀 관리 화면 없음**: `role_id===1`이 모든 팀을 조회할 수 있는 백엔드 로직은 있지만, 웹 프론트엔드에는 이를 위한 전용 화면(여러 팀을 넘나드는 관리자 뷰)이 없습니다. 현재 프론트엔드는 `teamRes?.data?.[0]`만 사용해 "내 팀 하나"를 가정합니다.

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v11.8 | 2026-09-19 | TeamController 전체 구현(store/join/index/show/update/destroy), 라우트 권한 재구성(index/show를 member+로 이동), 웹 프론트엔드 Teams 페이지 실API 연동(팀 생성/가입/수정/삭제 UI), 실브라우저 통합 테스트 7건 수행 |

*— v11.8 매뉴얼 — 팀 기능(웹) 구현 완료, 모바일 미연동 —*

© 2026 Team Schedule Manager
