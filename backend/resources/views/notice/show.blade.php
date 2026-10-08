@extends('web.layout')
{{-- ★ v18.43 문자 속 공지·이벤트 바로가기 페이지 (초대 페이지 WEB_INVITE와 같은 스타일) --}}

@section('title', $notice->title)

@section('meta')
<meta property="og:title" content="{{ $notice->title }}">
<meta property="og:description" content="{{ $notice->summary ?? '현장메이트 ' . ($notice->type === 'event' ? '이벤트' : '공지사항') }}">
<meta property="og:type" content="article">
@endsection

@section('style')
.badge { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 7px; font-size: 12px; font-weight: 700; }
.body { font-size: 15px; line-height: 1.8; color: #102A56; white-space: pre-line; word-break: keep-all; }
.banner { width: 100%; border-radius: 16px; display: block; }
.info { display: flex; flex-direction: column; border: 1px solid #E3ECF6; border-radius: 14px; padding: 4px 16px; }
.info div { display: flex; gap: 12px; padding: 9px 0; border-bottom: 1px solid #EDF3FA; font-size: 14px; }
.info div:last-child { border-bottom: 0; }
.info span { width: 56px; color: #5F7290; flex-shrink: 0; }
@endsection

@section('content')
<main class="wrap" style="align-items:flex-start">
  <div class="hero" style="text-align:left;align-items:flex-start">
    @if($notice->type === 'event')
      <span class="badge" style="background:#FFF2E2;color:#B95E00">이벤트</span>
    @else
      <span class="badge" style="background:#E8F3FF;color:#0A6CE0">공지</span>
    @endif
    <h1 style="font-size:32px">{{ $notice->title }}</h1>
    @if($notice->summary)<p class="lead">{{ $notice->summary }}</p>@endif
    @if($notice->banner_path)<img class="banner" src="/storage/{{ $notice->banner_path }}" alt="">@endif
    @if($notice->type === 'event' && ($notice->starts_at || $notice->ends_at) || !empty($notice->info))
    <div class="info" style="width:100%">
      @if($notice->type === 'event' && ($notice->starts_at || $notice->ends_at))
        <div><span>기간</span>{{ $notice->starts_at?->format('Y.m.d') }} ~ {{ $notice->ends_at?->format('Y.m.d') }}</div>
      @endif
      @foreach($notice->info ?? [] as $row)
        <div><span>{{ $row['label'] ?? '' }}</span>{{ $row['value'] ?? '' }}</div>
      @endforeach
    </div>
    @endif
    {{-- 본문 꾸밈 기호(**굵게** 등)는 웹에선 글자만 보여줌 --}}
    <div class="body">{{ preg_replace('/(\*\*|__|\*)/', '', (string) $notice->body) }}</div>
  </div>

  <section class="card">
    <span style="font-size:17px;font-weight:800">현장메이트 앱에서 자세히 보기</span>
    <span class="lead" style="font-size:14px">앱에서는 {{ $notice->type === 'event' ? '이벤트 참여까지' : '다른 공지와 알림까지' }} 한 번에 확인할 수 있어요.</span>
    <a class="btn btn-primary" href="{{ $appLink }}">현장메이트 앱에서 열기</a>
    <div class="stores" style="display:flex;gap:8px;flex-wrap:wrap">
      @if($appStoreUrl)
      <a class="btn btn-dark" href="{{ $appStoreUrl }}"><small>iPhone</small>App Store</a>
      @endif
      <a class="btn btn-dark" href="{{ $androidUrl }}"><small>Android</small>{{ $playStoreUrl ? 'Google Play' : '앱 설치 파일 받기' }}</a>
    </div>
  </section>
</main>
@endsection
