<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{-- ★ v18.70 고객 지원 페이지 (App Store "지원 URL") — 계정 삭제 안내(web/account-delete)와 같은 틀. 연락처·자주 묻는 질문·문서 링크 --}}
<title>고객 지원 · 현장메이트</title>
<meta name="description" content="현장메이트 앱 문의 방법과 자주 묻는 질문(로그인, 비밀번호 찾기, 팀 초대, 회원 탈퇴)을 안내해요.">
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
<body>
<header><div class="bar"><a href="/"><img src="/img/web/logo.png" alt="현장메이트"><span>현장<b>메이트</b></span></a></div></header>
<main>
  <h1>현장메이트 고객 지원</h1>
  <p class="lead">앱을 쓰다가 궁금한 점이나 불편한 점이 있으면 아래 방법으로 알려 주세요. 확인하는 대로 답변드려요.</p>

  <div class="id">
    <img src="/img/web/logo.png" alt="">
    <dl>
      <dt>앱 이름</dt><dd>현장메이트</dd>
      <dt>운영자</dt><dd>{{ $developer }} (개인 개발자)</dd>
      <dt>이메일</dt><dd><a href="mailto:{{ $supportEmail }}">{{ $supportEmail }}</a></dd>
    </dl>
  </div>

  <section class="doc" id="contact">
    <h2>문의하는 방법</h2>
    <ol>
      <li><b>앱에서 문의하기</b> <small style="color:#0A6CE0;font-weight:700">가장 빨라요</small><br>
        아래 탭 <span class="path">내정보</span> › <span class="path">고객 문의</span>에서 사진을 붙여 문의를 남길 수 있어요. 답변이 오면 알림으로 알려 드려요.</li>
      <li><b>이메일로 문의하기</b><br>
        로그인이 안 되거나 앱을 쓸 수 없을 때는 이메일로 보내 주세요. 가입한 이메일이나 휴대폰 번호, 쓰는 휴대폰 기종을 함께 적어 주시면 더 빨리 확인할 수 있어요.<br>
        <a class="mail" href="mailto:{{ $supportEmail }}?subject=%5B%ED%98%84%EC%9E%A5%EB%A9%94%EC%9D%B4%ED%8A%B8%5D%20%EB%AC%B8%EC%9D%98">{{ $supportEmail }} 으로 메일 보내기</a></li>
    </ol>
    <p class="note">전화 상담은 하지 않아요. 비밀번호나 인증번호는 문의할 때 절대 적지 마세요 — 현장메이트는 비밀번호를 묻지 않아요.</p>
  </section>

  <section class="doc" id="faq">
    <h2>자주 묻는 질문</h2>
    <p><b>Q. 아이디(이메일)나 비밀번호를 잊어버렸어요.</b><br>
      로그인 화면 아래의 <span class="path">아이디 찾기</span> · <span class="path">비밀번호 찾기</span>를 눌러 주세요. 가입할 때 등록한 휴대폰 번호로 받은 문자 인증번호로 확인해요. 카카오 · 구글 · Apple로 가입했다면 그 버튼으로 로그인하면 돼요.</p>
    <p><b>Q. 인증번호 문자가 오지 않아요.</b><br>
      휴대폰 번호를 다시 확인하고 1분쯤 뒤 <span class="path">다시 받기</span>를 눌러 주세요. 인증번호를 여러 번 틀리면 잠시 막혀요(최대 1시간). 계속 안 오면 위 이메일로 알려 주세요.</p>
    <p><b>Q. 팀에 참여하려면 어떻게 하나요?</b><br>
      팀장에게 받은 초대 링크를 누르거나, 앱에서 <span class="path">팀 참여</span> 화면에 6자리 초대 코드를 입력해요. 초대 코드는 7일 동안 쓸 수 있어요.</p>
    <p><b>Q. 예상 원천세는 정확한 세금인가요?</b><br>
      입력한 일당 · 공수로 계산한 참고용 금액이에요. 실제 세금 신고는 홈택스나 세무사를 통해 진행해 주세요.</p>
    <p><b>Q. 회원 탈퇴는 어떻게 하나요?</b><br>
      앱의 <span class="path">내정보</span> › <span class="path">앱 정보</span> › <span class="path">회원 탈퇴</span>에서 할 수 있어요. 앱 없이 요청하는 방법과 삭제되는 정보는 <a href="/account-delete">계정 삭제 안내</a>를 확인해 주세요.</p>
    <p style="margin-bottom:0"><b>Q. 요금이 있나요?</b><br>
      지금은 모든 기능을 무료로 쓸 수 있어요. 유료 요금제가 생기면 앱에서 미리 안내해 드려요.</p>
  </section>

  <section class="doc" id="docs">
    <h2>안내 문서</h2>
    <ul>
      <li><a href="/terms">이용약관</a></li>
      <li><a href="/privacy">개인정보 처리방침</a></li>
      <li><a href="/account-delete">계정 삭제 안내</a></li>
    </ul>
  </section>
</main>
<footer><a href="/terms">이용약관</a> · <a href="/privacy">개인정보 처리방침</a> · <a href="/account-delete">계정 삭제</a> · <a href="/support">고객 지원</a> · <a href="/">현장메이트 소개</a></footer>
</body>
</html>
