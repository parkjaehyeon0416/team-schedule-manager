<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>견적서 #{{ $quote->id }}</title>
<style>
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
    h1 { font-size: 22px; color: #1F3864; text-align: center; margin: 0 0 20px; letter-spacing: 4px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .meta-table td { padding: 5px 8px; border: 1px solid #ddd; }
    .meta-table td.label { width: 90px; background: #F5F7FA; font-weight: bold; }
    table.lines { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.lines th, table.lines td { border: 1px solid #ddd; padding: 6px 8px; }
    table.lines th { background: #1F3864; color: #fff; }
    table.lines td.num { text-align: right; }
    tr.total-row td { background: #F5F7FA; font-weight: bold; text-align: right; }
    .memo { margin-top: 14px; font-size: 11px; color: #555; white-space: pre-line; }
    .qr-block { text-align: center; margin-top: 20px; }
    .footer { margin-top: 24px; text-align: center; color: #999; font-size: 10px; }
</style>
</head>
<body>

<h1>견 적 서</h1>

<table class="meta-table">
    <tr>
        <td class="label">고객명</td><td>{{ $quote->client_name ?? '-' }}</td>
        <td class="label">연락처</td><td>{{ $quote->client_contact ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label">현장 주소</td>
        <td colspan="3">
            @if($quote->site)
                {{ $quote->site->apt_name }} {{ $quote->site->dong }}동 {{ $quote->site->ho }}호
            @else
                {{ $quote->address ?? '-' }}
            @endif
        </td>
    </tr>
    <tr>
        <td class="label">희망 시공일</td><td>{{ $quote->desired_date?->format('Y-m-d') ?? '미정' }}</td>
        <td class="label">작성일</td><td>{{ $quote->created_at->format('Y-m-d') }}</td>
    </tr>
</table>

<table class="lines">
    <thead>
        <tr>
            <th>항목</th>
            <th>규격/설명</th>
            <th>수량</th>
            <th>단위</th>
            <th>단가</th>
            <th>금액</th>
        </tr>
    </thead>
    <tbody>
        @foreach($quote->lines as $line)
        <tr>
            <td>{{ $line->name }}</td>
            <td>{{ $line->spec }}</td>
            <td class="num">{{ rtrim(rtrim(number_format($line->quantity, 2), '0'), '.') }}</td>
            <td>{{ $line->unit }}</td>
            <td class="num">{{ number_format($line->unit_price) }}원</td>
            <td class="num">{{ number_format($line->amount) }}원</td>
        </tr>
        @endforeach
        <tr class="total-row">
            <td colspan="5">소계</td>
            <td>{{ number_format($quote->subtotal_amount) }}원</td>
        </tr>
        @if($quote->discount_amount > 0)
        <tr class="total-row">
            <td colspan="5">할인</td>
            <td>- {{ number_format($quote->discount_amount) }}원</td>
        </tr>
        @endif
        <tr class="total-row">
            <td colspan="5" style="font-size:14px;">총 견적가</td>
            <td style="font-size:14px;">{{ number_format($quote->total_amount) }}원</td>
        </tr>
    </tbody>
</table>

@if($quote->memo)
<div class="memo">{{ $quote->memo }}</div>
@endif

@if($cardQrDataUri)
<div class="qr-block">
    <img src="{{ $cardQrDataUri }}" style="width:100px; height:100px;">
    <div style="font-size:10px; color:#888; margin-top:4px;">📲 {{ $user->name }} 기사 명함 — 바로 연락하기</div>
</div>
@endif

<div class="footer">
    이 견적서는 Team Schedule Manager로 작성되었습니다. · 생성일: {{ now()->format('Y-m-d H:i') }}
</div>

</body>
</html>
