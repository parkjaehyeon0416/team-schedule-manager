{{-- ★ v18.67 — 웹페이지(초대 링크 /join 등) 요청이 너무 많을 때. 429 (Laravel이 웹 429 응답에 자동으로 씀) --}}
@extends('web.layout')

@section('title', '잠시 후 다시 시도')

@section('meta')
<meta name="robots" content="noindex">
@endsection

@section('content')
<main class="wrap">
  <div class="hero">
    <h1>잠시 후 다시 열어주세요</h1>
    <p class="lead">짧은 시간에 요청이 너무 많았어요.<br>1분쯤 뒤에 다시 시도해주세요.</p>
  </div>
</main>
@endsection
