{{-- ★ v18.63 — 만료된 공유 링크(보고서 등)를 열었을 때. 410 Gone --}}
@extends('web.layout')

@section('title', '링크 만료')

@section('meta')
<meta name="robots" content="noindex">
@endsection

@section('content')
<main class="wrap">
  <div class="hero">
    <h1>링크가 만료됐어요</h1>
    <p class="lead">{{ $what ?? '자료' }} 공유 링크는 보안을 위해 3일 동안만 열려요.<br>보낸 분께 다시 공유해 달라고 요청해주세요.</p>
  </div>
</main>
@endsection
