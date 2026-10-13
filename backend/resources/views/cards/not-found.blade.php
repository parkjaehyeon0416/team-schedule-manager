{{-- ★ v18.67 — 없는 명함(잘못된 주소·삭제·비공개·주인 탈퇴/정지)을 열었을 때. 404
     이유는 구분해서 보여주지 않음(탈퇴 여부가 드러나지 않게) --}}
@extends('web.layout')

@section('title', '없는 명함')

@section('meta')
<meta name="robots" content="noindex">
@endsection

@section('content')
<main class="wrap">
  <div class="hero">
    <h1>명함을 찾을 수 없어요</h1>
    <p class="lead">주소가 잘못됐거나, 명함이 삭제·비공개 처리됐어요.<br>명함을 보낸 분께 다시 확인해 주세요.</p>
  </div>
</main>
@endsection
