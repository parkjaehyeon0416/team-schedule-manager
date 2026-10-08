<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{-- ★ v18.43 웹 페이지 공통 틀 (디자인 WEB_INVITE / WEB_INVITE_M) — 초대 링크, 공지 바로가기 링크에서 사용 --}}
<title>@yield('title') · 현장메이트</title>
@yield('meta')
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Pretendard','Noto Sans KR',system-ui,sans-serif; color: #102A56; -webkit-font-smoothing: antialiased; }
a { color: #0A6CE0; }
.page { min-height: 100vh; background: linear-gradient(180deg,#EAF4FF 0%,#F7FBFF 55%,#FFFFFF 100%); display: flex; flex-direction: column; align-items: center; }
.top { width: 100%; max-width: 1080px; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand img { width: 36px; height: 36px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(10,108,224,0.16)); }
.brand span { font-size: 20px; font-weight: 800; letter-spacing: -0.4px; color: #102A56; }
.brand b { color: #0A6CE0; }
.wrap { width: 100%; max-width: 1080px; padding: 40px 24px 48px; display: flex; gap: 48px; align-items: center; }
.hero { flex: 1 1 420px; display: flex; flex-direction: column; gap: 18px; align-items: flex-start; }
.pill { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 4px; border-radius: 16px; background: #fff; border: 1px solid #E3ECF6; font-size: 13px; font-weight: 600; }
.ava { border-radius: 50%; background: #FFE3C2; color: #B95E00; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
h1 { margin: 0; font-size: 40px; font-weight: 800; line-height: 1.3; letter-spacing: -0.8px; word-break: keep-all; }
.lead { margin: 0; font-size: 16px; line-height: 1.7; color: #5F7290; }
.steps { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
.steps li { display: flex; gap: 12px; align-items: flex-start; }
.num { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(180deg,#2492FF,#0A6CE0); color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.steps span.t { display: flex; flex-direction: column; gap: 2px; padding-top: 3px; }
.steps b { font-size: 14px; } .steps small { font-size: 13px; color: #5F7290; }
.card { flex: 1 1 420px; max-width: 460px; width: 100%; background: #fff; border: 1px solid #E3ECF6; border-radius: 22px; padding: 28px; box-shadow: 0 16px 40px rgba(16,42,86,0.10); display: flex; flex-direction: column; gap: 18px; }
.btn { height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; font-family: inherit; }
.btn-primary { background: linear-gradient(180deg,#2492FF,#0A6CE0); color: #fff; box-shadow: 0 6px 14px rgba(10,108,224,0.22); }
.btn-dark { flex: 1 1 0; min-width: 150px; background: #102A56; color: #fff; flex-direction: column; gap: 0; line-height: 1.2; }
.btn-dark small { font-size: 10px; opacity: .8; font-weight: 500; }
.muted { font-size: 12px; color: #5F7290; text-align: center; }
.features { width: 100%; max-width: 1080px; padding: 0 24px 56px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px,100%),1fr)); gap: 12px; }
.feat { display: flex; gap: 12px; align-items: center; padding: 16px; border-radius: 16px; background: #fff; border: 1px solid #E3ECF6; }
.feat img { width: 44px; height: 44px; object-fit: contain; flex-shrink: 0; }
.feat span { display: flex; flex-direction: column; gap: 2px; } .feat b { font-size: 14px; } .feat small { font-size: 12px; color: #5F7290; }
footer { width: 100%; padding: 20px 24px 32px; text-align: center; font-size: 12px; color: #5F7290; }
@media (max-width: 860px) {
  .wrap { flex-direction: column; gap: 24px; padding-top: 16px; }
  /* 세로 배치에선 flex-basis 420px가 높이로 적용돼 타이틀 아래가 크게 비었음 → 내용 높이만큼만 */
  .hero, .card { flex: 0 0 auto; }
  .hero { text-align: center; align-items: center; }
  h1 { font-size: 28px; }
  .steps { display: none; }
}
@yield('style')
</style>
</head>
<body>
<div class="page">
  <header class="top">
    <a class="brand" href="{{ url('/download/latest') }}"><img src="/img/web/logo.png" alt="현장메이트"><span>현장<b>메이트</b></span></a>
  </header>
  @yield('content')
  <section class="features">
    <div class="feat"><img src="/img/web/schedule.png" alt=""><span><b>팀 일정 공유</b><small>개인 · 팀 일정을 한 달력에</small></span></div>
    <div class="feat"><img src="/img/web/income.png" alt=""><span><b>내 수입 정리</b><small>공수 · 단가로 자동 계산</small></span></div>
    <div class="feat"><img src="/img/web/quote.png" alt=""><span><b>견적서 작성</b><small>고객에게 바로 발송</small></span></div>
    <div class="feat"><img src="/img/web/tax.png" alt=""><span><b>세무 자료</b><small>엑셀로 한 번에 내보내기</small></span></div>
  </section>
  <footer>@yield('footer', '© 현장메이트')</footer>
</div>
@yield('script')
</body>
</html>
