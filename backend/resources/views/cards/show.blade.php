<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $card->display_name ?? '명함' }} · 현장메이트</title>
{{-- ★ v18.67 개인정보 — 휴대폰 번호가 적힌 페이지라 검색 사이트에 올라가지 않게(링크·QR을 받은 사람만 보도록).
     검색 결과에 남으면 명함을 지우거나 탈퇴한 뒤에도 캐시로 계속 보일 수 있음 --}}
<meta name="robots" content="noindex, nofollow">

<!-- Open Graph — 카카오톡/문자 미리보기용 (기획서 3-2절) -->
<meta property="og:title" content="{{ $card->display_name ?? '기사' }}{{ $card->job_title ? ' — '.$card->job_title : '' }}">
<meta property="og:description" content="{{ $card->specialty ?? ($card->tagline ?? '현장메이트 명함') }}">
<meta property="og:type" content="profile">

<style>
    * { box-sizing: border-box; }
    body {
        margin: 0; font-family: -apple-system, 'Malgun Gothic', sans-serif;
        background: #F0F2F5; color: #222;
    }
    .card {
        max-width: 420px; margin: 0 auto; background: #fff; min-height: 100vh;
    }
    .header {
        background: linear-gradient(135deg, #1F3864, #2E5090);
        color: #fff; text-align: center; padding: 40px 20px 28px;
    }
    .avatar {
        width: 84px; height: 84px; border-radius: 50%; background: rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        font-size: 32px; font-weight: 700; margin: 0 auto 12px; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .name { font-size: 20px; font-weight: 700; margin: 0; }
    .job { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .info { padding: 20px; }
    .info-row { display: flex; gap: 8px; font-size: 14px; margin-bottom: 10px; color: #444; }
    .info-icon { width: 20px; }
    .tagline {
        background: #F5F7FA; border-radius: 8px; padding: 12px 14px; font-size: 13px;
        color: #555; margin-top: 12px; white-space: pre-line;
    }
    .actions { padding: 0 20px 8px; display: flex; flex-direction: column; gap: 10px; }
    .btn {
        display: block; text-align: center; padding: 13px; border-radius: 8px;
        font-weight: 700; font-size: 14px; text-decoration: none;
    }
    .btn-primary { background: #1F3864; color: #fff; }
    .btn-secondary { background: #FEE500; color: #3C1E1E; }
    .gallery-title { padding: 20px 20px 8px; font-size: 14px; font-weight: 700; color: #1F3864; }
    .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 0 20px; }
    .gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; background: #eee; display: block; }
    /* ★ v18.68 — 시공 전·후 나란히 */
    .pairs { display: flex; flex-direction: column; gap: 8px; padding: 0 20px; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .shot { position: relative; margin: 0; }
    .shot img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; background: #eee; display: block; }
    .shot figcaption {
        position: absolute; left: 6px; top: 6px; padding: 2px 7px; border-radius: 10px;
        font-size: 11px; font-weight: 700; color: #fff; background: rgba(16, 42, 86, 0.72);
    }
    .shot.after figcaption { background: rgba(10, 108, 224, 0.88); }
    .footer {
        text-align: center; padding: 28px 20px; color: #999; font-size: 11px; margin-top: 12px;
        border-top: 1px solid #eee;
    }
    .footer a { color: #1F3864; text-decoration: none; font-weight: 600; }
    .footer .report { margin-top: 6px; word-break: break-all; }
    .footer .report a { font-weight: 400; color: #999; text-decoration: underline; }
</style>
</head>
<body>
<div class="card">
    <div class="header">
        <div class="avatar">
            @if($card->profile_photo_path)
                <img src="{{ \Illuminate\Support\Facades\Storage::disk('public')->url($card->profile_photo_path) }}" alt="">
            @else
                {{ mb_substr($card->display_name ?? '?', 0, 1) }}
            @endif
        </div>
        <p class="name">{{ $card->display_name ?? '이름 미입력' }}</p>
        <p class="job">
            {{ $card->job_title ?? '' }}
            @if($card->years_experience) · {{ $card->years_experience }}년차 @endif
        </p>
    </div>

    <div class="info">
        @if($card->service_area)
        <div class="info-row"><span class="info-icon">📍</span><span>{{ $card->service_area }}</span></div>
        @endif
        @if($card->specialty)
        <div class="info-row"><span class="info-icon">🎯</span><span>{{ $card->specialty }}</span></div>
        @endif
        @if($card->tagline)
        <div class="tagline">{{ $card->tagline }}</div>
        @endif
    </div>

    <div class="actions">
        @if($card->contact_phone)
        <a class="btn btn-primary" href="tel:{{ $card->contact_phone }}">📞 전화하기 ({{ $card->contact_phone }})</a>
        @endif
    </div>

    {{-- ★ v18.68 현장 사진 공개 — 명함 주인이 고른 범위(시공 후만 / 전·후 모두)만.
         원본(/storage/…, 촬영 위치 EXIF 포함) 대신 /c/{code}/p/{id}의 줄인 사진만 씀.
         고객 이름·현장 주소·날짜·사진 설명은 넣지 않음 --}}
    @if(count($showcase) > 0)
    <div class="gallery-title">📷 시공 포트폴리오</div>
    @if(isset($showcase[0]['before']))
    <div class="pairs">
        @foreach($showcase as $pair)
        <div class="pair">
            <figure class="shot before">
                <img src="/c/{{ $card->share_code }}/p/{{ $pair['before']->id }}" alt="시공 전 사진" loading="lazy" decoding="async">
                <figcaption>시공 전</figcaption>
            </figure>
            <figure class="shot after">
                <img src="/c/{{ $card->share_code }}/p/{{ $pair['after']->id }}" alt="시공 후 사진" loading="lazy" decoding="async">
                <figcaption>시공 후</figcaption>
            </figure>
        </div>
        @endforeach
    </div>
    @else
    <div class="gallery">
        @foreach($showcase as $item)
        <img src="/c/{{ $card->share_code }}/p/{{ $item['after']->id }}" alt="시공 후 사진" loading="lazy" decoding="async">
        @endforeach
    </div>
    @endif
    @endif

    <div class="footer">
        이 명함은 <a href="/">현장메이트</a>로 만들어졌습니다.
        {{-- ★ v18.72 — 부적절한 명함 신고 창구(메일 제목에 명함 코드를 넣어 운영자가 어떤 명함인지 바로 알 수 있게) --}}
        <div class="report">부적절한 내용 신고: <a href="mailto:{{ $supportEmail }}?subject={{ rawurlencode('현장메이트 명함 신고 ' . $card->share_code) }}">{{ $supportEmail }}</a></div>
    </div>
</div>
</body>
</html>
