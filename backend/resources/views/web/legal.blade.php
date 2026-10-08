<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{-- ★ v18.48 웹 이용약관·개인정보 처리방침 — 앱(LegalDocumentScreen)과 같은 문구(scripts/sync-legal.js로 복사) --}}
<title>{{ $title }} · 현장메이트</title>
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
h1 { margin: 0 0 20px; font-size: 28px; font-weight: 800; letter-spacing: -0.6px; }
.doc { background: #FFFFFF; border: 1px solid #E3ECF6; border-radius: 18px; padding: 28px; font-size: 15px; line-height: 1.8; color: #3B4F70; white-space: pre-line; word-break: keep-all; }
footer { text-align: center; padding: 0 20px 40px; font-size: 13px; color: #5F7290; }
footer a { color: #0A6CE0; text-decoration: none; margin: 0 8px; }
@media (max-width: 600px) { h1 { font-size: 23px; } .doc { padding: 20px; font-size: 14px; } }
</style>
</head>
<body>
<header><div class="bar"><a href="/"><img src="/img/web/logo.png" alt="현장메이트"><span>현장<b>메이트</b></span></a></div></header>
<main>
  <h1>{{ $title }}</h1>
  <div class="doc">{{ $body }}</div>
</main>
<footer><a href="/terms">이용약관</a> · <a href="/privacy">개인정보 처리방침</a> · <a href="/">현장메이트 소개</a></footer>
</body>
</html>
