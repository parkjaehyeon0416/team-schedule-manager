# App Store 심사 답변 (Guideline 2.1 - Information Needed, 2026-10-16)

> Apple 요청: ① 실제 아이폰 화면 녹화 ② 앱 목적·대상 ③ 사용 방법·로그인 정보 ④ 외부 서비스 ⑤ 지역 차이 ⑥ 규제 업종 서류.
> 아래 영어 본문을 **앱 심사 메시지 답장**에 붙여 넣고, 같은 내용을 **버전 페이지 › 앱 심사 정보 › 메모**에도 넣는다(4,000자 제한 — 메모에는 "Screen recording" 줄을 빼도 됨).
> ※ 신고·차단 기능(v18.72)을 넣은 새 빌드로 제출할 때 "User-generated content safeguards" 항목을 실제 화면 문구에 맞춰 확인할 것.
> ※ `<영상 링크>`와 `<비밀번호>`는 사장님이 채움. 비밀번호는 이 파일에 적지 말 것.

---

```
Hello App Review team,

Thank you for the review. Please find the requested information below.

1. Screen recording
A screen recording captured on a physical iPhone (latest iOS) is available here: <영상 링크>
It starts from launching the app and shows: sign-up (with SMS verification of a Korean mobile number), login, the main features (schedules, daily wage/income, site photos, quotes, business card, team), reporting content and blocking a user, and account deletion.

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

User-generated content safeguards (Guideline 1.2)
- There is no public feed, chat or comment area. Team notices, team photos and team activity are visible only to members of the same invite-only team.
- Report: users can report a team notice, a team photo or a team member (reason + optional details). Reports go to the operator, who reviews them within 24 hours and can hide the content and suspend the account.
- Block: users can block another team member; that person's notices, photos and activity are hidden from them. Blocked users can be managed in 내정보 > 차단한 사용자.
- Team notices are checked against a list of objectionable words before posting. Team leaders can remove members from a team.
- The Terms of Use (agreed at sign-up) prohibit objectionable content and abusive behavior.
- Contact: in-app 고객 문의 (Customer inquiry), workmatekr@gmail.com, https://workmatekr.com/support

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
7. 신고·차단·금칙어·운영자 24시간 처리·약관 금지 조항·연락처
