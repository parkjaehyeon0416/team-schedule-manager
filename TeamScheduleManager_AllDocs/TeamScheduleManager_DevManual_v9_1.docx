Team Schedule Manager  |  개발 매뉴얼 v9.1

**개발 매뉴얼 v9.1**

**웹/모바일 역할 분리 + 모바일 UX 재설계**

작성일: 2026년 04월 24일  |  대상 OS: Windows 10/11  |  기획서 v2.2 기준

**★ v9.1 변경사항 (2026-04-24)**

- [신규 2장] 웹/모바일 역할 분리 전략 — 3계층 구조 설계

- [신규 3장] user_type ENUM에 'operator' 추가 마이그레이션

- [신규 4장] 백엔드 AuthController — platform 파라미터 검증 로직

- [신규 5장] 웹 관리자 — MonthlySummary 제거 + AntApp wrapper 적용

- [신규 6장] 모바일 앱 — Drawer(햄버거) + 헤더 홈 아이콘 구조

- [신규 7장] 모바일 UX — 바텀 탭 제거, 요약 스트립, 달력 최대화

- [신규 8장] CalendarScreen — 모달에서 바로 상세 화면 이동

- [신규 9장] CardViewScreen 삭제 — 기능 중복 제거

- [신규 10장] 알려진 이슈 3건 — 실전 디버깅 경험 정리

| **✅ 이 문서의 특징** v9.0 이후 하루 만에 진행된 대규모 재설계 기록 실제 개발 중 발견한 설계 결함과 해결 과정 포함 기획 결정의 근거(UX 원칙, 사용자 시나리오)까지 상세 기록 같은 실수 반복 방지를 위한 '교훈 섹션' 다수 포함 |
| --- |

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js | ✅ 완료 |
| v2 | Laravel 백엔드 설치 | Laravel 12, Sanctum, ApiResponse | ✅ 완료 |
| v3 | DB 설계 및 마이그레이션 | 8개 테이블, SoftDeletes | ✅ 완료 |
| v4 | React 웹 관리자 설치·설정 | React 19, Ant Design, TanStack | ✅ 완료 |
| v5 | React Native 앱 설치·설정 | RN 0.85.1, PaperProvider | ✅ 완료 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, axios 인터셉터 | ✅ 완료 |
| v7 | 핵심 기능 API + 캘린더 뷰 | 스케줄 CRUD, 커스텀 Day | ✅ 완료 |
| v8 | 배포 및 운영 자동화 | 카페24 배포, Nginx, cron 백업 | ⏳ 예정 |
| v9.0 | DB 확장 (공수/급여/사진/보고서) | 마이그레이션 6개, Seeder | ✅ 완료 |
| v9.1 ◀ | 웹/모바일 역할 분리 + UX 재설계 | ★ operator 역할, Drawer, 햄버거 메뉴 | ▶ 현재 |
| v10 | 공수/급여/보고서 API 개발 | 월별 집계, 자동 보고서 API | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

v9.1은 v9.0 완성 후 발견된 '설계 결함'을 바로잡기 위한 긴급 재설계입니다. 구체적으로, v9.0에서 웹 관리자에 '월별 수입 현황' 화면을 추가했는데, 개발 중 본 화면이 실제 사용자(기사님)가 아닌 운영자(개발자 본인)가 볼 화면과 혼재되어 있다는 점이 드러났습니다.

| **💡 v9.1이 해결하는 4가지 설계 문제** 1. 웹 관리자의 정체성 모호 → 일반 사용자 기능이 섞여 있었음 2. 역할(role)과 플랫폼(web/mobile) 구분 부재 → 접근 제어 불가 3. 모바일 앱 UX 비효율 — 바텀 탭 + 요약 스트립이 기능 중복 4. CardViewScreen의 낮은 사용성 → 달력 중심으로 통합 필요 |
| --- |

- 1. 웹 관리자와 모바일 앱의 역할을 명확히 분리 (운영자 전용 vs 사용자용)

- 2. user_type ENUM에 'operator' 값 추가 + 백엔드에서 플랫폼별 접근 제어

- 3. 모바일 앱 네비게이션 재설계 (Drawer + 헤더 아이콘 패턴)

- 4. 모바일 홈 화면에서 달력을 최대화 + 상단 요약 스트립 도입

- 5. CalendarScreen 모달 → 일정 상세 화면 직접 이동

- 6. CardViewScreen 삭제 및 기능 통합

# **2. 웹/모바일 역할 분리 전략**

## **2.1 문제 인식 — v9.0의 설계 결함**

v9.0에서 웹 관리자에 'MonthlySummary' 화면을 추가했을 때, 개발자가 다음 질문을 던졌습니다:

| **💡 결정적 질문** "그런데 웹 관리자는 관리자(운영자)가 보는 화면이잖아?   저 '월별 수입 현황'은 사용자(기사님)가 봐야 할 화면인데,   왜 웹 관리자에 있지?" 이 질문이 전체 재설계의 시발점이 되었습니다. |
| --- |

## **2.2 새로운 3계층 구조**

명확한 역할 분리를 위해 시스템을 3계층으로 재정의했습니다.

| ┌───────────────────────────────────────────────────────┐ │  🛠️ 웹 관리자 (localhost:3000)                         │ │  → 개발자/운영자(본인)만 접근                            │ │  → "앱 자체를 운영하기 위한 백오피스"                    │ │  역할: 유저 관리, 통계, 공지사항, 문의 처리, 시스템 설정  │ ├───────────────────────────────────────────────────────┤ │  📱 모바일 앱 (React Native)                           │ │  → 최종 사용자 (도배/타일/필름 기사님들)                 │ │  역할: 일정 등록, 공수 입력, 수입 확인, 사진 업로드      │ ├───────────────────────────────────────────────────────┤ │  ⚙️ 백엔드 API (Laravel, localhost:8000)               │ │  → 양쪽 다 데이터 주고받음                              │ └───────────────────────────────────────────────────────┘ |
| --- |

| **💡 이 구조의 4가지 장점** 1. 책임 분리 — 앱 기능과 운영 기능 완전 분리 2. 보안 강화 — 운영 기능에 IP 제한 등 추가 보호 가능 3. UX 최적화 — 사용자는 모바일에 집중, 운영자는 PC에 집중 4. SaaS 표준 — 토스, 배민, 당근마켓 모두 이 구조 |
| --- |

## **2.3 사용자 유형과 플랫폼 매핑**

| **user_type** | **의미** | **접근 플랫폼** | **예시 계정** |
| --- | --- | --- | --- |
| operator | 앱 운영자 | 웹 관리자만 | superadmin@test.com |
| team | 팀 소속 사용자 | 모바일 앱만 | manager@test.com, member@test.com |
| freelancer | 프리랜서 사용자 | 모바일 앱만 | (아직 없음) |

# **3. user_type ENUM에 ****'****operator****'**** 추가**

기존 user_type은 ENUM('team', 'freelancer')였으나, 'operator' 값을 추가해야 합니다.

**마이그레이션 생성:**

| php artisan make:migration add_operator_to_user_type_enum --table=users |
| --- |

**마이그레이션 코드 (전체):**

| <?php use Illuminate\Database\Migrations\Migration; use Illuminate\Support\Facades\DB;  return new class extends Migration {     public function up(): void     {         DB::statement("             ALTER TABLE users             MODIFY COLUMN user_type             ENUM('operator', 'team', 'freelancer')             NOT NULL DEFAULT 'team'         ");     }      public function down(): void     {         // 롤백 시: operator 유저를 team으로 되돌림 (데이터 손실 방지)         DB::statement("             UPDATE users SET user_type = 'team'             WHERE user_type = 'operator'         ");         DB::statement("             ALTER TABLE users             MODIFY COLUMN user_type             ENUM('team', 'freelancer')             NOT NULL DEFAULT 'team'         ");     } }; |
| --- |

| **💡 왜 Schema::table() 대신 DB::statement()?** Laravel의 Blueprint(Schema)는 ENUM 값 '추가'를 공식 지원하지 않습니다. $table->enum()은 '새 컬럼 추가'는 되지만 '기존 ENUM 값 변경'은 불가. 따라서 DB::statement()로 Raw SQL(ALTER TABLE ... MODIFY COLUMN)을 직접 실행. 이는 MySQL의 ALTER TABLE 기능을 그대로 호출하는 방식입니다. |
| --- |

## **3.1 슈퍼관리자 계정을 operator로 전환**

마이그레이션 적용 후, 기존 슈퍼관리자 계정의 user_type을 'operator'로 업데이트합니다.

| php artisan tinker  // 슈퍼관리자(id=1)의 user_type을 'operator'로 변경 DB::table('users')->where('id', 1)->update(['user_type' => 'operator']);  // 변경 확인 DB::table('users')->select('id', 'name', 'email', 'user_type', 'role_id')->get();  exit |
| --- |

# **4. 백엔드 — AuthController 플랫폼 검증**

이제 로그인 시 user_type과 platform을 교차 검증하여, 잘못된 플랫폼 접근을 차단합니다.

## **4.1 정책 매핑**

| private const PLATFORM_MAP = [     'operator'   => 'web',      // 운영자 → 웹만     'team'       => 'mobile',   // 팀 사용자 → 모바일만     'freelancer' => 'mobile',   // 프리랜서 → 모바일만 ]; |
| --- |

## **4.2 login() 메서드 검증 로직**

| public function login(Request $request) {     // ① 입력값 검증 — platform 필수     $request->validate([         'email'    => 'required│email',         'password' => 'required',         'platform' => 'required│in:web,mobile',   // ★ 신규     ]);      // ② 이메일로 사용자 찾기     $user = User::with('role')->where('email', $request->email)->first();      // ③ 이메일 또는 비밀번호 불일치     if (!$user ││ !Hash::check($request->password, $user->password)) {         return ApiResponse::error('이메일 또는 비밀번호가 틀렸습니다.',                                    'ERR_AUTH_001', 401);     }      // ④ ★ 플랫폼 접근 권한 검증     $allowedPlatform = self::PLATFORM_MAP[$user->user_type] ?? null;      if ($allowedPlatform !== $request->platform) {         if ($request->platform === 'web') {             return ApiResponse::error(                 '이 계정은 모바일 앱 전용입니다. 모바일 앱에서 로그인해주세요.',                 'ERR_AUTH_007', 403             );         }         if ($request->platform === 'mobile') {             return ApiResponse::error(                 '운영자 계정은 모바일 앱 이용이 불가합니다. 웹 관리자에서 로그인해주세요.',                 'ERR_AUTH_008', 403             );         }     }      // ⑤ Sanctum 토큰 발급     $token = $user->createToken('auth-token')->plainTextToken;      // ⑥ 응답     return ApiResponse::success([         'user'  => $user,         'token' => $token,     ], '로그인 성공'); } |
| --- |

## **4.3 신규 오류 코드**

| **코드** | **HTTP** | **상황** |
| --- | --- | --- |
| ERR_AUTH_006 | 403 | 웹에서 회원가입 시도 (운영자는 콘솔에서 수동 생성) |
| ERR_AUTH_007 | 403 | 모바일 전용 계정이 웹 로그인 시도 |
| ERR_AUTH_008 | 403 | 운영자 계정이 모바일 로그인 시도 |

# **5. 웹 관리자 정리**

## **5.1 MonthlySummary 제거**

v9.0에서 추가했던 '월별 수입 현황' 페이지를 제거합니다. 이 기능은 모바일 앱으로 이전됩니다.

**삭제할 파일 1개:**

| del frontend\src\pages\MonthlySummary.tsx |
| --- |

**수정할 파일 2개 — import와 Route 제거:**

• frontend/src/App.tsx — 다음 줄 제거:

| import MonthlySummary from "./pages/MonthlySummary";   // 삭제 <Route path="summary" element={<MonthlySummary />} />   // 삭제 |
| --- |

• frontend/src/components/Layout/AdminLayout.tsx — 메뉴 항목 제거:

| import { BarChartOutlined } from ...;   // 삭제 { key: "/summary", icon: <BarChartOutlined />, label: "월별 수입 현황" }, // 삭제 |
| --- |

## **5.2 AntApp Wrapper 적용 (React 19 호환)**

Ant Design 5.x에서 message.error() 같은 Static API는 React 19에서 동작하지 않습니다. 앱 루트를 <App> 컴포넌트로 감싸고, 각 페이지에서 App.useApp() 훅으로 message를 가져와야 합니다.

**App.tsx 최상위 변경:**

| import { App as AntApp } from "antd";  export default function App() {     return (         <AntApp>             <BrowserRouter>                 {/* ... */}             </BrowserRouter>         </AntApp>     ); } |
| --- |

**Login.tsx에서 useApp() 훅 사용:**

| import { App } from "antd";  export default function Login() {     // ★ Static message.error() 대신 훅 기반     const { message } = App.useApp();      const onFinish = async (values) => {         try {             const result = await login(values.email, values.password);             // ...         } catch (error) {             const errCode = error.response?.data?.error_code;             if (errCode === "ERR_AUTH_001") {                 message.error("이메일 또는 비밀번호를 확인해주세요.");             } else if (errCode === "ERR_AUTH_007") {                 message.error("이 계정은 모바일 앱 전용입니다. 모바일 앱에서 로그인해주세요.");             }         }     };     // ... } |
| --- |

| **⚠️ React 19 + Ant Design 5.x 필수 원칙** • 앱 루트에 <App> 컴포넌트로 감싸지 않으면 message.xxx()가 조용히 실패 • 에러 로그도 안 남고 그냥 안 뜸 → 디버깅 어려움 • 다른 페이지(Schedule.tsx 등)도 같은 패턴 적용 권장 |
| --- |

## **5.3 auth.ts에 platform 파라미터 추가**

| // frontend/src/api/auth.ts type LoginData = { user: User; token: string }; type LoginResponse = ApiResponse<LoginData>;  export const login = async (     email: string,     password: string,     platform: "web" │ "mobile" = "web"   // ★ 기본값 'web' ) => {     const res = await axiosInstance.post<LoginResponse>(         "/api/auth/login",         { email, password, platform }     );     return res.data; }; |
| --- |

| **💡 oxc 파서 호환성 팁** Vite의 oxc 파서는 중첩된 제네릭 타입에서 파싱 오류를 낼 수 있습니다. ApiResponse<{ user: User; token: string }> 같은 중첩 타입을 type LoginData = { ... } 로 별칭 정의하면 안전합니다. |
| --- |

# **6. 모바일 앱 — Drawer + 햄버거 메뉴**

## **6.1 설치된 네비게이션 라이브러리**

@react-navigation/drawer가 이미 설치되어 있습니다 (집 PC 기준 v7.9.8). 없다면 설치:

| npm install @react-navigation/drawer react-native-gesture-handler |
| --- |

## **6.2 Reanimated Worklets 설정 이슈**

Drawer는 내부적으로 react-native-reanimated를 사용하며, 최신 reanimated는 react-native-worklets를 추가로 요구합니다.

**설치:**

| npm install react-native-worklets |
| --- |

**babel.config.js 수정:**

| module.exports = {     presets: ['module:@react-native/babel-preset'],     plugins: [         'react-native-worklets/plugin',   // ★ 반드시 plugins 배열의 맨 마지막!     ], }; |
| --- |

| **⚠️ babel plugin 순서 규칙** react-native-worklets/plugin은 반드시 plugins 배열의 마지막에 위치해야 합니다. 다른 플러그인이 이후에 있으면 worklets 변환이 제대로 동작하지 않습니다. 설치 후에는 반드시 캐시 초기화:   npm start -- --reset-cache |
| --- |

## **6.3 AppNavigator.tsx — Drawer 전체 구조**

초기 구성은 Drawer → Tabs 중첩이었으나, UX 개선 과정에서 Tabs 제거됨. 최종 구조:

| import { createDrawerNavigator } from '@react-navigation/drawer'; import { IconButton } from 'react-native-paper';  const Drawer = createDrawerNavigator();  function DrawerRoot() {     return (         <Drawer.Navigator             screenOptions={({ navigation }) => ({                 headerStyle: { backgroundColor: '#1F3864' },                 headerTintColor: '#FFFFFF',                 // ★ 헤더 좌측에 햄버거 + 홈 아이콘 2개 배치                 headerLeft: () => (                     <>                         <IconButton                             icon="menu"                             iconColor="#FFFFFF"                             size={26}                             onPress={() => navigation.openDrawer()}                         />                         <IconButton                             icon="home"                             iconColor="#FFFFFF"                             size={26}                             onPress={() => navigation.navigate('Home')}                         />                     </>                 ),             })}>             <Drawer.Screen name="Home" component={HomeScreen}                 options={{ drawerLabel: '🏠 홈 (달력)' }} />             <Drawer.Screen name="MySummary" component={MySummaryScreen}                 options={{ drawerLabel: '💰 내 수입' }} />             <Drawer.Screen name="Attendance" component={AttendanceScreen}                 options={{ drawerLabel: '⏰ 근태' }} />             <Drawer.Screen name="Profile" component={ProfileScreen}                 options={{ drawerLabel: '👤 프로필' }} />             <Drawer.Screen name="Settings" component={SettingsScreen}                 options={{ drawerLabel: '⚙️ 설정' }} />         </Drawer.Navigator>     ); } |
| --- |

| **💡 Fragment(****<****>****)로 아이콘 2개 배치하는 이유** React에서는 JSX가 여러 요소를 반환할 때 반드시 하나의 부모 필요. <View>로 감싸면 불필요한 레이아웃 박스 생성 → 디자인 깨짐. <>...</> Fragment = '묶어서 반환하되 DOM/Native 요소는 추가 안 함' → 헤더 좌측에 아이콘 2개만 깔끔하게 렌더됨 |
| --- |

## **6.4 LoginScreen에 platform 추가**

| const res = await axiosInstance.post('/auth/login', {     email,     password,     platform: 'mobile',   // ★ 신규 });  // 에러 처리 — ERR_AUTH_008 추가 } else if (errCode === 'ERR_AUTH_008') {     Alert.alert(         '접근 불가',         '운영자 계정은 모바일 앱 이용이 불가합니다.\n웹 관리자에서 로그인해주세요.',     ); } |
| --- |

# **7. 모바일 UX 재설계 — 달력 중심 통합**

## **7.1 기존 구조의 문제점**

초기 v9.1 설계는 바텀 탭 3개(홈/내 수입/근태) + 햄버거 메뉴(프로필/설정) 구조였습니다. 그러나 개발자가 직접 제기한 질문에서 기능 중복이 드러났습니다:

| **💡 개발자의 UX 통찰** "상단 요약 스트립과 바텀 탭이 기능이 겹치지 않나?   바텀 탭을 없애면 달력을 좀 넓게 쓸 수 있지 않겠어?   그리고 상단탭에는 이모지를 없애서 공간을 좀 더 확보하고,   바텀탭은 없애고 홈으로 가는 건 맨 상단의 햄버거 버튼 라인에   홈 모양 아이콘으로 대체하면 바텀은 없애도 되겠지?" 이 관찰이 2차 재설계로 이어졌습니다. |
| --- |

## **7.2 최종 레이아웃**

| ┌──────────────────────────────────────┐ │ ☰  🏠     Team Schedule              │  ← 헤더 (~56px) ├──────────────────────────────────────┤ │  18일      ₩360만       12개          │  ← 요약 스트립 (~44px) │  근무일   이번달 수입    현장          │     (이모지 제거) ├──────────────────────────────────────┤ │  ● 도배 ● 타일 ● 필름       [오늘]    │  ← 툴바 (~44px) ├──────────────────────────────────────┤ │                                       │ │                                       │ │         📆 거대한 달력                 │  ← 화면의 약 77% │                                       │ │     (빈/찬 날짜 한눈에 조망)            │ │                                       │ │                                       │ └──────────────────────────────────────┘    (바텀 탭 없음 → 약 60~80px 추가 공간) |
| --- |

## **7.3 HomeScreen.tsx — 최종 코드**

| import React from 'react'; import { View, Text, StyleSheet, Pressable } from 'react-native'; import CalendarScreen from './CalendarScreen';  const MOCK_SUMMARY = {     work_days: 18,     total_income: 3_600_000,     site_count: 12, };  const formatShortKRW = (value: number): string => {     if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}천만`;     if (value >= 10_000) return `${Math.floor(value / 10_000)}만`;     return value.toLocaleString('ko-KR'); };  export default function HomeScreen({ navigation }: any) {     const summary = MOCK_SUMMARY;      // Drawer.Screen 이름으로 이동     const goToMySummary = () => navigation.navigate('MySummary');     const goToAttendance = () => navigation.navigate('Attendance');      return (         <View style={styles.container}>             <View style={styles.summaryStrip}>                 <Pressable style={styles.summaryItem} onPress={goToAttendance}>                     <Text style={styles.summaryValue}>{summary.work_days}일</Text>                     <Text style={styles.summaryLabel}>근무일</Text>                 </Pressable>                  <View style={styles.separator} />                  <Pressable                     style={[styles.summaryItem, styles.summaryItemHighlight]}                     onPress={goToMySummary}                 >                     <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>                         ₩{formatShortKRW(summary.total_income)}                     </Text>                     <Text style={styles.summaryLabelHighlight}>이번달 수입</Text>                 </Pressable>                  <View style={styles.separator} />                  <Pressable style={styles.summaryItem} onPress={goToMySummary}>                     <Text style={styles.summaryValue}>{summary.site_count}개</Text>                     <Text style={styles.summaryLabel}>현장</Text>                 </Pressable>             </View>              <View style={styles.calendarArea}>                 <CalendarScreen navigation={navigation} />             </View>         </View>     ); } |
| --- |

## **7.4 UX 설계 원칙**

| **원칙** | **적용 방법** |
| --- | --- |
| 달력 최대화 | 바텀 탭 제거로 77% 비율 확보 → 빈 날짜 조망 최적화 |
| 시각적 우선순위 | '이번달 수입' 카드만 노란 배경 + 큰 글자 → 제일 눈에 띔 |
| 접근성 | 하루 자주 쓰는 3개 지표는 요약 스트립에 / 나머지는 햄버거에 |
| 기능 중복 제거 | 바텀 탭과 요약 스트립이 같은 기능 → 바텀 탭 제거 |
| 관례 준수 | iOS/Android 모두 상단 좌측 햄버거 + 홈 아이콘 패턴 일반적 |

# **8. CalendarScreen — 모달에서 바로 상세 이동**

## **8.1 문제점**

기존 CalendarScreen은 날짜 탭 → 모달 표시 → [닫기] / [+ 일정 추가] 2개 버튼만 있었습니다. 상세 화면으로 가려면:

| 1. 캘린더에서 날짜 탭 2. 모달이 하단에서 올라옴 3. 모달에서 "카드 뷰 탭" 으로 이동 (SegmentedButtons) 4. 카드 뷰에서 해당 일정 찾기 5. 일정 탭 → 상세로 이동  → 총 5단계, 매우 번거로움 |
| --- |

## **8.2 개선 — 모달 내 일정 자체가 탭 가능**

개발자의 UX 원칙 적용:

| **💡 Jakob****'****s Law (UX 원칙)** "사용자는 다른 앱에서 이미 익숙한 패턴을 기대한다" • Gmail — 메일 목록에서 메일 탭 → 상세 • Google Calendar — 일정 탭 → 상세 • Todoist — 할일 탭 → 상세 모든 리스트 UI는 '항목 자체를 탭 = 상세 이동'이 표준. 버튼 따로 만드는 것이 오히려 비직관적. |
| --- |

**수정 포인트 — View를 Pressable로 변경:**

| // 기존 selectedSchedules.map(s => (     <View key={s.id} style={styles.scheduleItem}>         {/* ... */}     </View> ))  // 개선 selectedSchedules.map(s => (     <Pressable         key={s.id}         onPress={() => goToDetail(s.id)}         style={({ pressed }) => [             styles.scheduleItem,             pressed && styles.scheduleItemPressed,         ]}         android_ripple={{ color: '#E8F0FE' }}     >         {/* 기존 컨텐츠 + 우측에 chevron(>) 추가 */}         <Text style={styles.chevron}>›</Text>     </Pressable> )) |
| --- |

## **8.3 goToDetail 함수 — 중첩 네비게이션 처리**

CalendarScreen은 HomeScreen 안에 있고, HomeScreen은 Drawer 안에 있고, ScheduleDetail은 최상위 Stack에 있습니다. getParent()를 연쇄적으로 호출해야 접근 가능:

| const goToDetail = (scheduleId: number) => {     setModalVisible(false);     // Drawer > HomeScreen > CalendarScreen 구조     // 최상위 Stack까지 가려면 getParent()를 두 번     const parent = navigation.getParent()?.getParent()                    ││ navigation.getParent();     if (parent) {         parent.navigate('ScheduleDetail', { id: scheduleId });     } else {         navigation.navigate('ScheduleDetail', { id: scheduleId });     } }; |
| --- |

| **💡 React Navigation의 중첩 구조 탐색** navigation.getParent() = 현재 네비게이터의 부모 네비게이터 반환 getParent()를 계속 호출하면 네비게이터 트리를 거슬러 올라감 최상위에 도달하면 undefined 반환 안전하게 ?.getParent()로 optional chaining 사용 권장 |
| --- |

# **9. CardViewScreen 삭제 — 기능 통합**

CardViewScreen은 일정 목록을 카드 리스트로 보여주는 화면이었으나, 개발자가 사용자 관점에서 재검토한 결과 다음 결론에 도달:

| **💡 카드 뷰 제거 결정 근거** 도배/타일/필름 기사님의 핵심 사용 시나리오:   • 아침: '오늘 현장 어디지?' — 달력에서 오늘 날짜 확인   • 점심: '내일, 모레 스케줄은?' — 달력에서 주간 조망   • 저녁: '이번 달 얼마 벌지?' — 내 수입 화면   • 밤: '다음 주에 비어있는 날?' — 달력에서 빈 날짜 찾기 카드 리스트가 유용한 케이스:   • 현장별 히스토리 조회 (드문 사용)   • 리스트 기반 검색 (드문 사용) 결론: 카드 뷰는 사용 빈도 낮음 → 삭제       기존 ScheduleDetail은 달력 모달에서 재활용 |
| --- |

**파일 삭제:**

| del app\src\screens\CardViewScreen.tsx |
| --- |

HomeScreen에서 CardViewScreen import 제거 + SegmentedButtons 제거. (7장 최종 HomeScreen 코드 참고)

# **10. 알려진 이슈 ****&**** 해결 방법**

## **10.1 이슈 — roles/users 테이블 비어있음 (집 PC 세팅 시)**

증상: 회사 PC에서 git pull + migrate 후 로그인 시도하면 401 에러 발생. Network 탭은 요청이 정상 전송되지만 사용자 매칭 실패.

원인: 마이그레이션은 테이블 구조만 만들고 데이터는 생성하지 않음. Seeder를 돌리지 않았거나 이전에 migrate:fresh 등으로 데이터가 초기화된 상태.

**해결 — Tinker에서 수동 주입:**

| php artisan tinker  // 1) roles 3개 생성 (description 컬럼이 없는 스키마 기준) DB::table('roles')->insert([     ['id' => 1, 'name' => 'superadmin', 'created_at' => now(), 'updated_at' => now()],     ['id' => 2, 'name' => 'manager',    'created_at' => now(), 'updated_at' => now()],     ['id' => 3, 'name' => 'member',     'created_at' => now(), 'updated_at' => now()], ]);  // 2) 테스트 사용자 생성 \App\Models\User::create([     'name' => '테스트',     'email' => 'test@test.com',     'password' => \Hash::make('12345678'),     'role_id' => 1,     'user_type' => 'team',     'individual_plan' => 'free', ]);  exit |
| --- |

## **10.2 이슈 — React 19 + Ant Design 5.x message 미작동**

증상: message.error() 호출 시 아무 반응 없음. 에러도 안 남.

원인: Ant Design 5.x의 Static API(message.xxx)가 React 19에서 동작하려면 앱 루트를 <App> 컴포넌트로 감싸야 함.

해결: 5.2절 참조 (App.tsx에 AntApp wrapper 적용)

## **10.3 이슈 — Reanimated worklets 라이브러리 누락**

증상: Android 빌드 시 다음 에러:

| [Reanimated] `react-native-worklets` library not found. Please install it as a dependency in your project. |
| --- |

원인: 최신 reanimated (3.x+)는 react-native-worklets를 별도 패키지로 분리.

**해결:**

| # 1) 패키지 설치 npm install react-native-worklets  # 2) babel.config.js 수정 — plugins 배열 마지막에 추가 module.exports = {     presets: ['module:@react-native/babel-preset'],     plugins: [         'react-native-worklets/plugin',     ], };  # 3) 캐시 초기화 후 재빌드 cd android && .\gradlew clean && cd .. npm start -- --reset-cache  # 별도 터미널에서: npm run android |
| --- |

## **10.4 이슈 — TypeScript oxc 파서 에러**

증상: Vite에서 중첩 제네릭 타입 파싱 실패:

| [PARSE_ERROR] Error: Expected `,` or `}` but found `;` |
| --- |

원인: ApiResponse<{ user: User; token: string }> 같은 깊은 제네릭 중첩을 oxc 파서가 처리 못함.

**해결: 타입 별칭으로 중첩 풀기:**

| // 기존 (에러 발생) const res = await axiosInstance.post<     ApiResponse<{ user: User; token: string }> >(url, body);  // 수정 (안전) type LoginData = { user: User; token: string }; type LoginResponse = ApiResponse<LoginData>;  const res = await axiosInstance.post<LoginResponse>(url, body); |
| --- |

# **11. 최종 점검 체크리스트**

| **항목** | **확인 방법** | **완료** |
| --- | --- | --- |
| user_type ENUM에 operator 추가 확인 | DB::select("SHOW COLUMNS FROM users") | ☐ |
| 슈퍼관리자 user_type='operator' 확인 | DB::table('users')->where('id', 1)->first() | ☐ |
| 웹 로그인 — operator 통과 | superadmin@test.com 로그인 성공 | ☐ |
| 웹 로그인 — team 차단 | manager@test.com 로그인 시 ERR_AUTH_007 | ☐ |
| 모바일 로그인 — team 통과 | manager@test.com 로그인 성공 | ☐ |
| 모바일 로그인 — operator 차단 | superadmin@test.com 로그인 시 ERR_AUTH_008 | ☐ |
| 웹 MonthlySummary 제거 확인 | 사이드바 메뉴에 없음 | ☐ |
| 웹 AntApp wrapper 적용 | message.error() 팝업 정상 표시 | ☐ |
| 모바일 헤더에 햄버거+홈 아이콘 | 앱 실행 시 좌측 상단 확인 | ☐ |
| 모바일 바텀 탭 제거 확인 | 달력이 화면 77% 차지 | ☐ |
| CardViewScreen.tsx 파일 삭제 | app/src/screens/ 폴더에 없음 | ☐ |
| 달력 모달에서 일정 탭 → 상세 이동 | 에뮬에서 동작 확인 | ☐ |
| Git commit + push 완료 | git log로 최신 커밋 확인 | ☐ |

# **12. 다음 단계 안내 (v10 예고)**

| **v10 작업** | **목적** |
| --- | --- |
| WorkTypeController 작성 | 공정 마스터 조회 API (드롭다운용) |
| UserWageSettingController 작성 | 사용자 단가 프리셋 CRUD API |
| MonthlySummaryController 작성 | 월별 집계 조회 API |
| Schedule Model Observer 구현 | 일정 변경 시 monthly_summaries 자동 재계산 |
| 모바일 MySummaryScreen 실제 연동 | Mock 데이터 → 진짜 데이터 |
| HomeScreen 요약 스트립 실제 연동 | 월별 수입 실시간 반영 |
| SiteReportController 작성 | 자동 보고서 생성 + 공유 URL |
| 공수/단가 입력 UI (모바일) | 일정 등록 화면에 공수·단가 필드 |
| 사진 카테고리 업로드 UI | 현장 상세에 before/during/after 탭 |

| **💡 v10 우선순위 제안** 1순위: MonthlySummary API 연동 — 홈/수입 화면 실작동 2순위: 일정 등록 시 공수/단가 입력 UI — 가장 중요한 사용자 입력 3순위: 월별 집계 자동 갱신 Observer — 실시간성 4순위: 자동 보고서 — 유료 전환 트리거 (Standard 플랜) |
| --- |

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v9.0 | 2026-04-23 | 최초 작성 — DB 확장 6개 마이그레이션, work_types Seeder, 월별 수입 대시보드 뼈대, ALTER TABLE AFTER 이슈 기록 |
| v9.1 | 2026-04-24 | 웹/모바일 역할 분리 + 모바일 UX 재설계. user_type에 operator 추가, AuthController platform 검증, 웹 MonthlySummary 제거, 모바일 Drawer + 햄버거 메뉴, 바텀 탭 제거, 달력 최대화, CardViewScreen 삭제, 4건 실전 이슈 해결 기록 |

© 2026 Team Schedule Manager