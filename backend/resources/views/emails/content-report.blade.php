<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F7FBFF;font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;color:#102A56">
  {{-- ★ v18.72 — 운영자에게 새 신고 알림 (ContentReportMail) --}}
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #DDEAF7;border-radius:16px;padding:28px 24px">
    <div style="font-size:18px;font-weight:800;margin-bottom:18px">현장<span style="color:#0A6CE0">메이트</span> <span style="font-size:13px;font-weight:700;color:#5F7290">운영자 알림</span></div>
    <div style="font-size:15px;line-height:1.6;margin-bottom:18px">새 신고(<b>{{ $no }}</b>)가 접수됐어요.<br>24시간 안에 확인하고 처리해주세요.</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;background:#F7FAFD;border-radius:12px">
      <tr><td style="padding:10px 14px;color:#5F7290;width:72px;vertical-align:top">대상</td><td style="padding:10px 14px;font-weight:700">{{ $typeLabel }}</td></tr>
      <tr><td style="padding:10px 14px;color:#5F7290;vertical-align:top">사유</td><td style="padding:10px 14px;font-weight:700">{{ $reasonLabel }}</td></tr>
      @if ($teamName)
      <tr><td style="padding:10px 14px;color:#5F7290;vertical-align:top">팀</td><td style="padding:10px 14px">{{ $teamName }}</td></tr>
      @endif
      @if ($excerpt !== '')
      <tr><td style="padding:10px 14px;color:#5F7290;vertical-align:top">내용</td><td style="padding:10px 14px;word-break:break-all">{{ $excerpt }}</td></tr>
      @endif
      @if ($reportedAt)
      <tr><td style="padding:10px 14px;color:#5F7290;vertical-align:top">접수</td><td style="padding:10px 14px">{{ $reportedAt }}@if ($hasDetail) · 신고자 설명 있음@endif</td></tr>
      @endif
    </table>
    <div style="text-align:center;margin-top:22px">
      <a href="{{ $link }}" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#0A6CE0;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none">운영자 웹에서 확인하기</a>
    </div>
    <div style="font-size:12px;color:#5F7290;line-height:1.6;margin-top:18px">
      신고자·대상자 정보와 신고된 사진은 운영자 웹(로그인 필요)에서만 볼 수 있어요.
    </div>
  </div>
</body>
</html>
