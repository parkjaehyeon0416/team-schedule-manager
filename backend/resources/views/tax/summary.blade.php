<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>{{ $year }}년 수입·경비 정리</title>
<style>
    @font-face {
        font-family: 'nanumgothic';
        src: url('{{ public_path('fonts/NanumGothic-Regular.ttf') }}');
        font-weight: normal;
    }
    @font-face {
        font-family: 'nanumgothic';
        src: url('{{ public_path('fonts/NanumGothic-Bold.ttf') }}');
        font-weight: bold;
    }
    @page { margin: 28px 32px; }
    body { font-family: 'nanumgothic', sans-serif; font-size: 12px; color: #222; }
    h1 { font-size: 19px; color: #1F3864; margin: 0 0 4px; }
    .subtitle { color: #666; font-size: 12px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; }
    th { background: #1F3864; color: #fff; font-weight: bold; text-align: center; }
    td.label { text-align: center; }
    tr.total td { background: #F5F7FA; font-weight: bold; }
    .split { margin-top: 8px; text-align: right; font-size: 11px; color: #555; } /* ★ v18.66 */
    .note {
        margin-top: 16px; font-size: 10px; color: #888; line-height: 1.6;
    }
    .footer { margin-top: 24px; text-align: center; color: #999; font-size: 10px; }
</style>
</head>
<body>

<h1>{{ $year }}년 수입·경비 정리</h1>
<div class="subtitle">{{ $user->name }} · 생성일: {{ now()->format('Y-m-d H:i') }}</div>

<table>
    <thead>
        <tr>
            <th>월</th>
            <th>근무일수</th>
            <th>총 공수</th>
            <th>총 수입</th>
            <th>총 경비</th>
            <th>예상 원천징수액</th>
            <th>실수령액</th>
        </tr>
    </thead>
    <tbody>
        @foreach($months as $m)
        <tr>
            <td class="label">{{ $m['month'] }}월</td>
            <td>{{ $m['work_days'] }}일</td>
            <td>{{ number_format($m['total_work_units'], 1) }}</td>
            <td>{{ number_format($m['total_income']) }}원</td>
            <td>{{ number_format($m['total_expenses']) }}원</td>
            <td>{{ number_format($m['estimated_tax']) }}원</td>
            <td>{{ number_format($m['net_income']) }}원</td>
        </tr>
        @endforeach
        <tr class="total">
            <td class="label">합계</td>
            <td>{{ $totals['work_days'] }}일</td>
            <td>{{ number_format($totals['total_work_units'], 1) }}</td>
            <td>{{ number_format($totals['total_income']) }}원</td>
            <td>{{ number_format($totals['total_expenses']) }}원</td>
            <td>{{ number_format($totals['estimated_tax']) }}원</td>
            <td>{{ number_format($totals['net_income']) }}원</td>
        </tr>
    </tbody>
</table>

{{-- ★ v18.66 — 소득세/지방소득세 내역 + 계산 기준(지방소득세 10% 포함, 소액부징수) 안내 --}}
<div class="split">
    예상 원천징수액 합계 {{ number_format($totals['estimated_tax']) }}원
    = 소득세 {{ number_format($totals['income_tax'] ?? 0) }}원 + 지방소득세 {{ number_format($totals['local_tax'] ?? 0) }}원
</div>

<div class="note">
    ※ "예상 원천징수액"은 일정 1건(1회 지급분)마다 계산해 더한 간이 추정치이며, 소득세와 지방소득세(소득세의 10%)를 포함합니다.<br>
    &nbsp;&nbsp;· 일용근로: (하루 지급액 - 150,000원) × 2.7% (세율 6%에서 근로소득세액공제 55%를 뺀 값)<br>
    &nbsp;&nbsp;· 프리랜서(사업소득): 지급액 × 3% (지방소득세를 더하면 3.3%)<br>
    &nbsp;&nbsp;· 1회 지급분의 소득세가 1,000원 미만이면 떼지 않아 0원으로 계산합니다(소액부징수).<br>
    &nbsp;&nbsp;· 여러 날 치를 한꺼번에 받으면 합산한 금액 기준으로 원천징수되므로 실제 금액과 달라질 수 있습니다.<br>
    ※ 이 표는 종합소득세 신고를 위한 참고 자료이며, 실제 신고는 세무 전문가와 상담 후 진행하시기 바랍니다.<br>
    ※ 현장메이트에 기록된 일정·공수·단가·경비 데이터를 기준으로 자동 계산되었습니다.
</div>

<div class="footer">
    본 자료는 현장메이트에서 자동 생성되었습니다.
</div>

</body>
</html>
