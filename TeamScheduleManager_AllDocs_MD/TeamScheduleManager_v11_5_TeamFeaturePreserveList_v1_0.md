Team Schedule Manager

**v11.5 팀 기능 보존 목록**

2026.10 1차 출시 비활성화 / 2027.8 2차 출시 활성화 가이드

작성일: 2026-04-27     버전: v1.0

# **1. 왜 이 문서를 만들었나**

어제(2026-04-26) v11.5 작업으로 팀 관련 백엔드·모바일 코드를 모두 완성했습니다. 그런데 오늘(2026-04-27) 출시 전략이 바뀌었어요.

**출시 전략 변경**

| **구분** | **이전 계획** | **변경 후 (확정)** |
| --- | --- | --- |
| **1차 출시 시기** | 2027년 8월 | **2026년 10월 (10개월 앞당김)** |
| **1차 출시 범위** | 프리랜서 + 팀 통합 | **프리랜서 전용 7가지 기능** |
| **팀 기능** | 1차에 포함 | **2차 출시(2027.8)로 분리** |

 

| **📌 핵심 **팀 관련 코드는 이미 완성되어 있어요. 1차 출시에서 "삭제"하지 말고 "비활성화"만 하고, 2차 출시 때 다시 "활성화"하는 방식으로 가야 6개월 뒤에 또 만들 필요가 없어요. |
| --- |

# **2. v11.5 작업물 전체 목록**

어제까지 완성한 팀 관련 코드를 트랙별로 정리합니다. 이게 곧 보존해야 할 자산이에요.

## **2-1. 트랙 A — ExceptionHandler 8핸들러**

**1차 출시에서도 그대로 사용 (팀 전용 X, 일반 에러 처리)**

| **항목** | **파일 위치** | **1차 출시 처리** |
| --- | --- | --- |
| 8개 예외 핸들러 | app/Exceptions/Handler.php | **그대로 유지** |

## **2-2. 트랙 B — 회원가입 3분기**

**백엔드 코드는 그대로 유지, 모바일에서만 freelancer만 노출**

| **분기** | **역할** | **1차 출시** |
| --- | --- | --- |
| **free freelancer** | 단독 프리랜서 가입 (team_id = NULL) | **★ 활성** |
| **team owner** | 팀 사장으로 신규 가입 (팀 자동 생성) | **비활성** |
| **team member** | 초대 코드로 팀원 가입 | **비활성** |

 

백엔드 위치: AuthController, RegisterRequest

## **2-3. 트랙 C — 팀 전환 API 6개**

**백엔드 API는 그대로 유지, 모바일에서 호출 안 함**

| **#** | **API** | **역할** | **1차 처리** |
| --- | --- | --- | --- |
| 1 | **초대 코드 검증** | 초대 코드가 유효한지 확인 | 호출 안 함 |
| 2 | **팀 가입** | 초대 코드로 기존 팀에 합류 | 호출 안 함 |
| 3 | **팀 생성** | 프리랜서 → 사장 전환 (팀 자동 생성) | 호출 안 함 |
| 4 | **팀 탈퇴** | 팀원이 팀에서 빠지기 | 호출 안 함 |
| 5 | **팀 해체** | 사장이 팀 자체를 해체 | 호출 안 함 |
| 6 | **팀원 강퇴** | 사장이 특정 팀원을 내보냄 | 호출 안 함 |

 

백엔드 위치: TeamController, routes/api.php

## **2-4. 트랙 D — 모바일 화면 2개**

**화면은 존재하되 진입 경로 차단 또는 옵션 숨김**

| **화면** | **파일 위치** | **1차 처리** |
| --- | --- | --- |
| **RegisterScreen** | app/src/screens/RegisterScreen.tsx | **freelancer 옵션만 노출** |
| **TeamManageScreen** | app/src/screens/TeamManageScreen.tsx | **Drawer 메뉴에서 항목 제거** |

## **2-5. 보너스 — 데이터 격리 헬퍼**

**1차 출시에서도 그대로 사용 (프리랜서만 있어도 정상 작동)**

| **항목** | **역할** | **1차 처리** |
| --- | --- | --- |
| **scopeForUser 헬퍼** | 일정 조회 시 사용자별 데이터 격리 (team_id 기준) | **그대로 유지** |
| **일정 임시흡수** | 프리랜서 → 팀 전환 시 기존 일정을 팀에 흡수 | 코드 그대로 (호출 경로 차단됨) |

 

| **💡 왜 임시흡수 코드를 남겨두나요? **백엔드 API는 모바일에서 호출 안 하므로 자연스럽게 작동 안 해요. 코드는 남겨도 동작 안 하니까 안전하고, 2차 때 다시 활성화할 때 그대로 쓸 수 있어요. 단, v11.6 토글필터 작업할 때 임시흡수 → 분리방식으로 재설계할 가능성 있음 (메모리에 기록됨). |
| --- |

# **3. 1차 출시 — 비활성화 처리 방법**

실제 코드를 어떻게 손봐야 1차 출시에서 팀 기능이 노출되지 않는지 정리합니다. 모두 모바일 쪽만 손대고 백엔드는 건드리지 않아요.

## **3-1. RegisterScreen — freelancer 옵션만 노출**

현재 회원가입 화면은 3가지 타입 선택 → 1차에서는 자동 freelancer 가입으로 단순화.

 

**▼ 권장 방식 (단순)**

// RegisterScreen.tsx 상단

const ENABLE_TEAM_REGISTER = false;  // ★ 1차 출시 후 true로 변경

 

// 회원가입 타입 선택 화면

{ENABLE_TEAM_REGISTER ? (

  <View>

    <Button title="단독 프리랜서로 가입" ... />

    <Button title="팀 사장으로 가입" ... />

    <Button title="초대 코드로 팀원 가입" ... />

  </View>

) : (

  // 1차 출시: 자동 freelancer로 진행

  <FreelancerRegisterForm />

)}

 

| **💡 ENABLE_TEAM_REGISTER 같은 변수를 ****"****Feature Flag****"****라고 해요. **"이 기능 켤까 말까"를 한 줄로 제어하는 스위치예요. 2차 때 false → true 한 번만 바꾸면 모든 분기가 다시 살아나요. 6개월 후 코드 다시 들여다볼 필요 없이 변수 하나만 바꾸면 끝. |
| --- |

## **3-2. TeamManageScreen — Drawer 메뉴에서 항목 제거**

AppNavigator에서 Drawer 메뉴 항목 자체를 숨김.

 

// AppNavigator.tsx 상단

const ENABLE_TEAM_FEATURES = false;  // ★ 1차 출시 후 true로 변경

 

// Drawer.Screen 정의 부분

<Drawer.Navigator>

  <Drawer.Screen name="Home" component={HomeScreen} />

  <Drawer.Screen name="MySummary" component={MySummaryScreen} />

  <Drawer.Screen name="Profile" component={ProfileScreen} />

 

  {/* ★ 1차 출시 비활성: 2차 때 ENABLE_TEAM_FEATURES = true */}

  {ENABLE_TEAM_FEATURES && (

    <Drawer.Screen name="TeamManage" component={TeamManageScreen} />

  )}

</Drawer.Navigator>

## **3-3. 트랙 C 팀 전환 API — 호출 안 함**

모바일에서 호출하지 않으므로 별도 처리 불필요. 단, 만에 하나 다른 코드에서 호출한다면 동일하게 Feature Flag로 막기.

 

// 예: api/teamApi.ts

export const switchToTeamOwner = async (...) => {

  if (!ENABLE_TEAM_FEATURES) {

    throw new Error("팀 기능은 2027.8 출시 예정입니다.");

  }

  // 기존 코드 그대로 유지

  ...

};

# **4. 2차 출시 (2027.8) — 활성화 체크리스트**

6개월~1년 후 다시 보더라도 따라할 수 있게 단계별로 정리.

| **#** | **할 일** | **파일** |
| --- | --- | --- |
| **1** | Feature Flag를 true로 변경 | RegisterScreen.tsx, AppNavigator.tsx, teamApi.ts |
| **2** | 백엔드 API 동작 확인 (Thunder Client) | TeamController 6개 엔드포인트 |
| **3** | 회원가입 화면 3분기 동작 테스트 | RegisterScreen.tsx |
| **4** | 팀 관리 화면 진입 + 6개 액션 동작 테스트 | TeamManageScreen.tsx |
| **5** | 일정 조회 — 팀/개인 데이터 격리 확인 | ScheduleController.scopeForUser |
| **6** | v11.6 토글 필터(전체/개인/팀) 추가 작업 | HomeScreen, MonthlySummary |
| **7** | 임시흡수 로직 → 분리방식 재설계 검토 | TeamController, ScheduleController |
| **8** | leave/disband 시 일정 처리 정책 결정 | TeamController |

 

| **⚠️ 중요 **5~8번은 v11.5 작업 종료 시점에 결정된 "v11.6에서 다룰 항목"이에요. 2차 출시 준비할 때 이 4가지를 함께 진행해야 팀 기능이 진짜 완성돼요. 단순히 Feature Flag만 켜면 데이터 흐름에 빈틈이 있을 수 있어요. |
| --- |

# **5. 참고 — 1차 출시 7가지 핵심 기능**

서비스기획서 v2.8 기준. 이 7가지에만 집중해서 2026.10 출시까지 달려갑니다.

| **#** | **핵심 기능** |
| --- | --- |
| **1** | 일정 등록·관리 (캘린더 기반) |
| **2** | 공수·급여 자동 계산 |
| **3** | 월별 수입 대시보드 |
| **4** | 현장 사진 구조화 (시공 전·중·후) — v11 |
| **5** | 자동 보고서 생성 + 공유 URL — v12 |
| **6** | 명함 기능 — v14 |
| **7** | 원천징수·세금 신고 자료 (간이 버전) |

 

| **📅 출시 일정 **v11(현재) → v12 → v13 → v14 → v15(통합 테스트) → v16(★ 2026.10 1차 출시) → v17~v18(출시 후 보완) → v19~v21(2차 출시 준비) → v22(★ 2027.8 2차 출시). |
| --- |

# **6. 변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성. 출시 전략 변경(1차 프리랜서 전용 / 2차 팀 기능 추가)에 따라 v11.5 작업물 보존 목록을 정리. 트랙 A~D + 보너스 헬퍼 위치, 1차 출시 비활성화 방법(Feature Flag), 2차 출시 활성화 체크리스트(8단계) 포함. |

 

 

© 2026 Team Schedule Manager

-  -