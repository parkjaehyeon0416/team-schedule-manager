#!/usr/bin/env bash
# iOS 시뮬레이터 E2E — .maestro/ios-e2e 흐름을 순서대로 실행(하나가 실패해도 계속) + 흐름 사이에 로컬 서버 버전 설정 바꾸기.
#   .github/workflows/ios-sim-e2e.yml이 부름. 로컬 백엔드(127.0.0.1:8000)·code-server(127.0.0.1:9999)가 떠 있어야 함.
#   필요한 환경변수: DEV(시뮬레이터 UDID), RESULTS(결과 폴더), LEADER_EMAIL/LEADER_PW/SIGNUP_*/TEAM_NAME(seed.php가 만든 값)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOWS="$ROOT/.maestro/ios-e2e"
BACKEND="$ROOT/backend"
SUMMARY="$RESULTS/summary.txt"
mkdir -p "$RESULTS/screenshots" "$RESULTS/flows"
: > "$SUMMARY"
export PATH="$PATH:$HOME/.maestro/bin"
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_DISABLE_UPDATE_CHECK=true MAESTRO_DRIVER_STARTUP_TIMEOUT=240000

wait_backend() {
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "http://127.0.0.1:8000/up" && return 0
    sleep 1
  done
  echo "backend did not come back" >&2
  return 1
}

# backend/.env의 KEY를 VALUE로(없으면 추가). php artisan serve는 .env가 바뀌면 스스로 다시 뜸 → /up 기다림
set_env() {
  python3 - "$BACKEND/.env" "$1" "$2" <<'PY'
import sys, re
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path, encoding='utf-8').read().splitlines()
out, done = [], False
for l in lines:
    if re.match(r'^\s*' + re.escape(key) + r'\s*=', l):
        if not done:
            out.append(f'{key}={value}')
            done = True
        continue
    out.append(l)
if not done:
    out.append(f'{key}={value}')
open(path, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
PY
  echo "[env] $1=$2"
}

reload_backend() {
  (cd "$BACKEND" && php artisan config:clear > /dev/null)
  sleep 4
  wait_backend
  echo "[env] version policy now: $(curl -fsS 'http://127.0.0.1:8000/api/app/version?platform=ios&version=1.1.0')"
}

run_flow() {
  local name="$1"
  local dir="$RESULTS/flows/$name"
  mkdir -p "$dir"
  local marker="$dir/.started"
  touch "$marker"
  sleep 1
  echo "::group::flow $name"
  local rc=0
  (cd "$dir" && maestro --device "$DEV" test \
      -e LEADER_EMAIL="$LEADER_EMAIL" -e LEADER_PW="$LEADER_PW" \
      -e SIGNUP_EMAIL="$SIGNUP_EMAIL" -e SIGNUP_PW="$SIGNUP_PW" -e SIGNUP_PHONE="$SIGNUP_PHONE" \
      -e TEAM_NAME="$TEAM_NAME" \
      --test-output-dir "$dir/out" \
      "$FLOWS/$name.yaml") > "$dir/maestro.log" 2>&1 || rc=$?
  tail -60 "$dir/maestro.log"
  if [ "$rc" -ne 0 ]; then
    # 실패 지점 화면·화면 구조(선택자 고칠 때 씀)
    xcrun simctl io "$DEV" screenshot "$RESULTS/screenshots/${name}__FAILED_screen.png" > /dev/null 2>&1 || true
    (maestro --device "$DEV" hierarchy > "$dir/hierarchy-at-failure.json" 2> "$dir/hierarchy.err") || true
  fi
  # takeScreenshot 결과는 실행 폴더·출력 폴더·흐름 폴더 중 한 곳에 생김 → 모음
  #   이름이 "x_00_..."인 것 = 흐름의 takeScreenshot → screenshots/, 나머지(Maestro 단계·실패 자동 캡처) → flows/<흐름>/debug-shots/
  find "$dir" "$FLOWS" "$HOME/.maestro/tests" -name "*.png" -newer "$marker" -not -path "*/debug-shots/*" 2>/dev/null | while read -r f; do
    base="$(basename "$f")"
    if [[ "$base" =~ ^[a-z]_[0-9]{2}[a-z]?_ ]]; then
      cp "$f" "$RESULTS/screenshots/$base"
    else
      mkdir -p "$dir/debug-shots" && cp "$f" "$dir/debug-shots/$base"
    fi
    case "$f" in "$FLOWS"/*) rm -f "$f" ;; esac
  done
  local status=PASS
  [ "$rc" -ne 0 ] && status=FAIL
  echo "$name $status (exit $rc)" | tee -a "$SUMMARY"
  echo "::endgroup::"
  return 0
}

# SafariViewService(카카오·구글 웹 로그인 창, "암호 저장" 창)가 떠 있거나 닫힌 직후엔 Maestro가 화면 구조를 못 읽고
#   1분씩 멈추다 드라이버가 죽음(첫 실행 a·b 실패 원인). 암호 저장 창은 워크플로가 시뮬레이터 설정으로 끄고,
#   소셜 흐름은 맨 끝에 하나씩 돌리며 사이사이 그 프로세스를 정리함
kill_web_auth() {
  xcrun simctl terminate "$DEV" com.apple.SafariViewService > /dev/null 2>&1 || true
  xcrun simctl terminate "$DEV" com.apple.mobilesafari > /dev/null 2>&1 || true
  sleep 2
}

wait_backend || exit 1

# 기본: 최소 1.0.0 · 최신 1.1.0(= 앱 버전) → 업데이트 안내 없음
run_flow e_signup_phone_verify
run_flow b_login_tabs_profile_appinfo
run_flow f_login_links_reauth
run_flow g_team_kick_invite
run_flow h_business_card_public
run_flow i_quote_approve_notice

# 선택 업데이트: 최신 1.2.0 + 안내 3줄
set_env APP_LATEST_VERSION_IOS 1.2.0
set_env APP_UPDATE_MESSAGE '"회원가입 휴대폰 인증이 추가됐어요|견적 승인 안내가 더 친절해졌어요|자잘한 오류를 고쳤어요"'
reload_backend
run_flow c_optional_update

# 강제 업데이트: 최소 1.2.0
set_env APP_MIN_VERSION_IOS 1.2.0
reload_backend
run_flow d_required_update

# 원래대로
set_env APP_MIN_VERSION_IOS 1.0.0
set_env APP_LATEST_VERSION_IOS 1.1.0
set_env APP_UPDATE_MESSAGE '""'
reload_backend
kill_web_auth   # d에서 [업데이트하기]가 연 Safari 정리
run_flow z_back_to_normal

# 소셜 로그인 버튼(로그인은 하지 않음) — 맨 끝에, 하나씩
run_flow a3_apple_login_button
kill_web_auth
run_flow a1_kakao_login_button
kill_web_auth
run_flow a2_google_login_button
kill_web_auth

# 혹시 빠진 takeScreenshot 결과 한 번 더 모으기
find "$RESULTS/flows" -path "*/takeScreenshot/*.png" -exec cp -n {} "$RESULTS/screenshots/" \; 2>/dev/null || true

echo "===== summary ====="
cat "$SUMMARY"
! grep -q " FAIL " "$SUMMARY"
