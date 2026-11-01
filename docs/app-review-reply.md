# App Store 심사 답변 (Guideline 2.1 - Information Needed, 2026-10-16)

> Apple 요청: ① 실제 아이폰 화면 녹화(2026-11-02 사장님 결정: 실기기가 없어 시뮬레이터로 찍었다고 밝히고 보냄) ② 앱 목적·대상 ③ 사용 방법·로그인 정보 ④ 외부 서비스 ⑤ 지역 차이 ⑥ 규제 업종 서류.
> 아래 영어 본문을 **앱 심사 메시지 답장**에 붙여 넣고, 같은 내용을 **버전 페이지 › 앱 심사 정보 › 메모**에도 넣는다(4,000자 제한 — 메모에는 "Screen recording" 줄을 빼도 됨).
> ※ 2026-10-17 사장님 결정: 신고·차단 화면 없이 지금 빌드(1.1.0 (11))로 답변 — 초대제 업무 앱이라는 점을 설명. 1.2로 다시 반려되면 신고·차단 화면을 넣는다(서버 v18.72는 이미 배포됨).
> ※ `<영상 링크>`와 `<비밀번호>`는 사장님이 채움. 비밀번호는 이 파일에 적지 말 것.

---

```
Hello App Review team,

Thank you for the review. Please find the requested information below.

1. Screen recording
We are an individual developer and do not currently have a physical iPhone available, so we recorded the screen on the iOS Simulator (iPhone 17 Pro, iOS 26). We apologize for this. The recording is available here: <영상 링크>
It was made from the same source code as build 1.1.0 (11), connected to a local test copy of our server that contains sample data (sample names such as "한예시" and "가상고객"). It starts from launching the app and shows: logging in, the main features (home and monthly income, schedule calendar and details, quote and its PDF preview, business card, team members, the leader-controlled invitation code, posting a team notice), the in-app customer inquiry used for reports, logging out, signing up with SMS verification of a Korean mobile number, and deleting the new account (내정보 > 앱 정보 > 회원 탈퇴).
If a recording from a physical device is still required, please let us know and we will provide one.

2. Purpose and target audience
현장메이트 ("Hyunjang Mate") is a work-management app for Korean construction and interior trade workers (wallpaper, tile, film, painting) who move between job sites as freelancers or day laborers, and for the team leaders who assign them to sites.
Problem it solves: these workers usually track their schedules, daily wages and site photos in paper notes or chat rooms, so income is hard to total, withholding tax is hard to estimate, and quotes/reports for customers are made by hand.
Value: in one app they can record schedules and daily wages (monthly income is calculated automatically), estimate withholding tax for reference, keep before/after site photos and send a PDF work report, create quotes as PDF/Excel, share a mobile business card, and run a small team (invite members, assign schedules, team notices, monthly settlement sheet, shared site album).

3. How to access the main features
- Demo account: workmatekr+review@gmail.com / password: <비밀번호> (also entered in App Review Information). On the login screen enter the email and password and tap "로그인" (Log in). No SMS or 2-step verification is needed to log in with this account.
- New sign-ups require SMS verification of a Korean mobile number, so please use the demo account.
- Home tab: monthly income card and menu grid — 일정 (Schedules), 내수입 (Income), 팀관리 (Team), 견적서 (Quotes), 내 명함 (Business card), 세무 자료 (Tax summary), 현장 목록 (Sites).
- The "+" button at the bottom creates a schedule (date, site, trade, work units, daily wage).
- Team features: 팀관리 > 팀 만들기 (Create team). Team notices, album and members are inside the team page.
- Sign in with Apple, Google and Kakao are also available on the login screen.
- Account deletion: 내정보 (My) tab > 앱 정보 (App info) > 회원 탈퇴 (Delete account).
- The app is free. There are no in-app purchases or paid features.

4. External services used
- Our own backend API and database (Laravel/MySQL) hosted on Naver Cloud Platform in Korea.
- Sign in with Apple, Google Sign-In and Kakao Login — optional social login.
- SOLAPI — sends SMS verification codes (sign-up, finding ID/password, changing phone number). Marketing SMS is sent only to users who opted in.
- Firebase Cloud Messaging — push notifications (schedule reminders, team notices, inquiry answers).
- Kakao (Daum) Postcode — Korean address search when registering a job site.
- Gmail SMTP — transactional emails (email verification codes, support replies).
No advertising SDKs, analytics/tracking SDKs, AI services or payment processors are used.

5. Regional differences
The app is distributed only in South Korea and is provided in Korean. Phone verification works with Korean mobile numbers. The app functions the same for all users; there are no region-specific features or content.

6. Regulated industry / third-party material
The app does not operate in a regulated industry and does not include protected third-party content. The withholding-tax figure is a reference estimate calculated from the user's own records (Korean 3.3% freelancer / day-laborer rates); the app does not file taxes, provide tax or financial advice, or handle payments.

User-generated content (Guideline 1.2)
- 현장메이트 is a private work tool for a team leader and the workers they hire, not a community or social app. There is no public feed, board, chat or comment area, and no way to browse, search or contact strangers.
- A team is created by a team leader. Workers join only with the invite code/link that the leader personally sends to the people they choose. The code expires after 7 days, and the leader can issue a new code at any time, which immediately disables the old link.
- Team notices (written only by the leader or sub-leader) and team site photos are visible only to members of that same team.
- The team leader can remove any member from the team, and any member can leave a team at any time.
- Users can report a problem, inappropriate content or another user to the operator through the in-app 고객 문의 (Customer inquiry: 내정보 > 고객 문의) or by email (workmatekr@gmail.com). We review reports within 24 hours and can remove content and suspend accounts.
- The Terms of Use (agreed at sign-up) prohibit objectionable content and abusive behavior with zero tolerance, and team notices and team names are automatically checked for objectionable words before posting.
- Contact: in-app 고객 문의, workmatekr@gmail.com, https://workmatekr.com/support

Thank you.
```

---

## 한국어 요약 (사장님 확인용)
1. 영상: 지인 아이폰 녹화 → 구글 드라이브 "링크가 있는 모든 사용자" 공유 링크
2. 목적: 현장 기사·팀장용 일정·일당·사진·견적·팀 관리 앱
3. 사용법: 심사용 계정으로 로그인, 탈퇴는 내정보 › 앱 정보 › 회원 탈퇴, 무료·결제 없음
4. 외부 서비스: 자체 서버(네이버 클라우드), 애플·구글·카카오 로그인, SOLAPI 문자, 파이어베이스 푸시, 다음 우편번호, 지메일 발송
5. 지역: 한국 전용·한국어
6. 규제: 해당 없음(원천세는 참고용 계산)
7. 사용자 콘텐츠: 공개 게시판·채팅 없음, 팀장이 고른 사람만 초대 코드로 가입(7일 만료·새 코드로 즉시 막기), 팀장 내보내기·팀원 나가기, 앱 고객 문의로 신고 → 24시간 처리, 약관 무관용·금칙어

---

## 화면 녹화 대본 (지인 아이폰, TestFlight판 · 3~5분)
준비: 방해 금지 모드 켜기(알림 배너 안 뜨게), TestFlight로 현장메이트 설치, 설정 › 제어 센터에 "화면 기록" 추가
1. 홈 화면에서 녹화 시작(⏺) → **현장메이트 아이콘을 눌러 실행** (Apple: 앱 실행부터 시작해야 함)
2. 로그인 화면 → [이메일로 회원가입] → 이름·이메일·비밀번호 → 휴대폰 번호 → [인증번호 받기] → 문자로 온 6자리 입력 → [확인] → 약관 동의 → 가입 완료 → 홈
3. 내정보 › 로그아웃 → 방금 만든 이메일·비밀번호로 **다시 로그인** (로그인 흐름 보여주기)
4. 아래 [+] → 일정 등록(날짜·현장·공정·일당) → 저장 → 홈 "이번 달 수입"에 반영된 것 보여주기
5. 현장 목록 → 현장 추가(주소 검색) → 사진 올리기(카메라로 벽·바닥 촬영 — 개인 사진 앨범 화면은 피하기)
6. 견적서 → 새 견적서 → 항목 1~2개 → 저장 → 미리보기(PDF)
7. 내 명함 → 명함 보기
8. 팀관리 → 팀 만들기 → **팀원 초대** 화면(초대 코드·링크, [새 코드 만들기]) → 팀 공지 하나 쓰기 → 팀 앨범 열기
9. 내정보 → **고객 문의** → [문의하기] 화면만 열어 보여주기(신고 경로)
10. 내정보 → 앱 정보 → **회원 탈퇴** → 본인 확인 → 탈퇴 완료 → 로그인 화면으로 돌아온 것 보여주기
11. 녹화 중단(위쪽 빨간 표시 → 중단) → 사진 앱에 저장됨 → 구글 드라이브에 올려 "링크가 있는 모든 사용자" 공유 링크 만들기
