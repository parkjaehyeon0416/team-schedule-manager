Team Schedule Manager  |  개발 매뉴얼 v5.3

**Team Schedule Manager**

**개발 매뉴얼 v5.3**

React Native 앱 설치·설정

작성일: 2026년 04월  |  최종 수정: 2026-04-22 (v5.3)  |  대상 OS: Windows 10/11

**★ v5.3 변경사항 (2026-04-22)**

- [신규 7장] App.tsx 루트 Provider 설정 — PaperProvider 래핑 필수

-        → react-native-paper의 Portal/Modal/Dialog 컴포넌트 사용 시 필수

-        → 누락 시 "wrap your root component with Provider" 오류 발생 (v7 캘린더 화면에서 실제 발생)

- [신규 7장] 올바른 Provider 래핑 순서 명시: GestureHandler → Paper → Navigation

**★ v5.2 변경사항 (2026-04-19)**

- [전체] RN 버전 표기 0.83 → 0.85.1 전체 통일

- [3.3절] --template 옵션 제거 (RN 0.71 이후 TypeScript 기본 포함)

- [4.2절] JDK 17 설치 절차 신규 추가

- [4.3절] react-native-gesture-handler 설치 추가, AsyncStorage @1.23.1 고정

- [9.1절] 포트 충돌 질문(8082 instead?) 대응 방법 추가

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js, MySQL Workbench | ✅ 완료 |
| v2 | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | Laravel 12, .env, Sanctum, ApiResponse | ✅ 완료 |
| v3 | DB 설계 및 마이그레이션 | 8개 테이블, Model, Seeder, SoftDeletes | ✅ 완료 |
| v4 | React 웹 관리자 설치·설정 | React 19 + TypeScript, Ant Design, TanStack Table | ✅ 완료 |
| v5 ◀ | React Native 앱 설치·설정 | ★ RN 0.85.1, Android 에뮬레이터, RN Paper, PaperProvider 래핑 | ▶ 현재 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, Sanctum 토큰, axios 인터셉터, 권한 미들웨어 | ✅ 완료 |
| v7 | 핵심 기능 API + 캘린더 뷰 | 스케줄 CRUD, 캘린더 커스텀 Day, 상세 화면 | ✅ 완료 |
| v8 | 배포 및 운영 자동화 | 카페24 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

- 1. Android Studio + 에뮬레이터 설치

- 2. JDK 17 설치 (Android 빌드 필수)

- 3. React Native 0.85.1 프로젝트 생성

- 4. 필수 라이브러리 14종 설치

- 5. 폴더 구조 생성 (api, navigation, screens, store, types)

- 6. App.tsx에 Provider 3중 래핑 ★ v5.3 신규

- 7. 에뮬레이터에서 앱 실행 확인

# **2. Android Studio + 에뮬레이터 설치**

## **2.4 Android 에뮬레이터(가상 기기) 생성**

- STEP 1. Android Studio 실행 → 우측 상단 "More Actions" → "Virtual Device Manager" 클릭

- STEP 2. "Create Device" 클릭

- STEP 3. 기기 선택: Pixel 7 선택 → Next

- STEP 4. 시스템 이미지 선택: API Level 34 (Android 14) → 아이콘 클릭하여 Download

- STEP 5. 다운로드 완료 후 이미지 선택

💡 시스템 이미지 다운로드 완료 후 Next 대신 Finish 버튼이 바로 활성화될 수 있습니다. 이것은 정상입니다 — 마지막 설정 단계이므로 바로 Finish를 클릭하면 완료됩니다.

- STEP 6. 생성된 에뮬레이터 ▶ 버튼 클릭 → 에뮬레이터 실행 확인

💡 에뮬레이터 창에 Android 홈 화면이 표시되면 성공! PowerShell에서 adb devices 실행 → 'emulator-5554   device' 출력되면 완벽!

# **3. React Native 0.85.1 프로젝트 생성**

## **3.2 Node.js 버전 확인 (v20 권장)**

React Native 0.85.1은 Node.js 18 이상이 필요합니다. 안정적인 개발을 위해 v20을 사용합니다.

node -v   # 버전 확인

# v20이 없으면:

nvm install 20

nvm use 20

node -v   # v20.x.x 출력되면 OK

## **3.3 React Native 프로젝트 생성 (★ 옵션 없이 실행)**

cd C:\project\team-schedule

# ★ --template 옵션 없이 실행! (RN 0.71 이후 TypeScript 기본 포함)

npx @react-native-community/cli@latest init app

⚠️ --template 옵션 붙이면 오류! 'Couldn't find template.config.js' 에러 발생. RN 0.71 이후 TypeScript가 기본 내장되어 옵션 불필요.

# **4. 라이브러리 설치**

## **4.2 JDK 17 설치 (Android 빌드 필수)**

React Native Android 빌드 시 Java(JDK)가 반드시 필요합니다. 없으면 'JAVA_HOME is not set' 오류가 발생합니다.

# JDK 17 설치

winget install Microsoft.OpenJDK.17

 

# 설치 완료 후 PowerShell 완전히 닫고 새로 열기!

 

# 설치 확인

echo $env:JAVA_HOME

# 예시: C:\Program Files\Microsoft\jdk-17.x.x.x-hotspot

⚠️ winget 오류 시 직접 다운로드 — https://adoptium.net 접속 → Temurin 17 (LTS) 다운로드 → 설치 옵션에서 'Set JAVA_HOME variable' 체크 필수!

## **4.3 라이브러리 설치**

⚠️ 두 가지 중요 사항 — ① react-native-gesture-handler 반드시 설치 (v6~v7 스와이프/드래그 필수) ② @react-native-async-storage 반드시 @1.23.1 버전 고정 (@latest는 Gradle 빌드 오류 발생)

cd C:\project\team-schedule\app

 

# ① React Navigation v7

npm install @react-navigation/native@7

npm install @react-navigation/bottom-tabs@7

npm install @react-navigation/native-stack@7

 

# ② Navigation 필수 의존성

npm install react-native-screens react-native-safe-area-context

npm install react-native-gesture-handler   # ★ 필수!

 

# ③ UI 컴포넌트

npm install react-native-paper

 

# ④ 아이콘

npm install react-native-vector-icons

 

# ⑤ 달력

npm install react-native-calendars

 

# ⑥ 앱 저장소 (★ 버전 고정!)

npm install @react-native-async-storage/async-storage@1.23.1

 

# ⑦ 파일 선택 / 사진 (v7 매뉴얼에서 설치)

# npm install @react-native-documents/picker

# npm install react-native-image-picker

 

# ⑧ 상태관리 / API / 날짜

npm install zustand

npm install @tanstack/react-query

npm install axios

npm install dayjs

## **4.4 라이브러리 역할 요약 (14종)**

| **라이브러리** | **역할** | **없으면?** |
| --- | --- | --- |
| @react-navigation/native | 앱 화면 전환 엔진 | 화면 이동 불가 |
| @react-navigation/bottom-tabs | 하단 탭 메뉴 | 바텀 탭 없음 |
| @react-navigation/native-stack | 스택 네비게이션 | 목록→상세 이동 불가 |
| react-native-screens | 화면 전환 성능 최적화 | 앱 느려짐 |
| react-native-safe-area-context | 노치·바텀바 처리 | 콘텐츠 가림 |
| ★ react-native-gesture-handler | 제스처 인식 | Navigation 오류 |
| react-native-paper | Material Design UI | UI 직접 구현 |
| react-native-vector-icons | 아이콘 2000개 | 아이콘 없음 |
| react-native-calendars | 달력 UI | 달력 직접 구현 |
| ★ @react-native-async-storage@1.23.1 | 앱 영구 저장소 | 앱 재시작 시 로그아웃 |
| zustand | 전역 상태 관리 | 상태 공유 불가 |
| @tanstack/react-query | API 데이터 캐시 | API 관리 복잡 |
| axios | HTTP 통신 | API 연동 불가 |
| dayjs | 날짜 포맷·계산 | 날짜 처리 복잡 |

# **5. 폴더 구조 생성**

app/src 폴더 아래에 기능별로 폴더를 만듭니다. 이 구조는 v6·v7에서 작성할 파일들의 기초가 됩니다.

cd C:\project\team-schedule\app\src

 

mkdir api           # Laravel API 요청 함수 (axiosInstance 등)

mkdir navigation    # 네비게이션 구조 (AppNavigator)

mkdir screens       # 화면 컴포넌트 (LoginScreen, HomeScreen 등)

mkdir store         # Zustand 전역 상태 (authStore)

mkdir types         # TypeScript 타입 정의

mkdir utils         # 공용 유틸 함수

💡 폴더 구조는 왜 이렇게 나누나요? 기능별 분리는 코드를 찾기 쉽게 해주고, 나중에 협업하거나 다른 컴퓨터로 옮길 때 구조가 일관돼요. 비슷한 파일들을 같은 폴더에 모아두는 것만으로도 유지보수가 훨씬 편해집니다.

# **6. 기본 화면 파일 생성 (뼈대)**

v6, v7에서 실제 기능을 채워 넣을 기본 화면 파일들을 먼저 만들어둡니다. 지금은 import 오류만 안 나면 OK.

## **6.1 screens/LoginScreen.tsx (임시)**

import React from 'react';

import { View, Text } from 'react-native';

 

export default function LoginScreen() {

  return (

    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

      <Text>로그인 화면 (v6에서 완성)</Text>

    </View>

  );

}

## **6.2 screens/HomeScreen.tsx, AttendanceScreen.tsx (임시)**

위와 동일한 패턴으로 HomeScreen, AttendanceScreen을 만들어주세요. 각각 "홈 화면", "근태 화면" 텍스트만 표시되면 됩니다.

## **6.3 store/authStore.ts (Zustand 기본 구조)**

import { create } from 'zustand';

import AsyncStorage from '@react-native-async-storage/async-storage';

 

interface User {

  id: number;

  name: string;

  email: string;

  role_id: number;

}

 

interface AuthState {

  user: User | null;

  token: string | null;

  isLoggedIn: boolean;

  setAuth: (user: User, token: string) => Promise<void>;

  logout: () => Promise<void>;

}

 

export const useAuthStore = create<AuthState>()(set => ({

  user: null,

  token: null,

  isLoggedIn: false,

 

  setAuth: async (user, token) => {

    await AsyncStorage.setItem('token', token);

    set({ user, token, isLoggedIn: true });

  },

 

  logout: async () => {

    await AsyncStorage.removeItem('token');

    set({ user: null, token: null, isLoggedIn: false });

  },

}));

## **6.4 navigation/AppNavigator.tsx (기본 스켈레톤)**

import React from 'react';

import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';

import HomeScreen from '../screens/HomeScreen';

import AttendanceScreen from '../screens/AttendanceScreen';

 

const Stack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

 

function MainTabs() {

  return (

    <Tab.Navigator>

      <Tab.Screen name="홈" component={HomeScreen} />

      <Tab.Screen name="근태" component={AttendanceScreen} />

    </Tab.Navigator>

  );

}

 

export default function AppNavigator() {

  const { isLoggedIn } = useAuthStore();

  return (

    <NavigationContainer>

      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {isLoggedIn ? (

          <Stack.Screen name="Main" component={MainTabs} />

        ) : (

          <Stack.Screen name="Login" component={LoginScreen} />

        )}

      </Stack.Navigator>

    </NavigationContainer>

  );

}

💡 v7에서 ScheduleDetail 화면이 추가될 예정입니다. 그때는 Stack.Screen을 하나 더 등록하게 됩니다.

# **7. App.tsx 루트 Provider 설정 ★ v5.3 신규**

**★ 이번 장의 중요성 — 없으면 v7에서 반드시 앱이 죽습니다!**

App.tsx는 앱 전체의 시작점이에요. 여기서 필요한 "Provider"들을 올바른 순서로 감싸야 앱이 정상 작동합니다.

⚠️ PaperProvider 누락 시 실제 발생 오류 — "Looks like you forgot to wrap your root component with Provider component from react-native-paper." v7 캘린더 화면에서 Portal 컴포넌트가 사용될 때 바로 발생합니다.

## **7.1 Provider란?**

React에서 Provider는 "앱 전체에 어떤 기능/정보를 공급해주는 공급자" 역할이에요. 마치 건물 전체에 전기를 공급하는 한전 같은 존재입니다.

| **Provider** | **역할** | **필수 여부** |
| --- | --- | --- |
| GestureHandlerRootView | 스와이프·드래그 제스처 처리 | ✅ 필수 (react-native-gesture-handler) |
| PaperProvider | Material Design 테마 + Portal/Modal 시스템 | ✅ 필수 (react-native-paper) |
| NavigationContainer | 화면 전환(네비게이션) 기능 공급 | ✅ 필수 (AppNavigator 내부에 있음) |

## **7.2 Provider 래핑 순서 (중요!)**

**★ 반드시 이 순서 — GestureHandler → Paper → Navigation**

각 Provider는 "자기 안쪽에 있는 컴포넌트들에게만" 기능을 제공해요. 순서를 바꾸면 특정 기능이 작동 안 할 수 있습니다.

올바른 양파 구조:

<GestureHandlerRootView>      ← 바깥: 제스처

  <PaperProvider>              ← 가운데: Paper UI

    <AppNavigator>             ← 안쪽: 네비게이션 + 모든 화면

      <NavigationContainer>

        <LoginScreen />

        <HomeScreen />

        ...

      </NavigationContainer>

    </AppNavigator>

  </PaperProvider>

</GestureHandlerRootView>

## **7.3 App.tsx 전체 코드**

프로젝트 루트의 App.tsx 파일을 아래 내용으로 작성하세요.

import React from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';

 

// ─────────────────────────────────────────

// App의 루트 컴포넌트

//

// GestureHandlerRootView:

//   gesture-handler 라이브러리의 필수 래퍼.

//   앱 최상단에 감싸야 스와이프·터치 제스처가 작동.

//

// PaperProvider:

//   react-native-paper의 테마·Portal·Modal 시스템 공급.

//   Portal, Modal, Dialog, Snackbar 등을 쓸 때 반드시 필요.

// ─────────────────────────────────────────

export default function App() {

  return (

    <GestureHandlerRootView style={{ flex: 1 }}>

      <PaperProvider>

        <AppNavigator />

      </PaperProvider>

    </GestureHandlerRootView>

  );

}

## **7.4 각 Provider 설명**

### **GestureHandlerRootView**

React Native는 기본적으로 제스처(스와이프, 드래그 등) 인식이 약해요. react-native-gesture-handler 라이브러리가 이를 보강해주는데, 앱 최상단을 이 컴포넌트로 감싸야 제대로 작동합니다.

style={{ flex: 1 }} 이 중요한데, 이게 없으면 앱 전체가 작은 영역에만 표시됩니다 (화면이 잘림).

### **PaperProvider**

react-native-paper 라이브러리의 컴포넌트(Button, Card, Modal, Dialog, Portal 등)를 사용하려면 반드시 필요합니다.

특히 Portal이라는 특별한 컴포넌트는 "어디서 선언하든 화면 최상단에 떠오르는 특별 구역"인데, 이걸 관리하는 컨트롤 타워가 바로 PaperProvider예요. 없으면 Portal을 쓰는 순간 크래시 발생.

💡 테마 커스터마이징도 가능 — PaperProvider에 theme prop을 전달하면 앱 전체 색상·폰트를 통일할 수 있어요. 지금은 기본 테마 사용.

### **NavigationContainer (AppNavigator 내부)**

React Navigation의 최상위 컨테이너. AppNavigator.tsx 안에 이미 들어있으니 App.tsx에서는 별도로 감싸지 않습니다.

## **7.5 자주 발생하는 Provider 관련 오류**

| **오류 메시지** | **원인** | **해결** |
| --- | --- | --- |
| Looks like you forgot to wrap your root component with Provider component from react-native-paper | PaperProvider 미설정 | App.tsx에 PaperProvider 추가 |
| PanGestureHandler must be used as a descendant of GestureHandlerRootView | GestureHandlerRootView 미설정 | App.tsx 최상단에 GestureHandlerRootView 추가 |
| Couldn't find a navigation context | NavigationContainer 미설정 | AppNavigator 안에 NavigationContainer 있는지 확인 |

# **8. 에뮬레이터에서 앱 실행 확인**

## **8.1 실행 순서**

- STEP 1. Android 에뮬레이터 실행 (Android Studio → Virtual Device Manager → ▶ 버튼)

- STEP 2. 에뮬레이터가 완전히 켜질 때까지 대기 (1~3분)

- STEP 3. PowerShell에서 실행:

cd C:\project\team-schedule\app

npx react-native run-android

# BUILD SUCCESSFUL + 에뮬레이터에 앱 화면이 뜨면 성공!

⚠️ 포트 충돌 질문이 뜰 경우 — 'Another process is running on port 8081. Use port 8082 instead?' 메시지는 이전 Metro 서버가 실행 중이어서 발생. Yes가 선택된 상태에서 Enter 누르면 됨.

💡 첫 빌드는 10~20분 소요됩니다. Gradle이 필요한 도구를 모두 다운로드하기 때문. 빌드 중 IDLE 메시지가 여러 개 나오는 것은 정상. 이후 빌드는 2~3분으로 단축됩니다.

## **8.2 자주 발생하는 오류와 해결 방법**

| **오류 메시지** | **원인** | **해결 방법** |
| --- | --- | --- |
| error: no connected devices | 에뮬레이터 미실행 | Android Studio에서 에뮬레이터 먼저 실행 |
| SDK location not found | ANDROID_HOME 환경변수 미설정 | 2.3절 환경 변수 설정 재확인 |
| JAVA_HOME is not set | JDK 17 미설치 또는 환경변수 없음 | 4.2절 JDK 17 설치 후 PowerShell 재시작 |
| Could not find ... storage-android:1.0.0 | AsyncStorage @latest 버전 충돌 | 4.3절: @1.23.1 버전으로 재설치 |
| Couldn't find template.config.js | --template 옵션 사용 오류 | 3.3절: 옵션 없이 init app만 실행 |
| GestureHandler not found | gesture-handler 미설치 | npm install react-native-gesture-handler |
| Unable to resolve module | 라이브러리 설치 안 됨 | npm install 재실행 후 Metro 재시작 |
| Gradle build failed | Android 빌드 오류 | cd android → .\gradlew clean → 재실행 |
| wrap your root component with Provider | PaperProvider 미설정 ★ v5.3 | 7장 참조 — App.tsx에 PaperProvider 래핑 |

# **9. 설치 완료 최종 점검 체크리스트**

| **항목** | **확인 방법** | **상태** |
| --- | --- | --- |
| Android Studio 설치됨 | Virtual Device Manager 열림 | [ ] |
| JDK 17 설치됨 | echo $env:JAVA_HOME → 경로 표시 | [ ] |
| Node.js v20 설치됨 | node -v → v20.x.x | [ ] |
| app 폴더 생성됨 (RN 0.85.1) | cd app → ls → package.json 존재 | [ ] |
| 라이브러리 14종 설치됨 | npm list --depth=0 | [ ] |
| gesture-handler 설치 확인 ★ | node_modules/react-native-gesture-handler 존재 | [ ] |
| AsyncStorage @1.23.1 고정 ★ | package.json에 정확한 버전 표기 | [ ] |
| 폴더 구조 생성 (api, screens 등) | ls src → 6개 폴더 존재 | [ ] |
| authStore.ts 생성 | src/store/authStore.ts 존재 | [ ] |
| AppNavigator.tsx 생성 | src/navigation/AppNavigator.tsx 존재 | [ ] |
| App.tsx Provider 래핑 ★ v5.3 신규 | App.tsx에 GestureHandler + PaperProvider + AppNavigator 순서 | [ ] |
| 에뮬레이터에서 앱 실행 성공 | BUILD SUCCESSFUL + 앱 화면 표시 | [ ] |

# **10. 다음 단계 안내 (v6 예고)**

| **v6에서 할 일** | **목적** |
| --- | --- |
| routes/api.php 라우트 설계 | API 엔드포인트 정의 + 권한별 분리 |
| AuthController (로그인/회원가입/내 정보) | Sanctum 토큰 발급 및 검증 |
| axios 인터셉터 설정 | 토큰 자동 첨부 + 401 처리 |
| CorsMiddleware, RoleMiddleware | CORS 허용 + 권한별 접근 제어 |
| 웹 로그인 + 앱 로그인 연동 | 실제 API 호출로 로그인 작동 확인 |

— v5 React Native 앱 설치·설정 완료 —

다음: 개발 매뉴얼 v6 — API 라우팅 + 인증 구현

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v5.0 | 2026-04-19 | 최초 작성 — React Native 0.83 앱 설치·설정 |
| v5.1 | 2026-04-19 | 전체 코드 블록 깨짐 수정 |
| v5.2 | 2026-04-19 | RN 0.83→0.85.1, --template 옵션 제거, JDK 17 추가, gesture-handler 추가, AsyncStorage @1.23.1 고정, 오류 해결 표 확장 |
| v5.3 | 2026-04-22 | [신규 7장] App.tsx Provider 3중 래핑 설정 — GestureHandlerRootView + PaperProvider + AppNavigator 순서로 감싸기 필수. v7 캘린더에서 Portal 사용 시 PaperProvider 누락 오류 방지. [8.2절] Provider 관련 오류 해결 항목 추가. [9장] 체크리스트에 Provider 래핑 항목 추가. |

© 2026 Team Schedule Manager

-  -