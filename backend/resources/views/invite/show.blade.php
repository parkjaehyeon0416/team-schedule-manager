<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{-- ★ v18.43 팀 초대 링크 페이지 — 임시 디자인(앱 색상 기준). 디자인 받으면 교체 --}}
<title>{{ $team ? $team->name.' 팀 초대' : '초대 링크' }} · WorkMate</title>
<meta property="og:title" content="{{ $team ? '['.$team->name.'] 팀에 초대합니다' : 'WorkMate 팀 초대' }}">
<meta property="og:description" content="WorkMate 앱에서 초대 코드 {{ $code }}로 바로 참여할 수 있어요.">
<meta property="og:type" content="website">
<style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, 'Malgun Gothic', sans-serif; background: #F7FBFF; color: #102A56; }
    .wrap { max-width: 420px; margin: 0 auto; min-height: 100vh; padding: 48px 20px 32px; display: flex; flex-direction: column; gap: 20px; }
    .brand { font-size: 15px; font-weight: 800; color: #0A6CE0; text-align: center; }
    .card { background: #fff; border: 1px solid #DCE9F7; border-radius: 18px; padding: 28px 20px; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 20px; background: #E8F3FF; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; }
    .lead { font-size: 13px; color: #5B6B84; margin: 0 0 6px; }
    .team { font-size: 22px; font-weight: 800; margin: 0; word-break: keep-all; }
    .meta { font-size: 13px; color: #5B6B84; margin: 8px 0 0; }
    .code-box { margin-top: 20px; padding: 14px; border-radius: 12px; background: #F3F8FE; }
    .code-label { font-size: 12px; color: #5B6B84; }
    .code { font-size: 28px; font-weight: 800; letter-spacing: 6px; margin-top: 4px; }
    .btn { display: block; width: 100%; text-align: center; padding: 15px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; font-family: inherit; }
    .btn-primary { background: linear-gradient(#2492FF, #0A6CE0); color: #fff; }
    .btn-line { background: #fff; color: #0A6CE0; border: 1px solid #BFDBFB; }
    .steps { font-size: 13px; color: #5B6B84; line-height: 1.7; padding: 0 4px; }
    .steps b { color: #102A56; }
    .steps a { color: #0A6CE0; font-weight: 700; }
    .toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%); background: #102A56; color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 13px; display: none; }
</style>
</head>
<body>
<div class="wrap">
    <div class="brand">WorkMate</div>

    @if($team)
    <div class="card">
        <div class="icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0A6CE0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
        </div>
        <p class="lead">함께 일할 팀에 초대받았어요</p>
        <p class="team">{{ $team->name }}</p>
        <p class="meta">팀원 {{ $memberCount }}명</p>
        <div class="code-box">
            <div class="code-label">초대 코드</div>
            <div class="code" id="code">{{ $code }}</div>
        </div>
    </div>

    <a class="btn btn-primary" href="{{ $appLink }}">앱에서 열고 바로 참여하기</a>
    <button class="btn btn-line" type="button" onclick="copyCode()">초대 코드 복사</button>

    <div class="steps">
        <b>앱이 없으신가요?</b><br>
        1. <a href="{{ $downloadUrl }}">WorkMate 앱 설치하기</a><br>
        2. 회원가입 후 <b>팀 관리 → 코드로 참여</b><br>
        3. 초대 코드 <b>{{ $code }}</b> 입력
    </div>
    @else
    <div class="card">
        <p class="team">초대 링크가 올바르지 않아요</p>
        <p class="meta">팀이 해체되었거나 코드가 바뀌었을 수 있어요.<br>초대한 분께 새 링크를 요청해 주세요.</p>
    </div>
    @endif
</div>
<div class="toast" id="toast">초대 코드를 복사했어요</div>
<script>
function copyCode() {
    var code = document.getElementById('code').textContent.trim();
    var done = function () { var t = document.getElementById('toast'); t.style.display = 'block'; setTimeout(function () { t.style.display = 'none'; }, 1800); };
    if (navigator.clipboard) { navigator.clipboard.writeText(code).then(done, function () { prompt('초대 코드', code); }); }
    else { prompt('초대 코드', code); }
}
</script>
</body>
</html>
