Team Schedule Manager

**개발 매뉴얼 v4.3**

React 웹 관리자 설치·설정

작성일: 2026년 04월  |  최종 수정: 2026-04-19 (v4.3)  |  대상 OS: Windows 10/11

**★ v4.3 변경사항 (2026-04-19)**

[10장] 누락된 페이지 파일 코드 전체 추가 — 실제 개발 시 오류 발생으로 인한 보완

  • Sites.tsx — 현장 목록 페이지 뼈대 코드 신규 추가

  • SiteDetail.tsx — 현장 상세 페이지 뼈대 코드 신규 추가

  • Attendance.tsx — 근태 현황 페이지 뼈대 코드 신규 추가

  • Schedule.tsx — FullCalendar 버전과 뼈대 버전 두 가지 모두 제공

[11장] Teams.tsx import 오류 수정 — ColumnDef를 import type으로 변경

  이유: ColumnDef는 '타입(Type)'이므로 일반 import 대신 import type 사용 필요

[5장] .env 파일 생성 방법 설명 추가 (기존 매뉴얼에서 생성 방법 누락)

[4장] utils/format.ts 파일 코드 추가 (언급만 되고 코드 없던 문제 해결)

**★ v4.2 변경사항 (2026-04-19)**

[3장] Toast UI Grid 4.x → TanStack Table v8 로 교체 (React 19 호환 문제 해결)

[3장] 라이브러리 비교표 (Toast UI Grid vs TanStack Table) 신규 추가

[11장] TanStack Table 사용 예시 코드 신규 추가 / [15장] 체크리스트 수정

**★ v4.1 변경사항**

[전체] Laravel 포트 번호 수정: 8080 → 8000 (php artisan serve 기본 포트 반영)

# **전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | Laragon, VSCode, Git, Node.js, MySQL Workbench, Composer | **✅ 완료** |
| v2 | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | 폴더 구조, Laravel 12 설치, .env, Sanctum, DB 연결, ApiResponse, Git Push/Pull | **✅ 완료** |
| v3 | DB 설계 및 마이그레이션 | 기획서 v1.4 테이블 생성, Model 생성, Seeder | **✅ 완료** |
| **v4 ◀** | **React 웹 관리자 설치·설정 ← 현재** | React 19 + TypeScript, Ant Design, FullCalendar, TanStack Table v8, API 연동 기초 | **▶ 현재** |
| v5 | React Native 앱 설치·설정 | RN 0.83, Android 에뮬레이터, RN Paper, React Navigation | ⏳ 예정 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, Sanctum 토큰, 권한 미들웨어 | ⏳ 예정 |
| v7 | 핵심 기능 API 개발 | 스케줄·현장·근태 CRUD API, 파일 업로드, 집계 통계 | ⏳ 예정 |
| v8 | 배포 및 운영 자동화 | 카페24 이지업 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

**📋 v4에서 할 일 목록**

- frontend 폴더에 React 19 + TypeScript 프로젝트 생성

- React Router v7 설치 및 라우팅 구조 설정

- Ant Design 5.x 설치 (폼·레이아웃 UI)

- FullCalendar 6.x 설치 (스케줄 달력)

- ⭐ TanStack Table v8 설치 (관리자 목록 테이블 — React 19 완벽 지원)

- Axios + TanStack Query 설치 (Laravel API 데이터 연동 기초)

- Zustand 5.x 설치 (전역 상태 관리)

- 관리자 레이아웃 뼈대 화면 구성

- 로그인 화면 (UI만 — API 연동은 v6에서)

- 개발 서버 동시 실행 확인 (Laravel 8000 + React 3000)

# **2. React 프로젝트 생성**

## **2.1 React란 무엇인가요?**

React는 Facebook(Meta)이 만든 화면(UI) 제작 도구입니다. 웹 페이지의 버튼, 표, 달력 같은 요소를 '컴포넌트'라는 조각으로 만들어 조립하는 방식으로 개발합니다.

**💡 레고 비유**

레고 블록(컴포넌트) 하나하나를 만들어 조립하면 완성된 건물(화면)이 됩니다.

예를 들어 [로그인 버튼], [메뉴 바], [달력]이 각각 하나의 컴포넌트입니다.

한번 만든 컴포넌트는 여러 페이지에서 재사용할 수 있어요.

## **2.2 TypeScript란?**

TypeScript는 JavaScript에 '타입(자료형)'을 추가한 언어입니다. 숫자를 받아야 하는 곳에 문자열을 넣으면 코드 작성 단계에서 즉시 오류를 알려줍니다.

## **2.3 프로젝트 생성 명령어**

Laragon Terminal 또는 VSCode 터미널을 열고 아래 명령어를 실행하세요.

# ① frontend 폴더로 이동

cd C:\project\team-schedule

# ② React + TypeScript 프로젝트 생성 (Vite 사용)

npm create vite@latest frontend -- --template react-ts

# ③ frontend 폴더로 이동

cd frontend

# ④ 기본 패키지 설치

npm install

# ⑤ 개발 서버 실행 테스트

npm run dev

# 브라우저에서 http://localhost:5173 접속 → React 로고 화면이 나오면 성공!

## **2.4 포트 번호 변경 (5173 → 3000)**

기본 포트 5173은 낯선 번호이므로 3000으로 변경합니다. vite.config.ts 파일을 아래처럼 수정합니다.

// frontend/vite.config.ts

import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'

export default defineConfig({

  plugins: [react()],

  server: {

    port: 3000,    // 포트를 3000으로 변경

    open: true,    // 서버 시작 시 브라우저 자동 열기

    proxy: {

      '/api': {

        target: 'http://localhost:8000',

        changeOrigin: true,

      },

    },

  },

})

**💡 proxy 설정이란?**

React(3000번)와 Laravel(8000번)은 서로 다른 포트에서 실행됩니다.

브라우저는 보안상 다른 포트로 데이터를 직접 요청하면 차단(CORS 오류)합니다.

proxy 설정을 하면 /api/... 요청 시 자동으로 8000 Laravel 서버로 전달해줍니다.

마치 '중간 우편배달부' 역할입니다.

# **3. 라이브러리 설치**

## **3.1 라이브러리란?**

라이브러리는 남들이 미리 만들어둔 기능 묶음입니다. 달력, 표, 폼 같은 것을 처음부터 만들면 몇 달이 걸리지만, 라이브러리를 가져다 쓰면 몇 줄로 완성됩니다.

## **3.2 ⭐ Toast UI Grid → TanStack Table 교체 이유**

기존 매뉴얼에서는 Toast UI Grid 4.x를 사용하려 했으나, 설치 시 아래 오류가 발생합니다:

**❌ 발생 오류**

npm error ERESOLVE unable to resolve dependency tree

npm error peer react@'^16.7.0 || ^17.0.0' from @toast-ui/react-grid

npm error Found: react@19.2.5

원인: Toast UI Grid 4.x는 React 16 또는 17만 지원합니다. 이 프로젝트는 React 19를 사용하므로 근본적으로 호환되지 않습니다.

따라서 React 19를 완벽 지원하는 TanStack Table v8로 교체합니다:

| **비교 항목** | **Toast UI Grid 4.x (기존)** | **TanStack Table v8 (교체)** |
| --- | --- | --- |
| React 19 지원 | **❌ 안됨** | **✅ 완벽 지원** |
| 무료 여부 | ✅ 무료 | ✅ 무료 |
| 유지보수 상태 | 🔶 업데이트 느림 | **✅ 매우 활발** |
| 설치 난이도 | **❌ React 19 충돌** | **✅ 즉시 설치 가능** |

## **3.3 한번에 설치하기**

frontend 폴더에서 아래 명령어를 차례로 실행하세요.

cd C:\project\team-schedule\frontend

# ① React Router v7

npm install react-router-dom@7

# ② Ant Design 5.x

npm install antd@5

# ③ Ant Design 아이콘 팩 (★ 별도 설치 필수)

npm install @ant-design/icons

# ④ FullCalendar 6.x

npm install @fullcalendar/react @fullcalendar/core

npm install @fullcalendar/daygrid @fullcalendar/timegrid

npm install @fullcalendar/interaction

# ⑤ TanStack Table v8 (Toast UI Grid 대체)

npm install @tanstack/react-table@8

# ⑥ Axios

npm install axios@1

# ⑦ TanStack Query 5.x

npm install @tanstack/react-query@5

# ⑧ Zustand 5.x

npm install zustand@5

# ⑨ react-hook-form 7.x

npm install react-hook-form@7

# ⑩ dayjs

npm install dayjs

# 설치 완료 확인

npm list --depth=0

## **3.4 설치된 라이브러리 역할 요약**

| **라이브러리** | **버전** | **역할 (쉬운 설명)** | **없으면?** |
| --- | --- | --- | --- |
| react-router-dom | v7 | /login, /schedule 등 주소별 화면 전환 | 주소 바꿔도 화면 안 바뀜 |
| antd (Ant Design) | v5 | 버튼·폼·모달·레이아웃 UI 세트 | UI 처음부터 직접 만들어야 함 |
| @ant-design/icons | 최신 | Ant Design용 아이콘 2000여개 모음 | 아이콘 사용 불가 |
| @fullcalendar/react | v6 | 스케줄 달력 — 월/주/일 뷰 제공 | 달력 직접 구현 매우 복잡 |
| **@tanstack/react-table ⭐** | v8 | 엑셀형 관리자 테이블 (React 19 완벽 지원) | Toast UI Grid 대체 |
| axios | v1 | Laravel API 서버에 데이터 요청·응답 | 직접 fetch() 작성 필요 |
| @tanstack/react-query | v5 | API 데이터 캐시·로딩·오류 자동 관리 | 매번 로딩 상태 직접 관리 |
| zustand | v5 | 로그인 정보 등 앱 전체 공유 데이터 관리 | 컴포넌트 간 데이터 전달 복잡 |
| react-hook-form | v7 | 로그인·현장 등록 폼 입력값·유효성 관리 | 폼 구현 매우 복잡 |
| dayjs | v1 | 날짜 포맷 변환 (2026-04-19 → 4월 19일) | JS 기본 Date 사용 불편 |

# **4. 폴더 구조 및 파일 정리**

## **4.1 src 폴더 구조 설계**

React 프로젝트 생성 후 src 폴더에 아래처럼 하위 폴더를 만듭니다.

frontend/

├── public/

│   └── favicon.ico

├── src/

│   ├── api/              ← Laravel API 요청 함수 모음

│   │   ├── auth.ts       ← 로그인·로그아웃 API

│   │   ├── axiosInstance.ts  ← Axios 공통 설정

│   │   ├── schedule.ts   ← 일정 API

│   │   ├── site.ts       ← 현장 API

│   │   └── attendance.ts ← 근태 API

│   ├── components/

│   │   ├── Layout/       ← 관리자 전체 레이아웃

│   │   └── common/       ← 공통 버튼, 모달 등

│   ├── pages/            ← 각 화면(페이지) 컴포넌트

│   │   ├── Login.tsx

│   │   ├── Dashboard.tsx

│   │   ├── Schedule.tsx

│   │   ├── Sites.tsx

│   │   ├── SiteDetail.tsx

│   │   ├── Teams.tsx

│   │   └── Attendance.tsx

│   ├── store/

│   │   └── authStore.ts

│   ├── types/

│   │   └── index.ts

│   ├── utils/

│   │   └── format.ts     ← ★ 날짜·숫자 포맷 공통 함수

│   ├── App.tsx

│   └── main.tsx

├── .env                  ← ★ 직접 생성 필요 (자동 생성 안 됨)

├── vite.config.ts

└── package.json

## **4.2 폴더 생성 명령어**

cd C:\project\team-schedule\frontend\src

mkdir api

mkdir components

mkdir components\Layout

mkdir components\common

mkdir pages

mkdir store

mkdir types

mkdir utils

## **4.3 utils/format.ts 생성 ★ v4.3 신규**

**★ v4.3 추가 — 기존 매뉴얼에서 파일 언급만 되고 코드가 없었던 부분 보완**

utils/format.ts는 날짜, 숫자 등 여러 페이지에서 공통으로 쓰는 변환 함수를 모아두는 파일입니다.

**💡 왜 공통 파일을 만드나요?**

'2026-04-19'를 '4월 19일'로 바꾸는 코드가 여러 페이지에 필요하다면,

각 페이지마다 똑같이 쓰는 것보다 한 곳에 모아두고 가져다 쓰는 게 편리합니다.

마치 공용 도구함에서 필요한 공구를 꺼내 쓰는 것과 같습니다.

// frontend/src/utils/format.ts

import dayjs from 'dayjs'

// 날짜 포맷 변환

// 사용 예: formatDate('2026-04-19') → '2026-04-19'

export const formatDate = (date: string): string => {

  return dayjs(date).format('YYYY-MM-DD')

}

// 날짜+시간 포맷 변환

// 사용 예: formatDateTime('2026-04-19T09:00:00') → '2026-04-19 09:00'

export const formatDateTime = (datetime: string): string => {

  return dayjs(datetime).format('YYYY-MM-DD HH:mm')

}

// 시간만 표시

// 사용 예: formatTime('2026-04-19 09:00:00') → '09:00'

export const formatTime = (datetime: string): string => {

  return dayjs(datetime).format('HH:mm')

}

// 월 표시

// 사용 예: formatMonth('2026-04-19') → '2026년 4월'

export const formatMonth = (date: string): string => {

  return dayjs(date).format('YYYY년 M월')

}

# **5. 기본 설정 파일 작성**

## **5.1 main.tsx — 앱 시작점**

main.tsx는 React 앱이 처음 실행될 때 시작되는 파일입니다.

// frontend/src/main.tsx

import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ConfigProvider } from 'antd'

import koKR from 'antd/locale/ko_KR'

import App from './App'

const queryClient = new QueryClient({

  defaultOptions: {

    queries: {

      staleTime: 1000 * 60 * 5,  // 5분

      retry: 1,

    },

  },

})

createRoot(document.getElementById('root')!).render(

  <StrictMode>

    <QueryClientProvider client={queryClient}>

      <ConfigProvider locale={koKR}>

        <App />

      </ConfigProvider>

    </QueryClientProvider>

  </StrictMode>

)

## **5.2 App.tsx — 라우팅 설정**

// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import AdminLayout from './components/Layout/AdminLayout'

import Login from './pages/Login'

import Dashboard from './pages/Dashboard'

import Schedule from './pages/Schedule'

import Sites from './pages/Sites'

import SiteDetail from './pages/SiteDetail'

import Teams from './pages/Teams'

import Attendance from './pages/Attendance'

import { useAuthStore } from './store/authStore'

export default function App() {

  const { isLoggedIn } = useAuthStore()

  return (

    <BrowserRouter>

      <Routes>

        <Route path='/login' element={<Login />} />

        <Route

          path='/'

          element={isLoggedIn ? <AdminLayout /> : <Navigate to='/login' />}

        >

          <Route index element={<Dashboard />} />

          <Route path='schedule' element={<Schedule />} />

          <Route path='sites' element={<Sites />} />

          <Route path='sites/:id' element={<SiteDetail />} />

          <Route path='teams' element={<Teams />} />

          <Route path='attendance' element={<Attendance />} />

        </Route>

      </Routes>

    </BrowserRouter>

  )

}

## **5.3 .env 파일 생성 ★ v4.3 보완**

**★ v4.3 추가 — 기존 매뉴얼에서 생성 방법이 누락되어 있었습니다**

**⚠️ 주의: .env 파일은 프로젝트 생성 시 자동으로 만들어지지 않습니다. 직접 생성해야 합니다!**

**방법 1: VSCode에서 직접 만들기 (권장)**

- VSCode 왼쪽 파일 목록에서 frontend 폴더 클릭

- 상단 새 파일 아이콘 클릭 (또는 폴더 우클릭 → New File)

- 파일명: .env 입력 후 Enter

- 아래 내용 붙여넣고 Ctrl+S 저장

**방법 2: 터미널에서 만들기**

cd C:\project\team-schedule\frontend

echo. > .env

**.env 파일 내용**

# frontend/.env

VITE_API_URL=http://localhost:8000

VITE_APP_ENV=development

**⚠️ VITE_ 접두어가 중요합니다!**

Vite에서 환경 변수를 코드에서 사용하려면 반드시 VITE_로 시작해야 합니다.

비유: 편지봉투에 'VITE_' 수신인 표시가 없으면 배달이 안 되는 것과 같습니다.

.env 파일은 절대 GitHub에 올리면 안 됩니다 — .gitignore에 포함되어 있습니다.

# **6. Zustand — 전역 상태 관리**

## **6.1 Zustand란?**

Zustand는 앱 전체에서 공유해야 하는 데이터(로그인 정보, 사용자 권한 등)를 저장하는 '공용 서랍장'입니다.

**💡 Zustand 비유**

Zustand 없이: 로그인 정보를 A화면→B화면→C화면으로 하나하나 들고 다녀야 함

Zustand 있을 때: 공용 서랍장에 넣어두고, 어느 화면에서든 꺼내서 쓰면 됨

## **6.2 authStore.ts 생성**

// frontend/src/store/authStore.ts

import { create } from 'zustand'

import { persist } from 'zustand/middleware'

interface User {

  id: number

  name: string

  email: string

  role: string

}

interface AuthState {

  user: User | null

  token: string | null

  isLoggedIn: boolean

  setAuth: (user: User, token: string) => void

  clearAuth: () => void

}

export const useAuthStore = create<AuthState>()(

  persist(

    (set) => ({

      user: null,

      token: null,

      isLoggedIn: false,

      setAuth: (user, token) => set({ user, token, isLoggedIn: true }),

      clearAuth: () => set({ user: null, token: null, isLoggedIn: false }),

    }),

    { name: 'auth-storage' }

  )

)

# **7. Axios 설정 — API 통신 기초**

## **7.1 axiosInstance.ts 생성**

매번 API 호출 시 서버 주소, 토큰, 오류 처리를 반복하지 않도록 공통 설정 파일을 만듭니다.

// frontend/src/api/axiosInstance.ts

import axios from 'axios'

import { useAuthStore } from '../store/authStore'

const axiosInstance = axios.create({

  baseURL: import.meta.env.VITE_API_URL,

  timeout: 10000,

  headers: {

    'Content-Type': 'application/json',

    'Accept': 'application/json',

  },

})

// 요청 인터셉터: 토큰 자동 추가

axiosInstance.interceptors.request.use((config) => {

  const token = useAuthStore.getState().token

  if (token) config.headers.Authorization = `Bearer ${token}`

  return config

})

// 응답 인터셉터: 401 오류 시 자동 로그아웃

axiosInstance.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response?.status === 401) {

      useAuthStore.getState().clearAuth()

      window.location.href = '/login'

    }

    return Promise.reject(error)

  }

)

export default axiosInstance

# **8. 관리자 레이아웃 (AdminLayout)**

## **8.1 AdminLayout.tsx 생성**

// frontend/src/components/Layout/AdminLayout.tsx

import { Outlet, useNavigate, useLocation } from 'react-router-dom'

import { Layout, Menu, Button, Avatar, Typography, Space } from 'antd'

import {

  CalendarOutlined, HomeOutlined, ShopOutlined,

  TeamOutlined, ClockCircleOutlined, LogoutOutlined

} from '@ant-design/icons'

import { useAuthStore } from '../../store/authStore'

const { Sider, Header, Content } = Layout

export default function AdminLayout() {

  const navigate = useNavigate()

  const location = useLocation()

  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {

    clearAuth()

    navigate('/login')

  }

  const menuItems = [

    { key: '/',           icon: <HomeOutlined />,        label: '대시보드' },

    { key: '/schedule',   icon: <CalendarOutlined />,    label: '스케줄 관리' },

    { key: '/sites',      icon: <ShopOutlined />,        label: '현장 목록' },

    { key: '/teams',      icon: <TeamOutlined />,        label: '팀/팀원 관리' },

    { key: '/attendance', icon: <ClockCircleOutlined />, label: '근태 현황' },

  ]

  return (

    <Layout style={{ minHeight: '100vh' }}>

      <Sider width={220} theme='dark'>

        <div style={{ padding: '20px 16px', color: 'white', fontWeight: 'bold' }}>

          📋 Team Schedule

        </div>

        <Menu

          theme='dark' mode='inline'

          selectedKeys={[location.pathname]}

          items={menuItems}

          onClick={({ key }) => navigate(key)}

        />

      </Sider>

      <Layout>

        <Header style={{ background: 'white', padding: '0 24px',

                         display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <Typography.Text strong>Team Schedule Manager 관리자</Typography.Text>

          <Space>

            <Avatar>{user?.name?.[0]}</Avatar>

            <Typography.Text>{user?.name}</Typography.Text>

            <Button icon={<LogoutOutlined />} onClick={handleLogout}>로그아웃</Button>

          </Space>

        </Header>

        <Content style={{ margin: '24px', background: 'white', padding: '24px', borderRadius: 8 }}>

          <Outlet />

        </Content>

      </Layout>

    </Layout>

  )

}

# **9. 로그인 화면 구현**

## **9.1 pages/Login.tsx 생성**

로그인 화면을 만듭니다. 이 단계에서는 UI만 구성하고, 실제 API 연동은 v6에서 완성합니다.

// frontend/src/pages/Login.tsx

import { Form, Input, Button, Card, Typography, message } from 'antd'

import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'

export default function Login() {

  const navigate = useNavigate()

  const { setAuth } = useAuthStore()

  const [form] = Form.useForm()

  const onFinish = (values: { email: string; password: string }) => {

    // ★ 임시 처리 — v6에서 실제 API 호출로 교체

    if (values.email === 'admin@test.com' && values.password === '1234') {

      setAuth({ id: 1, name: '테스트관리자', email: values.email, role: 'superadmin' }, 'temp-token')

      message.success('로그인 성공!')

      navigate('/')

    } else {

      message.error('이메일 또는 비밀번호를 확인해주세요.')

    }

  }

  return (

    <div style={{ minHeight: '100vh', display: 'flex',

                  justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>

      <Card style={{ width: 400 }}>

        <Typography.Title level={3} style={{ textAlign: 'center' }}>📋 Team Schedule</Typography.Title>

        <Form form={form} layout='vertical' onFinish={onFinish}>

          <Form.Item label='이메일' name='email'

            rules={[{ required: true }, { type: 'email' }]}>

            <Input placeholder='admin@test.com' size='large' />

          </Form.Item>

          <Form.Item label='비밀번호' name='password'

            rules={[{ required: true }]}>

            <Input.Password placeholder='비밀번호 입력' size='large' />

          </Form.Item>

          <Button type='primary' htmlType='submit' size='large' block>

            로그인

          </Button>

        </Form>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#999' }}>

          테스트 계정: admin@test.com / 1234

        </p>

      </Card>

    </div>

  )

}

# **10. 페이지 파일 전체 생성 ★ v4.3 신규 추가**

**★ v4.3 신규 추가 — 기존 매뉴얼에서 아래 파일들의 실제 코드가 누락되어 있었습니다.**

App.tsx에서 import하는 모든 페이지 파일이 반드시 존재해야 합니다.

파일이 없거나 export default가 없으면 브라우저에서 빨간 오류가 발생합니다.

**⚠️ 실제 발생 오류 (파일 누락 시)**

Uncaught SyntaxError: The requested module '/src/pages/Attendance.tsx'

does not provide an export named 'default'

아래 7개 페이지 파일을 모두 생성해주세요. 지금은 화면이 뜨는 '뼈대'만 만들고,

실제 기능(API 연동, 데이터 표시)은 v6, v7에서 채워 넣습니다.

## **10.1 pages/Dashboard.tsx**

// frontend/src/pages/Dashboard.tsx

import { Typography, Card, Row, Col, Statistic } from 'antd'

import { TeamOutlined, CalendarOutlined, ShopOutlined } from '@ant-design/icons'

export default function Dashboard() {

  return (

    <div>

      <Typography.Title level={4}>대시보드</Typography.Title>

      <Row gutter={[16, 16]}>

        <Col span={8}>

          <Card><Statistic title='오늘 현장 수' value={0} prefix={<ShopOutlined />} /></Card>

        </Col>

        <Col span={8}>

          <Card><Statistic title='이번 달 일정' value={0} prefix={<CalendarOutlined />} /></Card>

        </Col>

        <Col span={8}>

          <Card><Statistic title='전체 팀원' value={0} prefix={<TeamOutlined />} /></Card>

        </Col>

      </Row>

    </div>

  )

}

## **10.2 pages/Schedule.tsx**

FullCalendar 달력을 표시하는 스케줄 관리 화면입니다.

// frontend/src/pages/Schedule.tsx

import { Typography } from 'antd'

import FullCalendar from '@fullcalendar/react'

import dayGridPlugin from '@fullcalendar/daygrid'

import interactionPlugin from '@fullcalendar/interaction'

import koLocale from '@fullcalendar/core/locales/ko'

export default function Schedule() {

  return (

    <div>

      <Typography.Title level={4}>스케줄 관리</Typography.Title>

      <FullCalendar

        plugins={[dayGridPlugin, interactionPlugin]}

        initialView='dayGridMonth'

        locale={koLocale}

        events={[

          { title: '강남구 OO아파트', date: '2026-04-20', color: '#1E88E5' },

          { title: '서초구 XX빌라',  date: '2026-04-22', color: '#43A047' },

        ]}

        dateClick={(info) => alert(`${info.dateStr} 클릭!`)}

        height='auto'

      />

    </div>

  )

}

## **10.3 pages/Sites.tsx ★ v4.3 신규**

**★ v4.3 신규 추가 — 기존 매뉴얼에서 코드 완전 누락**

// frontend/src/pages/Sites.tsx

import { Typography, Card, Empty } from 'antd'

import { ShopOutlined } from '@ant-design/icons'

export default function Sites() {

  return (

    <div>

      <Typography.Title level={4}>

        <ShopOutlined style={{ marginRight: 8 }} />

        현장 목록

      </Typography.Title>

      <Card>

        {/* v7에서 실제 현장 목록 API 연동 예정 */}

        <Empty description='현장 데이터를 불러오는 중...' />

      </Card>

    </div>

  )

}

## **10.4 pages/SiteDetail.tsx ★ v4.3 신규**

**★ v4.3 신규 추가 — 기존 매뉴얼에서 코드 완전 누락**

useParams()는 주소창의 :id 값을 읽어오는 함수입니다.

예: /sites/5 → id = '5'

// frontend/src/pages/SiteDetail.tsx

import { Typography, Card, Descriptions, Empty } from 'antd'

import { useParams } from 'react-router-dom'

export default function SiteDetail() {

  // useParams: 주소창의 :id 값을 읽어오는 함수

  // 예) /sites/5 로 접속하면 id = '5'

  const { id } = useParams()

  return (

    <div>

      <Typography.Title level={4}>현장 상세 (ID: {id})</Typography.Title>

      <Card>

        <Descriptions title='현장 정보' bordered>

          <Descriptions.Item label='현장명'>-</Descriptions.Item>

          <Descriptions.Item label='주소'>-</Descriptions.Item>

          <Descriptions.Item label='동/호수'>-</Descriptions.Item>

          <Descriptions.Item label='면적'>-</Descriptions.Item>

        </Descriptions>

        {/* v7에서 실제 현장 상세 API 연동 예정 */}

        <Empty description='파일 첨부 기능은 v7에서 구현 예정' style={{ marginTop: 24 }} />

      </Card>

    </div>

  )

}

## **10.5 pages/Attendance.tsx ★ v4.3 신규**

**★ v4.3 신규 추가 — 기존 매뉴얼에서 코드 완전 누락**

// frontend/src/pages/Attendance.tsx

import { Typography, Card, Empty } from 'antd'

import { ClockCircleOutlined } from '@ant-design/icons'

export default function Attendance() {

  return (

    <div>

      <Typography.Title level={4}>

        <ClockCircleOutlined style={{ marginRight: 8 }} />

        근태 현황

      </Typography.Title>

      <Card>

        {/* v7에서 실제 근태 현황 API 연동 예정 */}

        <Empty description='근태 데이터를 불러오는 중...' />

      </Card>

    </div>

  )

}

# **11. FullCalendar 달력 + TanStack Table 테이블**

## **11.1 pages/Teams.tsx — TanStack Table 적용 ★ import 오류 수정**

**★ v4.3 수정 — ColumnDef import 방식 오류 수정 (실제 발생한 오류 반영)**

**❌ 기존 코드 (오류 발생)**

import {

  useReactTable,

  getCoreRowModel,

  flexRender,

  ColumnDef,   // ← 이렇게 하면 오류 발생!

} from '@tanstack/react-table'

**✅ 수정된 코드 (정상 동작)**

import {

  useReactTable,

  getCoreRowModel,

  flexRender,

} from '@tanstack/react-table'

import type { ColumnDef } from '@tanstack/react-table'   // ← import type 사용!

**💡 왜 import type을 써야 하나요?**

ColumnDef는 실제 실행되는 '코드'가 아니라 TypeScript가 오류를 잡아주는 '설계 도면(타입)'입니다.

일반 import는 실제 코드를, import type은 설계 도면만 가져올 때 사용합니다.

비유: 실제 망치(코드)와 망치 사용 설명서(타입)를 같은 방법으로 가져오면 안 됩니다.

아래는 수정된 Teams.tsx 전체 코드입니다:

// frontend/src/pages/Teams.tsx

import { Typography } from 'antd'

import {

  useReactTable,

  getCoreRowModel,

  flexRender,

} from '@tanstack/react-table'

import type { ColumnDef } from '@tanstack/react-table'

type TeamMember = {

  id: number

  name: string

  email: string

  role: string

}

const dummyData: TeamMember[] = [

  { id: 1, name: '홍길동팀장', email: 'manager@test.com', role: '팀장' },

  { id: 2, name: '김팀원',    email: 'member@test.com',  role: '팀원' },

]

const columns: ColumnDef<TeamMember>[] = [

  { accessorKey: 'id',    header: 'ID' },

  { accessorKey: 'name',  header: '이름' },

  { accessorKey: 'email', header: '이메일' },

  { accessorKey: 'role',  header: '역할' },

]

export default function Teams() {

  const table = useReactTable({

    data: dummyData,

    columns,

    getCoreRowModel: getCoreRowModel(),

  })

  return (

    <div>

      <Typography.Title level={4}>팀/팀원 관리</Typography.Title>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>

        <thead>

          {table.getHeaderGroups().map(headerGroup => (

            <tr key={headerGroup.id}>

              {headerGroup.headers.map(header => (

                <th key={header.id}

                  style={{ border: '1px solid #ddd', padding: '8px 12px',

                           background: '#1F3864', color: 'white', textAlign: 'left' }}>

                  {flexRender(header.column.columnDef.header, header.getContext())}

                </th>

              ))}

            </tr>

          ))}

        </thead>

        <tbody>

          {table.getRowModel().rows.map(row => (

            <tr key={row.id}>

              {row.getVisibleCells().map(cell => (

                <td key={cell.id}

                  style={{ border: '1px solid #ddd', padding: '8px 12px' }}>

                  {flexRender(cell.column.columnDef.cell, cell.getContext())}

                </td>

              ))}

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}

**💡 TanStack Table 핵심 함수 설명**

| **함수** | **설명** |
| --- | --- |
| useReactTable({data, columns, getCoreRowModel()}) | 테이블 인스턴스를 만드는 함수. data는 표시할 데이터, columns는 열 설정 |
| getCoreRowModel() | 기본 행 출력 설정. 정렬·필터 없이 데이터를 그대로 보여줄 때 사용 |
| flexRender(component, context) | 셀 내용을 화면에 그려주는 함수. 텍스트뿐 아니라 버튼, 이미지도 넣을 수 있음 |
| table.getHeaderGroups() | 헤더(제목 행) 목록을 가져옴 |
| table.getRowModel().rows | 데이터 행 목록을 가져옴 |

# **12. TypeScript 타입 정의**

## **12.1 types/index.ts 생성**

// frontend/src/types/index.ts

export interface User {

  id: number

  name: string

  email: string

  role: 'superadmin' | 'manager' | 'member'

  team_id: number | null

}

export interface Team {

  id: number

  name: string

  invite_code: string

  created_by: number

}

export interface Schedule {

  id: number

  site_id: number

  team_id: number

  date: string

  status: 'pending' | 'in_progress' | 'done'

}

export interface Site {

  id: number

  address: string

  apt_name: string

  dong: string

  ho: string

  area_m2: number | null

}

export interface Attendance {

  id: number

  user_id: number

  date: string

  check_in: string | null

  check_out: string | null

}

export interface ApiResponse<T> {

  success: boolean

  message: string

  data: T

  error_code?: string

}

# **13. 개발 서버 동시 실행**

## **13.1 Laravel + React 동시에 실행하기**

# 터미널 창 1: Laravel 백엔드 서버

cd C:\project\team-schedule\backend

php artisan serve

# INFO  Server running on [http://127.0.0.1:8000]

# 터미널 창 2: React 프론트엔드 서버

cd C:\project\team-schedule\frontend

npm run dev

# Local:  http://localhost:3000

## **13.2 접속 및 확인**

| **주소** | **내용** | **확인 방법** |
| --- | --- | --- |
| http://localhost:3000 | React 관리자 화면 | 로그인 화면 표시 확인 |
| http://localhost:3000/login | 로그인 화면 | admin@test.com / 1234 로그인 테스트 |
| http://localhost:3000/ | 대시보드 화면 | 로그인 후 대시보드 카드 3개 확인 |
| http://localhost:3000/schedule | 스케줄 화면 | FullCalendar 달력 표시 확인 |
| http://localhost:3000/sites | 현장 목록 화면 | 현장 목록 화면 표시 확인 |
| http://localhost:3000/teams | 팀원 관리 화면 | TanStack Table 테이블 표시 확인 |
| http://localhost:3000/attendance | 근태 현황 화면 | 근태 현황 화면 표시 확인 |
| http://localhost:8000/api/test | Laravel API 상태 | { success: true } 응답 확인 |

# **14. Git 커밋**

cd C:\project\team-schedule

git add .

git commit -m "feat: React 웹 관리자 설치 및 기본 구조 완성 (TanStack Table v8 적용)"

git push origin main

# **15. 설치 완료 최종 점검 체크리스트**

| **✔** | **항목** | **확인 방법** | **비고** |
| --- | --- | --- | --- |
| [ ] | React 프로젝트 생성됨 | frontend 폴더 안에 src, package.json 확인 |  |
| [ ] | 포트 3000으로 변경됨 | npm run dev 후 http://localhost:3000 접속 확인 |  |
| [ ] | vite.config.ts proxy 설정 완료 | /api 요청이 8000으로 전달되는지 확인 |  |
| [ ] | 11개 라이브러리 모두 설치됨 | npm list --depth=0 출력 확인 | ★ v4.3 수정 |
| [ ] | 폴더 구조 생성됨 (api/pages/store/types/utils) | src 폴더 내부 확인 |  |
| [ ] | .env 파일 생성됨 (VITE_API_URL) | frontend/.env 파일 존재 확인 | ★ v4.3 보완 |
| [ ] | utils/format.ts 생성됨 | formatDate, formatDateTime 함수 존재 확인 | ★ v4.3 신규 |
| [ ] | main.tsx QueryClient + 한국어 설정 | 달력, 날짜 선택기가 한국어로 표시되는지 |  |
| [ ] | App.tsx 라우팅 설정 완료 | /login, /, /schedule 주소 모두 화면 전환 확인 |  |
| [ ] | authStore.ts Zustand 생성됨 | store/authStore.ts 파일 존재 확인 |  |
| [ ] | axiosInstance.ts 생성됨 | api/axiosInstance.ts 파일 존재 확인 |  |
| [ ] | AdminLayout 레이아웃 화면 표시 | 로그인 후 사이드바 + 헤더 정상 표시 |  |
| [ ] | 로그인 화면 + 임시 로그인 동작 | admin@test.com / 1234 로그인 후 대시보드 이동 |  |
| [ ] | Dashboard.tsx 대시보드 화면 표시 | 통계 카드 3개 표시 확인 |  |
| [ ] | FullCalendar 달력 표시 | /schedule 화면에서 달력 렌더링 확인 |  |
| [ ] | ⭐ TanStack Table 테이블 표시 | /teams 화면에서 테이블 렌더링 확인 | ★ v4.2 변경 |
| [ ] | Sites.tsx 현장 목록 화면 표시 | /sites 화면 오류 없이 표시 확인 | ★ v4.3 신규 |
| [ ] | SiteDetail.tsx 현장 상세 화면 표시 | /sites/1 화면 오류 없이 표시 확인 | ★ v4.3 신규 |
| [ ] | Attendance.tsx 근태 현황 화면 표시 | /attendance 화면 오류 없이 표시 확인 | ★ v4.3 신규 |
| [ ] | types/index.ts 타입 정의 완료 | User, Schedule, Site, Attendance 타입 확인 |  |
| [ ] | GitHub Push 완료 | github.com 저장소에서 frontend 폴더 확인 |  |

**✅ 위 21가지 항목이 모두 정상이라면 v4 React 웹 관리자 기본 세팅이 완료된 것입니다!**

# **16. 다음 단계 안내 (v5 예고)**

| **v5에서 할 일** | **목적** |
| --- | --- |
| React Native 0.83 프로젝트 생성 | 모바일 앱 개발 환경 구축 |
| Android 에뮬레이터 설치 및 설정 | 실제 Android 앱처럼 테스트하는 가상 기기 |
| React Navigation v7 설치 | 앱 화면 전환 구조 설정 (기획서 4.3절) |
| React Native Paper 5.15.x 설치 | Material Design 기반 앱 UI 컴포넌트 |
| react-native-calendars 설치 | 앱용 달력 UI (Pure JS — RN 버전 무관) |
| 바텀 탭 네비게이션 구성 | 홈·현장·근태·내 정보 탭 뼈대 완성 |
| Android 에뮬레이터에서 앱 실행 확인 | 빌드 오류 없이 앱이 뜨는지 확인 |

**— v4 React 웹 관리자 설치·설정 완료 (TanStack Table v8 적용) —**

다음: 개발 매뉴얼 v5 — React Native 앱 설치·설정

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v4.0 | 2026-04-19 | — | 최초 작성 — React 19 + TypeScript 웹 관리자 설치·설정 (라이브러리 10종, 레이아웃, 로그인, FullCalendar, Zustand, Axios 기초 설정) |
| v4.1 | 2026-04-19 | — | [전체] Laravel 포트 번호 수정 8080 → 8000 / vite.config.ts proxy, .env, 동시 실행 명령어, 체크리스트 전체 수정 |
| v4.2 | 2026-04-19 | — | [3장] Toast UI Grid 4.x → TanStack Table v8 로 교체 (React 19 호환 문제 해결) / 라이브러리 비교표 추가 / TanStack Table 사용 예시 코드 추가 |
| **v4.3** | 2026-04-19 | — | [10장] 누락 페이지 코드 전체 추가: Sites.tsx, SiteDetail.tsx, Attendance.tsx / [11장] Teams.tsx ColumnDef import type 오류 수정 / [5장] .env 파일 생성 방법 추가 / [4장] utils/format.ts 코드 추가 / 체크리스트 21개 항목으로 확장 |

© 2026 Team Schedule Manager