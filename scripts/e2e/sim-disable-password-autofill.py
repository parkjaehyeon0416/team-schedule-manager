#!/usr/bin/env python3
"""iOS 시뮬레이터의 '암호 자동 완성(저장)'을 끔 — 로그인 직후 뜨는 "암호 저장" 시스템 창(SafariViewService)이
Maestro 화면 구조 읽기를 1분씩 멈추게 하고 드라이버를 죽여서(첫 실행 b 흐름 실패 원인) E2E 전에 끔.
설정 프로필 plist 3곳의 restrictedBool.allowPasswordAutoFill.value = False (Detox 이슈 #3761 방식).
적용하려면 시뮬레이터를 한 번 다시 켜야 함.

  사용: python3 scripts/e2e/sim-disable-password-autofill.py <UDID>
"""
import os
import plistlib
import sys

udid = sys.argv[1]
base = os.path.expanduser(f'~/Library/Developer/CoreSimulator/Devices/{udid}/data')
files = [
    'Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/UserSettings.plist',
    'Library/UserConfigurationProfiles/EffectiveUserSettings.plist',
    'Library/UserConfigurationProfiles/PublicInfo/PublicEffectiveUserSettings.plist',
]
for rel in files:
    path = os.path.join(base, rel)
    existed = os.path.exists(path)
    data = {}
    if existed:
        with open(path, 'rb') as f:
            try:
                data = plistlib.load(f)
            except Exception:
                data = {}
    rb = data.setdefault('restrictedBool', {})
    rb.setdefault('allowPasswordAutoFill', {})['value'] = False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        plistlib.dump(data, f, fmt=plistlib.FMT_BINARY)
    print(('updated ' if existed else 'created ') + rel)
