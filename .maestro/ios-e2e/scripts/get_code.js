// 로컬 code-server(scripts/e2e/code-server.js)에서 방금 보낸 문자 인증번호를 받아 output.code에 넣음.
// Maestro runScript는 맥(호스트)에서 실행되므로 127.0.0.1 = CI 러너. PHONE은 runScript env로 넘김.
var url = 'http://127.0.0.1:9999/code?wait=8';
if (typeof PHONE !== 'undefined' && PHONE) {
  url += '&to=' + PHONE;
}
var res = http.get(url);
if (res.status !== 200) {
  throw new Error('code-server ' + res.status + ': ' + res.body);
}
output.code = json(res.body).code;
console.log('verification code received for ' + json(res.body).to);
