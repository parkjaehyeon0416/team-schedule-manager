#!/usr/bin/env python3
"""녹화 앞뒤 자르기 계산 — 녹화 시작 시각(t0 파일, epoch 초)과 Maestro 로그 시각(UTC HH:MM:SS.mmm)으로
   '앱 실행 2.5초 전'부터 '마지막 명령 1.5초 뒤'까지를 영상 안 초 단위로 출력: "<시작> <끝>"
   usage: video-trim.py <t0 file> <maestro.log>"""
import datetime, re, sys

t0 = float(open(sys.argv[1]).read().strip())
day = datetime.datetime.fromtimestamp(t0, datetime.timezone.utc).date()
launch = last = None
for line in open(sys.argv[2], encoding='utf-8', errors='ignore'):
    m = re.match(r'(\d\d):(\d\d):(\d\d)\.(\d{3})', line)
    if not m:
        continue
    t = datetime.datetime(day.year, day.month, day.day, int(m[1]), int(m[2]), int(m[3]),
                          int(m[4]) * 1000, tzinfo=datetime.timezone.utc).timestamp()
    if launch is None and 'Launch app' in line and 'RUNNING' in line:
        launch = t
    last = t
if launch is None or last is None:
    print('0 0')
    sys.exit(0)
print(f'{max(0.0, launch - t0 - 2.5):.2f} {last - t0 + 1.5:.2f}')
