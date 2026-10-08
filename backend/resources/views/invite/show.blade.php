@extends('web.layout')
{{-- ★ v18.43 팀 초대 링크 페이지 — 디자인 WEB_INVITE / WEB_INVITE_M --}}

@section('title', $team ? $team->name . ' 팀 초대' : '초대 링크')

@section('meta')
<meta property="og:title" content="{{ $team ? '['.$team->name.'] 팀에 초대합니다' : '현장메이트 팀 초대' }}">
<meta property="og:description" content="현장메이트 앱에서 초대 코드 {{ $code }}로 바로 참여할 수 있어요.">
<meta property="og:type" content="website">
@endsection

@section('style')
.code-box { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px; border-radius: 16px; background: #F3F9FF; border: 1px dashed #9CC9FA; }
.code-box .label { font-size: 12px; color: #5F7290; font-weight: 600; }
.code-box .code { font-size: 32px; font-weight: 800; letter-spacing: 8px; }
.copy { height: 34px; padding: 0 14px; border-radius: 17px; border: 1px solid #BFDBFB; background: #fff; color: #0A6CE0; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.copied { height: 34px; display: none; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #0B8574; }
.team-row { display: flex; align-items: center; gap: 14px; }
.team-row .name { font-size: 19px; font-weight: 800; }
.team-row .sub { font-size: 13px; color: #5F7290; }
.stores { display: flex; gap: 8px; flex-wrap: wrap; }
@endsection

@section('content')
@if($team)
<main class="wrap">
  <div class="hero">
    @if($inviter)
    <span class="pill"><span class="ava" style="width:24px;height:24px;font-size:9px">{{ mb_substr($inviter, 0, 1) }}</span>{{ $inviter }}님이 초대했어요</span>
    @endif
    <h1>{{ $team->name }}에서<br>함께 일해요</h1>
    <p class="lead">현장메이트에서 팀 일정을 함께 보고,<br>내 수입과 현장을 한 곳에서 관리할 수 있어요.</p>
    <ol class="steps">
      <li><span class="num">1</span><span class="t"><b>앱 설치하기</b><small>아래 버튼으로 현장메이트를 설치해요</small></span></li>
      <li><span class="num">2</span><span class="t"><b>로그인 또는 가입</b><small>1분이면 가입할 수 있어요</small></span></li>
      <li><span class="num">3</span><span class="t"><b>초대 코드 입력</b><small>앱에서 열면 코드가 자동으로 입력돼요</small></span></li>
    </ol>
  </div>

  <section class="card">
    <div class="team-row">
      <span class="ava" style="width:56px;height:56px;font-size:21px">{{ mb_substr($team->name, 0, 1) }}</span>
      <span style="display:flex;flex-direction:column;gap:3px">
        <span class="name">{{ $team->name }}</span>
        <span class="sub">{{ collect(['팀원 '.$memberCount.'명', $team->specialty ? str_replace(',', ' · ', $team->specialty) : null, $team->activity_area])->filter()->implode(' · ') }}</span>
      </span>
    </div>

    <div class="code-box">
      <span class="label">초대 코드</span>
      <span class="code" id="code">{{ $code }}</span>
      <button type="button" class="copy" id="copyBtn" onclick="copyCode()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>코드 복사
      </button>
      <span class="copied" id="copied" role="status"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0B8574" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>복사했어요</span>
      <span class="label" style="font-weight:500">{{ $team->invite_expires_at->format('Y.m.d') }}까지 사용할 수 있어요</span>
    </div>

    <a class="btn btn-primary" href="{{ $appLink }}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>현장메이트 앱에서 열기
    </a>
    <div class="stores">
      @if($appStoreUrl)
      <a class="btn btn-dark" href="{{ $appStoreUrl }}"><small>iPhone</small>App Store</a>
      @endif
      <a class="btn btn-dark" href="{{ $androidUrl }}"><small>Android</small>{{ $playStoreUrl ? 'Google Play' : '앱 설치 파일 받기' }}</a>
    </div>
    <span class="muted">이미 앱이 있다면 “앱에서 열기”를 누르면 바로 팀 참여 화면으로 이동해요.</span>
  </section>
</main>
@else
<main class="wrap" style="justify-content:center">
  <section class="card" style="text-align:center;align-items:center">
    <h1 style="font-size:24px">초대 링크가 만료됐어요</h1>
    <p class="lead" style="font-size:14px">초대 링크는 7일 동안만 쓸 수 있어요.<br>초대한 분께 새 링크를 요청해 주세요.</p>
  </section>
</main>
@endif
@endsection

@section('footer', '초대를 요청하지 않았다면 이 페이지를 닫아주세요 · © 현장메이트')

@section('script')
<script>
function copyCode() {
  var code = document.getElementById('code').textContent.trim();
  var done = function () {
    document.getElementById('copyBtn').style.display = 'none';
    document.getElementById('copied').style.display = 'flex';
  };
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function () { prompt('초대 코드', code); });
  else prompt('초대 코드', code);
}
</script>
@endsection
