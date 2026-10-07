// ★ v18.48 — 앱의 이용약관·개인정보 처리방침(app/src/constants/legalDocuments.ts)을 웹 페이지(/terms, /privacy)용
//   텍스트로 복사. 약관 문구를 바꾸면 이 스크립트를 다시 실행: node scripts/sync-legal.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../app/src/constants/legalDocuments.ts'), 'utf8');
const out = path.join(__dirname, '../backend/resources/legal');
fs.mkdirSync(out, { recursive: true });

for (const [name, file] of [['TERMS_OF_SERVICE', 'terms.txt'], ['PRIVACY_POLICY', 'privacy.txt']]) {
  const m = src.match(new RegExp(`export const ${name} = \`([\\s\\S]*?)\`;`));
  if (!m) throw new Error(`${name} not found`);
  fs.writeFileSync(path.join(out, file), m[1].trim() + '\n');
  console.log(`${file}: ${m[1].length} chars`);
}
