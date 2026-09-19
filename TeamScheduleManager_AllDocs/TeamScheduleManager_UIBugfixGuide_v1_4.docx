Team Schedule Manager

**UI 버그 수정 가이드**

버그 수정 3건 + 구조 개선 3건 + 원천징수 기능 + 사업자 여부 + 세금 알림

작성일: 2026-04-27     버전: v1.4

# 0. 수정/추가 항목 전체 요약

총 9가지 항목 — UI 버그 3건 / 구조 개선 3건 / 신규 기능 3건

| **#** | **화면** | **내용** | **구분** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1** | **로그인** | 비밀번호 마스킹 흰색으로 안 보임 | 버그 | LoginScreen.tsx |
| **2** | **내 수입 현황** | 섹션 카드 배경 검정 → 텍스트 안 보임 | 버그 | MySummaryScreen.tsx |
| **3** | **홈 캘린더** | 격자선 흐리고 날짜 텍스트 너무 작음 | 버그 | CalendarScreen.tsx |
| **4** | **일정 등록/상세** | 공종(ENUM)·공정 중복 → 공정으로 통합 | 개선 | ScheduleCreateScreen ScheduleDetailScreen |
| **5** | **내 수입 현황** | "실수령액" → "순수입" 표현 수정 | 개선 | MySummaryScreen.tsx |
| **6** | **내 수입/백엔드** | 3.3% 자동공제 → 참고용 분리 | 개선 | MonthlySummaryService MySummaryScreen |
| **7** | **일정 등록/상세 수입 현황** | 원천징수 여부 토글 추가 (DB + 백엔드 + 모바일) | 신규 | 마이그레이션 / Schedule.php ScheduleController ScheduleCreateScreen ScheduleDetailScreen MySummaryScreen |
| **8** | **프로필 화면** | ★ 사업자 여부 선택 추가 (개인사업자 / 해당 없음) | 신규 | users 테이블 마이그레이션 User.php ProfileScreen.tsx |
| **9** | **시스템 (백엔드)** | ★ 종합소득세 신고 기간 앱 푸시 알림 (개인사업자 대상 / 5월) | 신규 | NotificationService.php FCM 설정 AlertScreen.tsx (예정) |

# 1~7. 기존 수정 항목 (v1.3과 동일)

| **💡 항목 1~7의 수정 방법은 v1.3 문서와 동일합니다. v1.4는 v1.3 내용에 항목 8(사업자 여부)과 항목 9(세금 알림)가 추가된 버전이에요.** |
| --- |

# 8. 사업자 여부 설정 — 프로필 화면 추가 (★ v1.4 신규)

## 8-1. 왜 필요한가

개인사업자 여부를 알면 두 가지에 활용할 수 있어요:

| **활용 목적** | **개인사업자** | **해당 없음 (일용직/미등록)** |
| --- | --- | --- |
| **세무사용 PDF 표지** | "사업소득 정리 자료" | "근로/기타소득 정리 자료" |
| **5월 세금 알림** | ✅ 알림 발송 | ❌ 알림 없음 |
| **부가세 안내** | △ 나중에 추가 가능 | 해당 없음 |

| **✅ 일정 등록마다 묻지 않고 프로필에서 딱 한 번만 설정 — 사용자 입장에서 훨씬 편해요.** |
| --- |

## 8-2. 완성 후 프로필 화면 모습

| ┌─────────────────────────────────────┐ │  👤 내 정보                          │ │  이름: 홍길동                        │ │  ─────────────────────────────────  │ │  💼 사업자 등록 여부                  │ │  ◉ 개인사업자                        │ │  ○ 해당 없음 (일용직/미등록)          │ │                                      │ │  ※ 개인사업자 선택 시 5월 세금        │ │    신고 기간 알림을 받을 수 있어요    │ └─────────────────────────────────────┘ |
| --- |

## 8-3. STEP 1 — DB 컬럼 추가

| **항목** | **내용** |
| --- | --- |
| **테이블** | users |
| **추가 컬럼명** | is_business_owner |
| **타입** | TINYINT(1) DEFAULT 0 (0=해당없음, 1=개인사업자) |

php artisan make:migration add_is_business_owner_to_users_table --table=users

// 마이그레이션 파일 내용

public function up(): void

{

    Schema::table('users', function (Blueprint $table) {

        $table->tinyInteger('is_business_owner')

              ->default(0)

              ->comment('사업자 여부: 0=해당없음, 1=개인사업자')

              ->after('user_type');

    });

}

php artisan migrate

## 8-4. STEP 2 — 백엔드 모델 (User.php)

// fillable에 추가

'is_business_owner',

// casts에 추가

'is_business_owner' => 'boolean',

## 8-5. STEP 3 — 프로필 화면 (ProfileScreen.tsx)

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ProfileScreen.tsx |
| **추가 UI** | 라디오 버튼 2개 (개인사업자 / 해당 없음) |
| **저장 시점** | 선택 즉시 또는 저장 버튼 탭 시 PATCH /api/profile 호출 |

// state 추가

const [isBusinessOwner, setIsBusinessOwner] = useState<boolean>(false);

// 프로필 로드 시 기존 값 세팅

setIsBusinessOwner(profileData.is_business_owner ?? false);

// UI — 라디오 버튼 형태

<View style={styles.section}>

  <Text style={styles.sectionTitle}>💼 사업자 등록 여부</Text>

  <Pressable style={styles.radioRow}

    onPress={() => setIsBusinessOwner(true)}>

    <View style={[styles.radioCircle,

      isBusinessOwner && styles.radioSelected]} />

    <Text style={styles.radioLabel}>개인사업자</Text>

  </Pressable>

  <Pressable style={styles.radioRow}

    onPress={() => setIsBusinessOwner(false)}>

    <View style={[styles.radioCircle,

      !isBusinessOwner && styles.radioSelected]} />

    <Text style={styles.radioLabel}>해당 없음 (일용직/미등록)</Text>

  </Pressable>

  {isBusinessOwner && (

    <Text style={styles.radioHint}>

      ※ 5월 종합소득세 신고 기간에 알림을 드려요

    </Text>

  )}

</View>

// 저장 시 payload에 포함

is_business_owner: isBusinessOwner,

# 9. 종합소득세 신고 기간 알림 — 설계 가이드 (★ v1.4 신규)

## 9-1. 기능 개요

| **📌 이 기능은 프로필에서 ****"****개인사업자****"****를 선택한 사용자에게만 발송돼요.** 발송 시점: 5월 1일 (신고 시작 안내) + 5월 25일 (마감 6일 전 리마인더) 방식: 앱 푸시 알림 (무료) → 나중에 카카오 알림톡 유료 옵션 추가 가능 |
| --- |

## 9-2. 알림 내용 설계

| **시점** | **발송일** | **알림 내용** |
| --- | --- | --- |
| **1차** | 5월 1일 | 📢 종합소득세 신고 기간 시작! 5월 1일~31일 사이에 신고하세요. 작년 수입 정리 자료 → [바로 보기] |
| **2차** | 5월 25일 | ⏰ 종합소득세 마감까지 6일 남았어요! 아직 신고 안 하셨다면 서두르세요. 수입 자료 다운로드 → [바로 보기] |
| **3차 (선택)** | 5월 30일 | 🚨 내일이 종합소득세 신고 마감일이에요! 5월 31일까지 국세청 홈택스에서 신고하세요. |

## 9-3. 구현 방식 — FCM 푸시 알림

FCM이 뭔가요? Firebase Cloud Messaging의 약자예요.

Google이 만든 무료 푸시 알림 서비스예요. 앱에 알림 보내는 가장 표준적인 방법이에요.

| **항목** | **내용** |
| --- | --- |
| **서비스** | Firebase Cloud Messaging (FCM) — 완전 무료 |
| **비용** | $0 — Google 계정만 있으면 됨 |
| **작동 방식** | 백엔드 Laravel cron → 매일 날짜 확인 → 5월 1일/25일/30일이면 FCM API 호출 → 사용자 폰에 알림 도착 |
| **필요한 설정** | Firebase 프로젝트 생성 → FCM 서버키 발급 → 앱에 FCM SDK 설치 → 사용자 기기 토큰 저장 |
| **개발 시점** | 프로필 화면 완성 후 (v15 출시 준비 단계 권장) |

| **💡 cron이 뭔가요? ****"****매일 정해진 시간에 자동으로 실행되는 프로그램****"****이에요. 알람 시계처럼 매일 자정에 ****"****오늘이 5월 1일인가?****"**** 확인하고, 맞으면 알림을 보내는 방식이에요.** |
| --- |

## 9-4. 백엔드 구현 코드 (Laravel Scheduling)

**[ STEP 1 — users 테이블에 FCM 토큰 저장 컬럼 추가 ]**

// 마이그레이션: add_fcm_token_to_users_table

$table->string('fcm_token')->nullable()->after('is_business_owner');

**[ STEP 2 — 모바일 앱에서 FCM 토큰을 서버에 저장 ]**

// React Native — 앱 실행 시 토큰 서버 전송

import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();

await axiosInstance.post('/auth/fcm-token', { fcm_token: token });

**[ STEP 3 — 백엔드 Laravel Scheduler 설정 ]**

// app/Console/Kernel.php

protected function schedule(Schedule $schedule): void

{

    // 매일 오전 9시 실행

    $schedule->call(function () {

        $today = now()->format('m-d');   // 오늘 월-일

        // 5월 1일 → 1차 알림

        if ($today === '05-01') {

            NotificationService::sendTaxReminder('start');

        }

        // 5월 25일 → 2차 알림

        if ($today === '05-25') {

            NotificationService::sendTaxReminder('warning');

        }

        // 5월 30일 → 3차 알림

        if ($today === '05-30') {

            NotificationService::sendTaxReminder('urgent');

        }

    })->dailyAt('09:00');

}

**[ STEP 4 — NotificationService 구현 ]**

// app/Services/NotificationService.php

public static function sendTaxReminder(string $type): void

{

    // 개인사업자이고 FCM 토큰 있는 사용자만

    $users = User::where('is_business_owner', 1)

                 ->whereNotNull('fcm_token')

                 ->get();

    $messages = [

        'start'   => [

            'title' => '📢 종합소득세 신고 기간 시작!',

            'body'  => '5월 1일~31일 사이에 신고하세요. 수입 자료를 확인해보세요.',

        ],

        'warning' => [

            'title' => '⏰ 종합소득세 마감까지 6일 남았어요!',

            'body'  => '아직 신고 전이라면 지금 서두르세요!',

        ],

        'urgent'  => [

            'title' => '🚨 내일이 종합소득세 신고 마감일!',

            'body'  => '5월 31일까지 홈택스(hometax.go.kr)에서 신고하세요.',

        ],

    ];

    foreach ($users as $user) {

        // FCM API 호출 (Firebase Admin SDK 또는 HTTP v1 API)

        Http::withToken(config('services.fcm.server_key'))

            ->post('https://fcm.googleapis.com/fcm/send', [

                'to'           => $user->fcm_token,

                'notification' => $messages[$type],

            ]);

    }

}

| **⚠️ FCM 설정 순서: (1) Firebase 콘솔(console.firebase.google.com)에서 프로젝트 생성 → (2) 서버키 발급 → (3) .env에 FCM_SERVER_KEY 추가 → (4) React Native 앱에 @react-native-firebase/messaging 설치. 이 작업은 v15 출시 준비 단계에서 진행하세요.** |
| --- |

## 9-5. 나중에 유료로 확장 — 카카오 알림톡

앱 푸시 알림은 앱을 삭제하거나 알림을 껐으면 못 받아요.

더 확실하게 전달하려면 카카오 알림톡을 추가할 수 있어요.

| **항목** | **앱 푸시 (FCM)** | **카카오 알림톡** |
| --- | --- | --- |
| **비용** | 무료 | 건당 약 8~15원 |
| **도달률** | 앱 삭제/알림 OFF면 못 받음 | 카카오 있으면 거의 100% |
| **구현 난이도** | 쉬움 | 중간 (카카오 사업자 등록 필요) |
| **권장 시점** | 출시 전 (v15) | 유료 플랜 출시 후 |

| **✅ 전략: 출시 때는 FCM 무료로 시작 → 유료 플랜 사용자에게는 카카오 알림톡 제공 → 차별화 유료 기능으로 활용** |
| --- |

# 10. 집에서 작업할 순서 (전체)

1~7번: v1.3 문서 참고 / 8~9번: 아래 순서대로

| **순서** | **파일** | **할 일** | **시간** |
| --- | --- | --- | --- |
| **1~7** | (v1.3 참고) | 버그 수정 + 공종 통합 + 세금 표현 + 원천징수 토글 | 95분 |
| **8-1** | **마이그레이션 신규** | is_business_owner 컬럼 추가 + migrate | 10분 |
| **8-2** | **User.php** | fillable + casts 추가 | 5분 |
| **8-3** | **ProfileScreen.tsx** | 라디오 버튼 UI + 저장 payload 추가 | 20분 |
| **9-1** | **마이그레이션 추가** | fcm_token 컬럼 추가 + migrate | 5분 |
| **9-2** | **React Native 앱** | @react-native-firebase/messaging 설치 + 토큰 서버 전송 | 30분 |
| **9-3** | **NotificationService.php Kernel.php** | Laravel Scheduler + FCM 알림 전송 로직 | 30분 |

| **⚠️ 9번(FCM 알림) 작업은 Firebase 콘솔 설정이 선행되어야 해요. 출시 준비 단계(v15)에서 진행하는 것을 권장해요. 지금은 8번(사업자 여부)까지만 구현하고 9번은 설계 메모로 남겨두세요.** |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성 — UI 버그 3건 |
| **v1.1** | 2026-04-27 | 항목 4 추가 — 공종/공정 통합 |
| **v1.2** | 2026-04-27 | 항목 5·6 추가 — 세금 표현 수정 + 3.3% 분리 |
| **v1.3** | 2026-04-27 | 항목 7 추가 — 원천징수 여부 토글 기능 신규 구현 |
| **v1.4** | 2026-04-27 | ★ 항목 8·9 추가. (8) 프로필 화면에 사업자 여부 라디오 버튼 추가 — DB 마이그레이션(is_business_owner) / User.php / ProfileScreen.tsx. (9) 종합소득세 신고 기간 FCM 푸시 알림 설계 — 5월 1일·25일·30일 3차 발송 / 개인사업자만 대상 / Laravel Scheduler + NotificationService / fcm_token 컬럼 추가 / 카카오 알림톡 유료 확장 방향 포함. 전체 작업 순서 확장. |

© 2026 Team Schedule Manager