<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $card->display_name ?? '명함' }} · Team Schedule Manager</title>

<!-- Open Graph — 카카오톡/문자 미리보기용 (기획서 3-2절) -->
<meta property="og:title" content="{{ $card->display_name ?? '기사' }}{{ $card->job_title ? ' — '.$card->job_title : '' }}">
<meta property="og:description" content="{{ $card->specialty ?? ($card->tagline ?? 'Team Schedule Manager 명함') }}">
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
    .gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; background: #eee; }
    .footer {
        text-align: center; padding: 28px 20px; color: #999; font-size: 11px; margin-top: 12px;
        border-top: 1px solid #eee;
    }
    .footer a { color: #1F3864; text-decoration: none; font-weight: 600; }
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

    @if($showcasePhotos->count() > 0)
    <div class="gallery-title">📷 시공 포트폴리오</div>
    <div class="gallery">
        @foreach($showcasePhotos as $url)
        <img src="{{ $url }}" alt="시공 사진">
        @endforeach
    </div>
    @endif

    <div class="footer">
        이 명함은 <a href="/">Team Schedule Manager</a>로 만들어졌습니다.
    </div>
</div>
</body>
</html>
