Team Schedule Manager  |  개발 매뉴얼 v1.2  |  로컬 개발 환경 세팅

# **개발 매뉴얼  v1.2**

**로컬 개발 환경 세팅**

Team Schedule Manager  |  대상 OS: Windows 10/11  |  비전공자도 따라할 수 있도록 작성됨

작성일: 2026년 04월  |  최종 수정: 2026-04-19 (v1.2)

**★ v1.2 변경사항**

[전체 매뉴얼 시리즈 표]  v7(핵심 기능 API 개발), v8(배포 및 운영 자동화) 항목 추가
— 개발 매뉴얼 v1.1 · v2.1 · v3.1 세 파일의 전체 시리즈 표가 서로 달라서 v1.1 기준 8개 항목으로 통일

★ v1.1 변경사항
[7장] DB 클라이언트: TablePlus → MySQL Workbench 로 변경 (완전 무료, 연결 수 무제한)
[변경이력] 문서 하단에 변경 이력 섹션 추가

# **전체 매뉴얼 시리즈**

| **버전** | **제목** | **핵심 내용** | **상태** |
| --- | --- | --- | --- |
| **v1** | **로컬 개발 환경 세팅  ←** | **Laragon, VSCode, Git, Node.js, MySQL Workbench, Composer** | **▶ 현재** |
| v2 | 프로젝트 폴더 구조 + Laravel 백엔드 설치 | 폴더 구조, Laravel 12 설치, .env, Sanctum, DB 연결, ApiResponse, Git Push/Pull | ⏳ 예정 |
| v3 | DB 설계 및 마이그레이션 | 기획서 v1.4 테이블 생성, Model 생성, Seeder | ⏳ 예정 |
| v4 | React 웹 관리자 설치·설정 | React 19 + TypeScript, Ant Design, FullCalendar, Toast UI Grid | ⏳ 예정 |
| v5 | React Native 앱 설치·설정 | RN 0.83, Android 에뮬레이터, RN Paper, React Navigation | ⏳ 예정 |
| v6 | API 라우팅 + 인증 구현 | routes/api.php, Sanctum 토큰, 권한 미들웨어 | ⏳ 예정 |
| v7 | 핵심 기능 API 개발 | 스케줄·현장·근태 CRUD API, 파일 업로드, 집계 통계 | ⏳ 예정 |
| v8 | 배포 및 운영 자동화 | 카페24 이지업 배포, Nginx, cron 백업, 모니터링 | ⏳ 예정 |

# **1. 이 문서가 다루는 범위**

v1에서는 코드를 한 줄도 작성하지 않습니다. 개발을 시작하기 위한 '공구함'을 세팅하는 단계입니다.

**💡 집 공사에 비유하면**

  Laragon          = 공사 현장의 전기·수도 공급 설비 (서버 환경)

  VSCode           = 설계 도면을 그리는 제도판 + 모든 공구 (코드 에디터)

  Git              = 공사 일지 + 변경 이력 기록 시스템 (버전 관리)

  Node.js          = React·RN 앱을 만들기 위한 자재 공장 (JS 실행 환경)

  MySQL Workbench  = 창고 내부를 눈으로 볼 수 있는 투명 창고문 (DB 시각화)

  Composer         = Laravel 부품을 자동으로 주문·설치해주는 배송 시스템

# **2. 설치 항목 한눈에 보기**

아래 순서대로 설치하는 것을 권장합니다. 순서가 바뀌면 일부 항목이 정상 동작하지 않을 수 있습니다.

| **#** | **항목** | **내용** |
| --- | --- | --- |
| 1 | **Laragon Full 설치 + 포트 설정** | PHP 8.3, MySQL 8.0, Apache 내장 / XAMPP 공존 설정 |
| 2 | **VSCode 설치 + 확장 프로그램 7종** | PHP·Laravel·React·RN 통합 개발 환경 완성 |
| 3 | **Git 설치 + 사용자 정보 등록** | 버전 관리 기반 마련 |
| 4 | **Node.js 설치 (nvm 방식)** | React + React Native 개발 환경 준비 |
| 5 | **MySQL Workbench 설치 + MySQL 연결** | DB 시각화 도구로 테이블 확인 (완전 무료) |
| 6 | **Composer 설치 + 동작 확인** | Laravel 설치를 위한 PHP 패키지 매니저 |

⏱ 예상 소요 시간: 전체 설치 완료까지 약 40분~1시간 (인터넷 속도에 따라 다름)

# **3. Laragon 설치 및 설정**

## **3.1 Laragon이란?**

Laragon은 PHP, MySQL, Apache를 한 번에 설치하고 실행해주는 로컬 서버 패키지입니다.

**💡 용어 설명**

  PHP   : Laravel이 사용하는 프로그래밍 언어. 백엔드 API 서버를 만드는 데 사용합니다.

  MySQL : 데이터를 저장하는 데이터베이스. 팀 정보, 일정, 근태 기록 등이 저장됩니다.

  Apache: 브라우저 요청을 받아 Laravel 앱을 실행시켜 응답을 돌려주는 웹 서버입니다.

  로컬 서버: 내 컴퓨터 안에서만 돌아가는 가상 서버. 인터넷에 공개되지 않습니다.

## **3.2 Laragon 다운로드 및 설치**

• laragon.io/download 접속

• 'Laragon Full' 버전 다운로드 (laragon-wamp.exe, 약 200MB) — Lite 버전은 기능이 빠져 있으므로 반드시 Full 선택

• 다운받은 .exe 파일 실행 → 설치 경로: C:\laragon (기본값 유지 권장)

• 설치 완료 후 Laragon 실행 → 'Start All' 클릭 → Apache, MySQL 상태가 초록색이면 성공

## **3.3 포트 충돌 방지 설정 (XAMPP 공존)**

XAMPP가 이미 설치된 경우 같은 포트를 사용하려 하면 충돌이 발생합니다. Laragon의 포트를 변경합니다.

• Laragon 메인 창 → 우클릭 → Preferences (환경설정)

• Services & Ports 탭 클릭

• Apache 포트: 80 → 8080 으로 변경

• MySQL 포트: 3306 → 3307 로 변경

• Save 클릭 후 Stop All → Start All 로 재시작

브라우저에서 확인: http://localhost:8080

## **3.4 Laragon 동작 확인**

php -v

# 정상 출력 예시: PHP 8.3.x (cli) (built: ...)

⚠️ 'php' is not recognized 오류 시

  원인: 일반 CMD/PowerShell을 사용한 경우입니다.

  해결: Laragon 메인 창 → Terminal 버튼으로 열어야 합니다.

# **4. VSCode 설치 및 필수 확장 프로그램**

## **4.1 VSCode 다운로드 및 설치**

VSCode(Visual Studio Code)는 Microsoft가 만든 무료 코드 에디터입니다.

• code.visualstudio.com 접속 → 'Download for Windows' 클릭

• 설치 시 'Add to PATH' 체크

• 'Add Open with Code action to Windows Explorer' 체크

## **4.2 필수 확장 프로그램 7종**

설치 방법: VSCode 왼쪽 사이드바 블록 아이콘(Extensions, Ctrl+Shift+X) → 검색창에 이름 입력 → Install

| **확장 프로그램** | **제작사** | **역할** | **없으면?** |
| --- | --- | --- | --- |
| **PHP Intelephense** | Ben Mewburn | PHP 코드 자동완성·오류 표시·함수 이동 | 없으면 PHP 코드 타이핑이 매우 불편함 |
| **Laravel Extra Intellisense** | amir | Laravel 라우트·모델·뷰 자동완성 | Laravel 고유 문법 지원 없음 |
| **ES7+ React/Redux/React-Native snippets** | dsznajder | React·RN 코드 단축키 (rafce → 컴포넌트 자동생성) | React 코드 일일이 직접 타이핑 |
| **React Native Tools** | Microsoft | RN 앱 디버깅·에뮬레이터 연결 | RN 앱 오류 확인 어려움 |
| **Prettier - Code formatter** | Prettier | 저장 시 코드 자동 정렬 | 코드 스타일 불통일 |
| **GitLens — Git supercharged** | GitKraken | 코드 옆에 마지막 수정자·시간 표시 / Git 이력 시각화 | Git 변경사항 추적 불편 |
| **Thunder Client** | Ranga Vadhineni | VSCode 안에서 API 테스트 (Postman 대체) | 별도 Postman 앱 필요 |

## **4.3 VSCode 기본 설정 (settings.json)**

Ctrl+Shift+P → 'Open User Settings (JSON)' 입력 후 Enter → 아래 내용 붙여넣기

{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "[php]": { "editor.tabSize": 4 },
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "php.validate.executablePath": "C:\\laragon\\bin\\php\\php8.3.x\\php.exe",
  "files.exclude": { "**/node_modules": true }
}

⚠️ php8.3.x 부분을 실제 설치된 버전 폴더명으로 변경하세요.

  C:\laragon\bin\php 폴더를 파일 탐색기로 열어서 폴더명을 확인하세요.

# **5. Git 설치 및 초기 설정**

## **5.1 Git이란?**

Git은 코드의 변경 이력을 기록하고 관리하는 버전 관리 시스템입니다.

**💡 Git이 없으면 생기는 문제들**

  • 어제 잘 됐던 코드가 오늘 안 되는데 무엇을 바꿨는지 모름

  • backup_v1, backup_v2, backup_final, backup_진짜최종 파일이 쌓임

  • 서버에 올릴 때 어떤 파일이 최신인지 알 수 없음

## **5.2 Git 설치**

• git-scm.com 접속 → 'Download for Windows' 클릭

• 'Choosing the default editor' → 'Use Visual Studio Code as Git's default editor' 선택

• 'Adjusting the name of the initial branch' → 'Override' 선택 후 main 입력

• 나머지 옵션은 기본값(Next) 유지 → 설치 완료 후 VSCode 재시작

설치 확인: git --version

# 출력 예시: git version 2.x.x.windows.x

## **5.3 Git 초기 설정**

git config --global user.name "홍길동"       # GitHub 계정명과 동일하게

git config --global user.email "honggildong@email.com"

git config --global --list

# **6. Node.js 설치**

## **6.1 Node.js와 npm이란?**

Node.js는 JavaScript를 브라우저 밖(내 컴퓨터)에서 실행할 수 있게 해주는 환경입니다.

**💡 용어 설명**

  Node.js : JavaScript 실행 환경. React·RN 앱을 빌드할 때 필요합니다.

  npm     : Node.js에 포함된 패키지 설치 도구.

  nvm     : 여러 버전의 Node.js를 설치하고 전환하는 도구. 버전 충돌 방지용입니다.

## **6.2 nvm으로 Node.js 설치 (권장)**

• github.com/coreybutler/nvm-windows/releases 접속

• 최신 버전의 nvm-setup.exe 다운로드 및 설치

• 설치 완료 후 VSCode 터미널 재시작 (Ctrl+`)

nvm install --lts    # 최신 LTS 버전 설치

nvm use --lts        # 설치된 버전 사용 설정

node -v              # 버전 확인 → v22.x.x

npm -v               # 버전 확인 → 10.x.x

nvm install 18       # React Native용 Node.js 18도 추가 설치

nvm list             # 설치된 버전 목록 확인

⚠️ nvm 명령을 찾을 수 없음 오류 시

  원인: nvm 설치 후 터미널을 재시작하지 않은 경우입니다.

  해결: VSCode를 완전히 종료 후 다시 실행하고 새 터미널(Ctrl+`)을 열어보세요.

# **7. DB 클라이언트 설치 (MySQL Workbench)**

**★ v1.1 변경: TablePlus → MySQL Workbench 로 변경**

MySQL Workbench는 Oracle이 공식 제공하는 완전 무료 DB 관리 툴입니다.

나중에 로컬 DB + 카페24 서버 DB를 동시에 열어 비교할 때도 연결 수 제한이 없습니다.

## **7.1 DB 클라이언트란?**

DB(데이터베이스)는 데이터를 저장하는 창고입니다. MySQL 자체는 텍스트 명령어로만 접근합니다. DB 클라이언트는 이 창고를 엑셀처럼 시각적으로 보고 편집할 수 있게 해주는 도구입니다.

| **항목** | **TablePlus** | **MySQL Workbench** |
| --- | --- | --- |
| **가격** | TablePlus 무료 버전 (제한 있음) | MySQL Workbench (완전 무료) |
| **연결 수** | 무료 버전 2개 제한 | 무제한 |
| **탭 수** | 무료 버전 2개 제한 | 무제한 |
| **UI** | 깔끔하고 직관적 | 기능 많지만 다소 복잡 |
| **속도** | 빠름 | 상대적으로 무거움 |
| **SQL 편집기** | 기본 수준 | 강력함 (자동완성 등) |
| **지원 DB** | MySQL·PostgreSQL 등 다양 | MySQL 전용 |
| **이 프로젝트** | ❌ 사용 안 함 | ✅ 사용 |

## **7.2 MySQL Workbench 설치**

• mysql.com/products/workbench 접속 → Download 클릭

• Windows 버전 다운로드 (MySQL Installer 또는 MSI Installer)

• 설치 마법사 진행 → 기본값으로 설치 완료

• MySQL Workbench 실행

## **7.3 Laragon MySQL 연결하기**

MySQL Workbench 첫 화면에 MySQL Connections 영역이 있습니다. + 버튼을 클릭합니다.

| **항목** | **XAMPP 공존 (포트 변경)** | **Laragon 단독 (기본 포트)** |
| --- | --- | --- |
| **Connection Name** | Laragon Local | Laragon Local |
| **Hostname** | 127.0.0.1 | 127.0.0.1 |
| **Port** | 3307 | 3306 |
| **Username** | root | root |
| **Password** | (비어있음) | (비어있음) |

• 입력 후 하단 Test Connection 버튼 클릭

• Successfully made the MySQL connection 메시지 확인

• OK 클릭 → 연결 목록에 저장됨

• 저장된 연결 더블클릭 → 좌측 패널에 DB 목록이 표시되면 성공

## **7.4 MySQL Workbench 기본 사용법**

**💡 처음에 헷갈릴 수 있는 것들**

**테이블 데이터 보는 방법**

  • 좌측 패널 → team_schedule 데이터베이스 클릭

  • Tables 펼치기 → 테이블 이름 더블클릭

  • 우측 화면에 데이터가 표시됨

**SQL 직접 실행하는 방법**

  • 상단 메뉴 Query → New Query Tab 클릭 (단축키: Ctrl+T)

  • 쿼리창에 SQL 입력

  • Ctrl+Enter 로 실행

⚠️ Connection refused 오류 시

  원인 1: Laragon의 MySQL이 실행되지 않은 경우

  원인 2: 포트 번호가 틀린 경우 → 3307로 변경했는지 확인

# **8. Composer 설치**

## **8.1 Composer란?**

Composer는 PHP의 패키지(라이브러리) 설치 도구입니다.

💡 npm이 JavaScript 라이브러리를 설치하듯, Composer는 PHP 라이브러리를 설치합니다.

## **8.2 Composer 설치 및 확인**

• getcomposer.org/download 접속 → Composer-Setup.exe 다운로드 및 실행

• PHP 실행 경로 선택: C:\laragon\bin\php\php8.3.x\php.exe

• 설치 완료 후 VSCode 터미널 재시작

composer --version

# 출력 예시: Composer version 2.x.x

composer global require laravel/installer

laravel --version

# 출력 예시: Laravel Installer x.x.x

⚠️ 'laravel' is not recognized 오류 시

  Windows 검색 → '환경 변수 편집' → 사용자 변수 Path에 아래 경로 추가:

  C:\Users\[사용자명]\AppData\Roaming\Composer\vendor\bin

# **9. 설치 완료 최종 점검 체크리스트**

| **확인 명령어** | **정상 출력 예시** | **주의사항** | **상태** |
| --- | --- | --- | --- |
| **php -v** | PHP 8.3.x ... | Laragon: MySQL Running | [ ] |
| **mysql -u root -p** | mysql> 프롬프트 표시 | XAMPP 공존 시 포트 3307 | [ ] |
| **composer --version** | Composer version 2.x.x | — | [ ] |
| **node -v** | v18.x.x 또는 v22.x.x | — | [ ] |
| **npm -v** | 10.x.x | — | [ ] |
| **git --version** | git version 2.x.x | — | [ ] |
| **laravel --version** | Laravel Installer x.x.x | 환경변수 Path 확인 | [ ] |
| **VSCode Extensions 탭 확인** | 7개 모두 설치됨 | — | [ ] |
| **MySQL Workbench → Test Connection** | Successfully made... 메시지 | ★ TablePlus 아님! | [ ] |

**✅ 위 9가지 항목이 모두 정상이라면 로컬 개발 환경 세팅이 완료된 것입니다!**

# **10. 다음 단계 안내 (v2 예고)**

| **v2에서 할 일** | **목적** |
| --- | --- |
| **프로젝트 폴더 구조 설계 및 생성** | frontend, backend 폴더로 명확히 분리 |
| **GitHub 저장소 생성 + 최초 Push** | 코드 백업 및 버전 관리 시작 |
| **Laravel 12 프로젝트 생성** | composer create-project 로 백엔드 뼈대 생성 |
| **.env 파일 설정** | DB 연결 정보, 앱 이름 설정. Git에 올리면 안 되는 파일 |
| **MySQL Workbench에서 DB 생성** | team_schedule DB 생성. v3에서 테이블 추가 |
| **Laravel Sanctum 설치 및 설정** | 모바일 앱 토큰 인증의 기반 |
| **기본 동작 테스트** | http://localhost:8080/api/test 정상 응답 확인 |

**v2 시작 전 사전 준비사항**

  1. GitHub 계정 생성 (github.com)

  2. 프로젝트를 저장할 폴더 위치 결정 (예: C:\project\team-schedule)

  3. 이 문서의 최종 점검 체크리스트 9가지 항목 모두 통과 확인

— v1 로컬 개발 환경 세팅 완료 —

다음: 개발 매뉴얼 v2 — 프로젝트 폴더 구조 + Laravel 백엔드 설치

# **변경 이력**

| **버전** | **날짜** | **작성자** | **변경 내용** |
| --- | --- | --- | --- |
| v1.0 | 2026-04 | — | 최초 작성 — 로컬 개발 환경 세팅 가이드 (Laragon, VSCode, Git, Node.js, TablePlus, Composer) |
| v1.1 | 2026-04-19 | — | [7장] DB 클라이언트 변경 • TablePlus → MySQL Workbench (완전 무료, 연결 무제한) • 9장 체크리스트 항목 변경 • 1장·2장 설치 항목 표 반영 |
| **v1.2** | 2026-04-19 | — | [전체 매뉴얼 시리즈 표] v7(핵심 기능 API 개발), v8(배포 및 운영 자동화) 항목 추가 — v1.1~v3.1 전 문서 통일 |

© 2026 Team Schedule Manager