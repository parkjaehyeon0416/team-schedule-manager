#!/usr/bin/env python3
"""iOS 시뮬레이터 E2E 결과를 올리기 전에 무작위 비밀번호(계정·DB)를 지움.

  사용: python3 scripts/e2e/scrub.py <결과 폴더> <계정 파일(KEY=VALUE)> [추가 비밀값...]
  - *_PW 값 전체 + 6자 이상인 모든 부분 문자열(Maestro 드라이버 로그가 "remaining text: a!695d…"처럼 앞을 잘라 남김)
  - "remaining text:" / "Inputting text:" 줄의 값
  남아 있으면 종료 코드 1.
"""
import os
import re
import sys

MIN_PART = 6


def secrets_from(path):
    out = []
    if path and os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            k, _, v = line.rstrip('\n').partition('=')
            if k.endswith('_PW') and v:
                out.append(v)
    return out


def parts(secret):
    n = len(secret)
    found = set()
    for length in range(n, MIN_PART - 1, -1):
        for i in range(0, n - length + 1):
            found.add(secret[i:i + length])
    return sorted(found, key=len, reverse=True)


def main():
    root, acc = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ''
    secrets = [s for s in secrets_from(acc) + sys.argv[3:] if s]
    needles = []
    for s in secrets:
        needles.extend(parts(s) if len(s) >= MIN_PART else [s])
    needles = sorted(set(needles), key=len, reverse=True)
    line_re = re.compile(r'((?:remaining text|Inputting text|Input text)\s*:?\s*)(\S.*)$', re.M)
    left = []
    for d, _, files in os.walk(root):
        if '/.git' in d.replace('\\', '/'):
            continue
        for f in files:
            p = os.path.join(d, f)
            try:
                raw = open(p, 'rb').read()
            except OSError:
                continue
            if b'\0' in raw[:4096]:
                continue  # 이미지 등
            text = raw.decode('utf-8', errors='replace')
            new = line_re.sub(lambda m: m.group(1) + '***REDACTED***', text)
            for n in needles:
                if n in new:
                    new = new.replace(n, '***REDACTED***')
            if new != text:
                open(p, 'w', encoding='utf-8').write(new)
            if any(s in new for s in secrets):
                left.append(p)
    if left:
        print('secret still present in: ' + ', '.join(left))
        sys.exit(1)
    print(f'scrubbed {len(secrets)} secret(s)')


if __name__ == '__main__':
    main()
