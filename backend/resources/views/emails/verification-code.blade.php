<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F7FBFF;font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;color:#102A56">
  <div style="max-width:440px;margin:0 auto;background:#FFFFFF;border:1px solid #DDEAF7;border-radius:16px;padding:28px 24px">
    <div style="font-size:18px;font-weight:800;margin-bottom:18px">현장<span style="color:#0A6CE0">메이트</span></div>
    <div style="font-size:15px;line-height:1.6;margin-bottom:18px">{{ $purposeLabel }}용 인증번호예요.<br>앱 화면에 아래 번호를 입력해주세요.</div>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:16px;border-radius:12px;background:#F3F9FF;border:1px dashed #9CC9FA">{{ $code }}</div>
    <div style="font-size:13px;color:#5F7290;line-height:1.6;margin-top:18px">
      번호는 {{ $minutes }}분 동안만 쓸 수 있고, 5번 틀리면 5분 동안 다시 받을 수 없어요.<br>
      직접 요청하지 않았다면 이 메일은 무시하고, 비밀번호나 연결된 로그인 계정을 확인해주세요.
    </div>
  </div>
</body>
</html>
