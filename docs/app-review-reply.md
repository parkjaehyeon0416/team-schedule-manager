# App Store 심사 답변 (Guideline 2.1 - Information Needed, 2026-10-16)

> Apple 요청: ① 실제 아이폰 화면 녹화(2026-11-02 사장님 결정: 실기기가 없어 시뮬레이터로 찍었다고 밝히고 보냄) ② 앱 목적·대상 ③ 사용 방법·로그인 정보 ④ 외부 서비스 ⑤ 지역 차이 ⑥ 규제 업종 서류.
> 아래 영어 본문(약 3,650자 — 메모 칸 4,000자 제한 안)을 **앱 심사 메시지 답장**과 **버전 페이지 › 앱 심사 정보 › 메모**에 똑같이 넣는다. 영상: https://workmatekr.com/review/97a1e4a7dbb3b7b1fee56ebe.mp4 (실서버 public/review, 2026-11-11 올림 — 심사 끝나면 지워도 됨)
> ※ 2026-10-17 사장님 결정: 신고·차단 화면 없이 지금 빌드(1.1.0 (11))로 답변 — 초대제 업무 앱이라는 점을 설명. 1.2로 다시 반려되면 신고·차단 화면을 넣는다(서버 v18.72는 이미 배포됨).
> ※ `https://workmatekr.com/review/97a1e4a7dbb3b7b1fee56ebe.mp4`와 `<비밀번호>`는 사장님이 채움. 비밀번호는 이 파일에 적지 말 것.

---

```
Hello App Review team,

Thank you for the review. Here is the requested information.

1. Screen recording
We are an individual developer without a physical iPhone, so we recorded on the iOS Simulator (iPhone 17 Pro, iOS 26). We apologize for this.
Video: https://workmatekr.com/review/97a1e4a7dbb3b7b1fee56ebe.mp4
It uses the same source code as build 1.1.0 (12), connected to a test copy of our server with sample data. It starts by launching the app and shows: login, home and monthly income, schedule calendar and details, a quote and its preview, business card, team members, the leader's invite code, posting a team notice, the in-app customer inquiry used for reports, logout, sign-up with SMS verification, and deleting the new account. If a physical-device recording is still required, please let us know.
While recording we found and fixed an issue where the iPhone keyboard could cover the button on the team notice sheet and in the account deletion dialog. Build 1.1.0 (12) includes the fix.

2. Purpose and audience
현장메이트 is a work app for Korean construction and interior trade workers (wallpaper, tile, film, painting) who move between job sites, and for team leaders who assign them. They record schedules and daily wages (monthly income is totaled automatically), estimate withholding tax for reference, keep before/after site photos and PDF work reports, make quotes, share a mobile business card, and run a small team (invite members, assign schedules, team notices, settlement sheet).

3. How to use
- Demo account: workmatekr+review@gmail.com / password: <비밀번호>. Enter them on the login screen and tap "로그인". No SMS or 2-step verification is needed for this account. New sign-ups need SMS verification of a Korean mobile number.
- Home: income card and menu (일정 Schedules, 내수입 Income, 팀관리 Team, 견적서 Quotes, 내 명함 Business card, 세무 자료 Tax, 현장 목록 Sites). The "+" button creates a schedule.
- Team: 팀관리 > 팀 만들기 (Create team). Notices, album and members are on the team page.
- Sign in with Apple, Google and Kakao are also available.
- Account deletion: 내정보 (My) > 앱 정보 (App info) > 회원 탈퇴 (Delete account).
- The app is free; there are no in-app purchases.

4. External services
Our own API/database on Naver Cloud Platform (Korea); Sign in with Apple, Google Sign-In, Kakao Login; SOLAPI (SMS verification codes); Firebase Cloud Messaging (push); Kakao (Daum) Postcode (address search); Gmail SMTP (emails). No ads, tracking/analytics SDKs, AI services or payment processors.

5. Regions
Distributed only in South Korea, in Korean. The app works the same for all users.

6. Regulated industry
Not a regulated industry and no protected third-party content. The withholding-tax figure is a reference estimate from the user's own records; the app does not file taxes, give financial advice or handle payments.

User-generated content (Guideline 1.2)
- A private work tool, not a community: no public feed, chat or comments, and no way to find or contact strangers.
- Workers join a team only with the invite code that the leader sends to people they choose. The code expires in 7 days and the leader can replace it at any time.
- Team notices (leader/sub-leader only) and team photos are visible only within that team. The leader can remove members; members can leave anytime.
- Users can report content or users via in-app 고객 문의 (내정보 > 고객 문의) or workmatekr@gmail.com. We review reports within 24 hours and can remove content and suspend accounts.
- The Terms prohibit objectionable content (zero tolerance), and team notices and team names are checked for objectionable words.
- Support: https://workmatekr.com/support

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
