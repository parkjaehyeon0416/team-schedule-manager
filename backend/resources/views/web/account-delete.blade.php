<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{-- ★ v18.68 계정 삭제 안내 (구글 플레이 "계정 삭제 URL") — 웹 이용약관·개인정보 처리방침(web/legal)과 같은 틀.
     지우는 정보·남는 정보는 AuthController::withdraw() · AccountCleanupService · 개인정보 처리방침 3항과 맞춰야 함 --}}
<title>계정 삭제 안내 · 현장메이트</title>
<meta name="description" content="현장메이트 앱 계정(회원 탈퇴)을 삭제하는 방법과 삭제되는 정보, 남는 정보와 보관 기간을 안내해요.">
<link rel="icon" href="/img/web/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&amp;display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #F7FBFF; font-family: 'Pretendard','Noto Sans KR',system-ui,sans-serif; color: #102A56; -webkit-font-smoothing: antialiased; }
header { position: sticky; top: 0; background: rgba(247,251,255,0.92); border-bottom: 1px solid #E3ECF6; }
.bar { max-width: 840px; margin: 0 auto; height: 64px; padding: 0 20px; display: flex; align-items: center; gap: 10px; }
.bar a { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.bar img { width: 30px; height: 30px; object-fit: contain; }
.bar span { font-size: 18px; font-weight: 800; letter-spacing: -0.4px; color: #102A56; }
.bar b { color: #0A6CE0; }
main { max-width: 840px; margin: 0 auto; padding: 36px 20px 64px; }
h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.6px; }
.lead { margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #3B4F70; word-break: keep-all; }
.id { display: flex; flex-wrap: wrap; gap: 10px 28px; align-items: center; background: #FFFFFF; border: 1px solid #E3ECF6; border-radius: 18px; padding: 20px 24px; margin-bottom: 16px; }
.id img { width: 52px; height: 52px; object-fit: contain; }
.id dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-size: 15px; }
.id dt { color: #5F7290; }
.id dd { margin: 0; font-weight: 800; color: #102A56; }
.doc { scroll-margin-top: 76px; background: #FFFFFF; border: 1px solid #E3ECF6; border-radius: 18px; padding: 28px; margin-bottom: 16px; font-size: 15px; line-height: 1.8; color: #3B4F70; word-break: keep-all; }
.doc h2 { margin: 0 0 12px; font-size: 19px; font-weight: 800; letter-spacing: -0.3px; color: #102A56; }
.doc h2 small { font-size: 13px; font-weight: 700; color: #0A6CE0; margin-left: 6px; }
.doc p { margin: 0 0 10px; }
.doc ol, .doc ul { margin: 0 0 10px; padding-left: 22px; }
.doc li { margin: 4px 0; }
.doc li ul { margin: 6px 0 0; }
.doc b { color: #102A56; }
.path { display: inline-block; padding: 1px 8px; border-radius: 8px; background: #EAF4FF; color: #0757B8; font-weight: 700; white-space: nowrap; }
.note { margin: 12px 0 0; padding: 12px 14px; border-radius: 12px; background: #FFF6EC; color: #8A4B00; font-size: 14px; line-height: 1.7; }
.mail { display: inline-flex; align-items: center; gap: 8px; margin: 4px 0 12px; padding: 10px 16px; border-radius: 12px; background: #0A6CE0; color: #FFFFFF !important; font-weight: 700; text-decoration: none; word-break: break-all; }
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6; }
.tbl th, .tbl td { text-align: left; vertical-align: top; padding: 10px 8px; border-top: 1px solid #E3ECF6; }
.tbl thead th { border-top: 0; color: #5F7290; font-weight: 700; font-size: 13px; }
.tbl td:first-child { font-weight: 700; color: #102A56; }
a { color: #0A6CE0; }
footer { text-align: center; padding: 0 20px 40px; font-size: 13px; color: #5F7290; line-height: 2; }
footer a { color: #0A6CE0; text-decoration: none; margin: 0 8px; }
@media (max-width: 600px) {
  h1 { font-size: 23px; }
  .doc { padding: 20px; font-size: 14px; }
  .id { padding: 16px 18px; }
  .tbl thead { display: none; }
  .tbl, .tbl tbody, .tbl tr, .tbl td { display: block; width: 100%; }
  .tbl tr { border-top: 1px solid #E3ECF6; padding: 10px 0; }
  .tbl td { border: 0; padding: 2px 0; }
  .tbl td[data-k]::before { content: attr(data-k) " · "; color: #5F7290; font-weight: 500; }
}
</style>
</head>
<body>
<header><div class="bar"><a href="/"><img src="/img/web/logo.png" alt="현장메이트"><span>현장<b>메이트</b></span></a></div></header>
<main>
  <h1>현장메이트 계정 삭제 안내</h1>
  <p class="lead">현장메이트 앱의 계정(회원 탈퇴)을 삭제하는 방법과, 삭제되는 정보 · 남는 정보와 보관 기간을 알려드려요.</p>

  <div class="id">
    <img src="/img/web/logo.png" alt="">
    <dl>
      <dt>앱 이름</dt><dd>현장메이트</dd>
      <dt>개발자</dt><dd>{{ $developer }}</dd>
      <dt>문의</dt><dd><a href="mailto:{{ $supportEmail }}">{{ $supportEmail }}</a></dd>
    </dl>
  </div>

  <section class="doc" id="in-app">
    <h2>1. 앱에서 바로 삭제하기 <small>가장 빨라요</small></h2>
    <ol>
      <li>현장메이트 앱을 열고 로그인해요.</li>
      <li>아래 탭에서 <span class="path">내정보</span>를 눌러요.</li>
      <li>목록 아래쪽의 <span class="path">앱 정보</span>를 눌러요.</li>
      <li>화면 맨 아래 <span class="path">회원 탈퇴</span>를 눌러요.</li>
      <li>본인 확인을 해요.
        <ul>
          <li>이메일 · 비밀번호로 가입했다면: 비밀번호 입력</li>
          <li>카카오 · 구글 · Apple 로그인으로 가입해 비밀번호가 없다면: 휴대폰 문자나 이메일로 받은 인증번호 6자리 입력({{ $codeMinutes }}분 안에 입력)</li>
          <li>인증번호를 받을 휴대폰 번호 · 이메일이 없다면: 연결된 카카오 · 구글 · Apple 계정으로 다시 로그인</li>
        </ul>
      </li>
      <li>비밀번호 · 인증번호로 확인했다면 <span class="path">탈퇴하기</span>를 누르면, 연결된 계정으로 다시 로그인했다면 로그인이 끝나는 즉시 계정이 삭제되고 로그아웃돼요.</li>
    </ol>
    <p class="note">탈퇴하면 들어가 있던 모든 팀에서 자동으로 나가요. 삭제한 계정은 되돌릴 수 없어요. 같은 이메일 · 휴대폰 번호로 다시 가입할 수 있지만, 예전 기록은 새 계정으로 이어지지 않아요.</p>
  </section>

  <section class="doc" id="by-email">
    <h2>2. 앱 없이 삭제 요청하기</h2>
    <p>앱을 지웠거나 로그인할 수 없다면 이메일로 삭제를 요청할 수 있어요.</p>
    <a class="mail" href="mailto:{{ $supportEmail }}?subject={{ rawurlencode('현장메이트 계정 삭제 요청') }}">{{ $supportEmail }}</a>
    <ol>
      <li>제목에 <b>현장메이트 계정 삭제 요청</b>이라고 적어 주세요.</li>
      <li>내용에 <b>가입한 이메일 주소 또는 가입한 휴대폰 번호</b>와 이름을 적어 주세요.</li>
      {{-- ★ v18.68 리뷰 반영 — 보낸 사람 주소(From)는 흉내 낼 수 있어서(gmail·naver DMARC p=none) 그것만으로는 지우지 않음.
           가입한 이메일/휴대폰으로 확인 문구를 보내고 그 문구를 돌려받는 방식(운영 절차: docs/play-store-listing.md 9항) --}}
      <li>본인 확인: 요청을 받으면 <b>가입한 이메일 주소나 가입한 휴대폰 번호로 확인 문구</b>를 보내 드려요. 받은 확인 문구를 이 메일에 답장으로 알려 주시면 본인 확인이 끝나요. 보낸 사람 주소는 다른 사람이 흉내 낼 수 있어서, 그것만으로는 삭제하지 않아요.</li>
      <li>처리 기간: 본인 확인이 끝난 날부터 <b>{{ $processDays }}일 이내</b>에 앱에서 탈퇴할 때와 똑같이 삭제하고, 결과를 메일로 알려드려요.</li>
    </ol>
    <p class="note">가입한 이메일 · 휴대폰 번호로 확인 문구를 받을 수 없다면, 앱을 다시 설치해 연결된 카카오 · 구글 · Apple 계정으로 로그인한 뒤 위 1번 방법으로 삭제해 주세요.</p>
  </section>

  <section class="doc" id="deleted">
    <h2>3. 탈퇴하면 바로 삭제되는 정보</h2>
    <ul>
      <li>휴대폰 번호, 카카오톡 아이디</li>
      <li>소셜 로그인 연결 정보(카카오 · 구글 · Apple 식별자, Apple 인증 토큰) — 카카오 · Apple로 가입했다면 그 회사에 연결 해제도 함께 요청해요.</li>
      <li>프로필 사진</li>
      <li>모바일 명함(내용을 모두 지우고 명함 페이지도 바로 닫혀요)과 명함 조회 기록</li>
      <li>고객 문의에 첨부한 사진</li>
      <li>비밀번호(암호화된 값)와 로그인 토큰(모든 기기에서 로그아웃), 푸시 알림 기기 정보</li>
      <li>팀 소속(모든 팀에서 나가요)</li>
      {{-- ★ v18.72 — AccountCleanupService::onWithdraw가 user_blocks의 양쪽 줄(차단한 기록·차단당한 기록)을 지움 --}}
      <li>차단 목록(내가 차단한 사람과 나를 차단한 기록 모두)</li>
    </ul>
    <p>이메일 주소는 누구인지 알 수 없는 값으로 바뀌고, 고객에게 보낸 보고서 · 견적서 공유 링크도 바로 열리지 않게 돼요.</p>
  </section>

  <section class="doc" id="kept">
    <h2>4. 탈퇴 후에도 남는 정보와 보관 기간</h2>
    <table class="tbl">
      <thead><tr><th>정보</th><th>남기는 이유</th><th>보관 기간</th></tr></thead>
      <tbody>
        <tr>
          <td>이름</td>
          <td data-k="이유">같은 팀원들의 과거 일정 · 정산 기록에 표시돼요.</td>
          <td data-k="기간">따로 정한 삭제 시점 없이 보관</td>
        </tr>
        <tr>
          <td>일정 · 현장(주소) · 공수 · 수입 · 견적 · 보고서 · 사진 등 업무 기록</td>
          <td data-k="이유">같은 팀원이 함께 쓰는 기록과 이어져 있어 지우지 않아요.</td>
          <td data-k="기간">따로 정한 삭제 시점 없이 보관(아래 안내처럼 직접 지우거나 삭제를 요청할 수 있어요)</td>
        </tr>
        <tr>
          <td>고객 문의 내용</td>
          <td data-k="이유">문의 응대 기록</td>
          <td data-k="기간">따로 정한 삭제 시점 없이 보관(삭제 요청 가능)</td>
        </tr>
        <tr>
          {{-- ★ v18.72 — content_reports는 처리 기록이라 탈퇴해도 남김(개인정보 처리방침 3항과 같게) --}}
          <td>신고 처리 기록(신고 내용 · 처리 결과)</td>
          <td data-k="이유">부적절한 게시물 처리와 분쟁 대응 기록</td>
          <td data-k="기간">따로 정한 삭제 시점 없이 보관</td>
        </tr>
        <tr>
          {{-- ★ v18.68 리뷰 반영 — 접속한 날(daily_active_users)·마지막 로그인 시각은 routes/console.php 'prune-withdrawn-login-records'가 매일 정리 --}}
          <td>로그인 기록(접속한 날짜 · 마지막 로그인 시각)</td>
          <td data-k="이유">통신비밀보호법</td>
          <td data-k="기간">3개월 뒤 자동 삭제</td>
        </tr>
        <tr>
          <td>계약 · 청약철회, 전자금융 거래 기록(해당하는 경우)</td>
          <td data-k="이유">전자상거래법 · 전자금융거래법</td>
          <td data-k="기간">5년</td>
        </tr>
        <tr>
          {{-- ★ v18.68 리뷰 반영 — 배포 전 수동 백업도 포함. 서버에서 14일 넘은 백업을 지우는 운영 작업 필요(docs/play-store-listing.md 9항) --}}
          <td>서버 백업본(매일 자동 백업 · 업데이트 전 수동 백업)</td>
          <td data-k="이유">장애 복구용</td>
          <td data-k="기간">만든 날부터 최대 14일 뒤 삭제</td>
        </tr>
      </tbody>
    </table>
    <p class="note">탈퇴 전에 지우고 싶은 기록은 앱에서 직접 삭제하거나 <span class="path">내정보 › 고객 문의</span>로 삭제를 요청할 수 있어요. 탈퇴한 뒤라면 위 이메일({{ $supportEmail }})로 요청해 주세요.</p>
    <p style="margin-top:12px">자세한 내용은 <a href="/privacy">개인정보 처리방침</a> 3항(보유 및 이용기간)을 확인해 주세요.</p>
  </section>
</main>
<footer><a href="/terms">이용약관</a> · <a href="/privacy">개인정보 처리방침</a> · <a href="/account-delete">계정 삭제</a> · <a href="/support">고객 지원</a> · <a href="/">현장메이트 소개</a></footer>
</body>
</html>
