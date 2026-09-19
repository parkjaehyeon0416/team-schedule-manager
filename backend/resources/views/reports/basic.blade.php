<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>{{ $report->title }}</title>
<style>
    /* DomPDF 기본 내장 폰트는 한글(Hangul) 글리프가 없어 '?'로 깨짐 —
       윈도우 기본 한글 폰트(맑은 고딕)를 직접 임베드해서 해결. */
    @font-face {
        font-family: 'malgun';
        src: url('{{ public_path('fonts/malgun.ttf') }}');
        font-weight: normal;
    }
    @font-face {
        font-family: 'malgun';
        src: url('{{ public_path('fonts/malgunbd.ttf') }}');
        font-weight: bold;
    }
    @page { margin: 28px 32px; }
    body { font-family: 'malgun', sans-serif; font-size: 12px; color: #222; }
    h1 { font-size: 20px; color: #1F3864; margin: 0 0 4px; }
    h2 { font-size: 14px; color: #1F3864; border-bottom: 1px solid #1F3864; padding-bottom: 4px; margin-top: 20px; }
    .cover { text-align: center; margin-bottom: 24px; }
    .cover .subtitle { color: #666; font-size: 12px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .meta-table td { padding: 4px 8px; border: 1px solid #ddd; }
    .meta-table td.label { width: 90px; background: #F5F7FA; font-weight: bold; }
    .greeting { background: #FFF7E6; border: 1px solid #F5A623; border-radius: 4px; padding: 10px 14px; margin: 12px 0; white-space: pre-line; }
    .photo-section { margin-top: 10px; }
    .photo-row { width: 100%; }
    .photo-cell { display: inline-block; width: 32%; margin: 0 0.5% 8px; vertical-align: top; text-align: center; }
    .photo-cell img { width: 100%; height: 110px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; }
    .photo-cell .cap { font-size: 10px; color: #888; margin-top: 2px; }
    .compare-pair { width: 100%; margin-bottom: 10px; }
    .compare-cell { display: inline-block; width: 48%; text-align: center; }
    .compare-cell img { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; }
    .compare-label { font-size: 11px; font-weight: bold; margin-bottom: 3px; }
    .footer { margin-top: 24px; text-align: center; color: #999; font-size: 10px; }
</style>
</head>
<body>

<div class="cover">
    <h1>{{ $report->title }}</h1>
    <div class="subtitle">Team Schedule Manager · 시공 완료 보고서</div>
</div>

<table class="meta-table">
    <tr>
        <td class="label">고객명</td><td>{{ $report->client_name ?? '-' }}</td>
        <td class="label">연락처</td><td>{{ $report->client_contact ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label">현장</td>
        <td colspan="3">
            @if($site)
                {{ $site->apt_name }} {{ $site->dong }}동 {{ $site->ho }}호 ({{ $site->address }})
            @else
                -
            @endif
        </td>
    </tr>
    <tr>
        <td class="label">작업일</td><td>{{ $schedule->date }}</td>
        <td class="label">공정</td><td>{{ $schedule->work_type ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label">면적</td><td>{{ $schedule->area_m2 ? $schedule->area_m2.'㎡' : '-' }}</td>
        <td class="label">공수</td><td>{{ $schedule->work_units ?? '-' }}</td>
    </tr>
</table>

@if($report->greeting_message)
<div class="greeting">{{ $report->greeting_message }}</div>
@endif

@if($pairs->count() > 0)
<h2>시공 전 · 후 비교</h2>
@foreach($pairs as $pair)
<div class="compare-pair">
    <div class="compare-cell">
        <div class="compare-label" style="color:#C00000;">시공 전</div>
        <img src="{{ $pair['before']->absolute_path }}">
    </div>
    <div class="compare-cell">
        <div class="compare-label" style="color:#385723;">시공 후</div>
        <img src="{{ $pair['after']->absolute_path }}">
    </div>
</div>
@endforeach
@endif

@foreach(['before' => '시공 전', 'during' => '시공 중', 'after' => '시공 후', 'other' => '기타'] as $cat => $label)
    @if(($photosByCategory[$cat] ?? collect())->count() > 0)
    <h2>{{ $label }} 사진 ({{ $photosByCategory[$cat]->count() }}장)</h2>
    <div class="photo-section">
        @foreach($photosByCategory[$cat] as $photo)
        <div class="photo-cell">
            <img src="{{ $photo->absolute_path }}">
            @if($photo->description)
            <div class="cap">{{ $photo->description }}</div>
            @endif
        </div>
        @endforeach
    </div>
    @endif
@endforeach

<div class="footer">
    본 보고서는 Team Schedule Manager에서 자동 생성되었습니다. · 생성일: {{ now()->format('Y-m-d H:i') }}
</div>

</body>
</html>
