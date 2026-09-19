<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>{{ $year }}년 수입·경비 정리</title>
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
    h1 { font-size: 19px; color: #1F3864; margin: 0 0 4px; }
    .subtitle { color: #666; font-size: 12px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; }
    th { background: #1F3864; color: #fff; font-weight: bold; text-align: center; }
    td.label { text-align: center; }
    tr.total td { background: #F5F7FA; font-weight: bold; }
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

<div class="note">
    ※ "예상 원천징수액"은 일용근로소득 기준 간이 추정치입니다 (일당에서 150,000원을 공제한 금액의 2.7%, 실제 원천징수 세율과 다를 수 있습니다).<br>
    ※ 이 표는 종합소득세 신고를 위한 참고 자료이며, 실제 신고는 세무 전문가와 상담 후 진행하시기 바랍니다.<br>
    ※ Team Schedule Manager에 기록된 일정·공수·단가·경비 데이터를 기준으로 자동 계산되었습니다.
</div>

<div class="footer">
    본 자료는 Team Schedule Manager에서 자동 생성되었습니다.
</div>

</body>
</html>
