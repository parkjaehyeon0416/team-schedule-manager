#!/usr/bin/env bash
# ★ v18.69 — 안드로이드 출시 한 번에 (이 PC에서 실행: 업로드 키스토어가 이 PC에만 있음)
#   0) 서버 주소 원본 확인 (app/src/api/axiosInstance.ts가 실서버 주소인지 — 빌드 전에)
#   1) 다음 versionCode 확인 (Google Play에 지금까지 쓴 번호 + 1)
#   2) AAB + APK 빌드 (-PversionCode=번호)
#   3) 검사: versionCode·앱 ID, 번들의 서버 주소(https://workmatekr.com 있음 / :8000·http:// 사설 IP 등 QA 주소 없음), 업로드 키 서명
#   4) Google Play 트랙(기본 internal = 내부 테스트)에 업로드
#   5) 홈페이지용 APK를 release-out/workmate-v<versionName>_<versionCode>.apk 로 복사
#
# 사용 (Git Bash):
#   bash scripts/release-android.sh --notes "이번에 바뀐 점"            # 빌드 → 검사 → 내부 테스트 업로드 → APK 복사
#   bash scripts/release-android.sh --dry-run                            # 빌드 + 검사만 (업로드·복사 안 함)
#   bash scripts/release-android.sh --skip-build --notes "..."           # 이미 빌드된 결과물로 검사 → 업로드 (업로드만 다시 할 때)
# 옵션:
#   --notes "글" | --notes-file 파일   출시 노트(한국어, 500자까지). 없으면 RELEASE_NOTES 환경 변수 → 기본 문구
#   --track internal|alpha|production  기본 internal
#   --status completed|draft           기본 completed (아직 한 번도 출시 안 된 '초안 앱'이면 draft)
#   --version-code N                   Google Play에 묻지 않고 이 번호로 빌드
#   --out-dir 폴더                     APK 복사 위치 (기본 RELEASE_OUT_DIR, 없으면 저장소의 release-out/ — git에 안 올라감)
#   --dry-run                          업로드·APK 복사 없이 빌드와 검사만
#   --skip-build                       빌드 생략, 기존 build/outputs 결과물 사용 (versionCode는 그 결과물에서 읽음)

# 윈도우 git(core.autocrlf)이 줄 끝을 CRLF로 바꿔 놓아도 돌도록 \r을 지운 사본으로 다시 실행 (줄 끝 '#'은 \r을 주석으로 흘려보내는 용도)
if [ -z "${_RA_LF:-}" ] && grep -q $'\r' "$0" 2>/dev/null; then _RA_LF=1 _RA_SELF="$0" exec bash <(tr -d '\r' < "$0") "$@"; fi #
set -euo pipefail

SELF="${_RA_SELF:-${BASH_SOURCE[0]}}"
ROOT="$(cd "$(dirname "$SELF")/.." && pwd)"
cd "$ROOT"

PACKAGE_NAME="com.workmatekr.app"
AAB="app/android/app/build/outputs/bundle/release/app-release.aab"
APK="app/android/app/build/outputs/apk/release/app-release.apk"
APK_META="app/android/app/build/outputs/apk/release/output-metadata.json"
PROD_URL="https://workmatekr.com"
# ★ v18.69 — 서버 주소 원본(빌드 전에 확인). 앱의 모든 서버 주소는 이 두 줄에서만 나옴
#   (다른 파일에 'https://workmatekr.com' 글자를 따로 쓰지 말 것 — 쓰면 아래 번들 검사가 그 글자 때문에 통과해 버림)
AXIOS_SRC="app/src/api/axiosInstance.ts"
EXPECTED_SERVER_LINE="export const SERVER_BASE_URL = '$PROD_URL';"
EXPECTED_API_LINE='export const API_BASE_URL = `${SERVER_BASE_URL}/api`;'
# 절대 내보내면 안 되는 개발/QA용 서버 주소 (QA 때 axiosInstance.ts를 잠깐 바꿔 빌드하는 경우)
#   - 고정 글자: 로컬 백엔드 포트 :8000 (localhost:8000 · 127.0.0.1:8000 · 10.0.2.2:8000 · 192.168.x.x:8000 모두 포함)
#   - 정규식(grep -E): http:// 사설 IP(10.x · 192.168.x · 172.16~31.x) — 포트가 없거나 달라도 걸림
#   ※ 포트 없는 'http://localhost'는 번들에 원래 들어 있는 글자(라이브러리)라 여기 못 넣음 → 원본 확인(check_source)이 막음
FORBIDDEN_URLS=(":8000")
FORBIDDEN_URL_REGEX='http://(10|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\.'
# ★ v18.69 — 홈페이지용 APK 복사 위치: 저장소의 release-out/ (.gitignore에 있음). RELEASE_OUT_DIR·--out-dir로 바꿀 수 있음
OUT_DIR_DEFAULT="$ROOT/release-out"
DEFAULT_NOTES="버그를 고치고 안정성을 개선했습니다."

DRY_RUN=0
SKIP_BUILD=0
TRACK="internal"
STATUS="completed"
NOTES="${RELEASE_NOTES:-}"
NOTES_FILE=""
VC=""
OUT_DIR="${RELEASE_OUT_DIR:-$OUT_DIR_DEFAULT}"

say()  { printf '\n\033[1m== %s\033[0m\n' "$*" >&2; }
info() { printf '  %s\n' "$*" >&2; }
warn() { printf '  \033[33m[주의]\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[31m[실패]\033[0m %s\n' "$*" >&2; exit 1; }
usage() { awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$ROOT/scripts/release-android.sh" >&2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --notes) [ $# -ge 2 ] || die "--notes 뒤에 글을 넣으세요."; NOTES="$2"; shift ;;
    --notes-file) [ $# -ge 2 ] || die "--notes-file 뒤에 파일을 넣으세요."; NOTES_FILE="$2"; shift ;;
    --track) [ $# -ge 2 ] || die "--track 값이 없습니다."; TRACK="$2"; shift ;;
    --status) [ $# -ge 2 ] || die "--status 값이 없습니다."; STATUS="$2"; shift ;;
    --version-code) [ $# -ge 2 ] || die "--version-code 값이 없습니다."; VC="$2"; shift ;;
    --out-dir) [ $# -ge 2 ] || die "--out-dir 값이 없습니다."; OUT_DIR="$2"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "알 수 없는 옵션: $1" ;;
  esac
  shift
done

case "$TRACK" in internal|alpha|production) ;; *) die "--track은 internal | alpha | production 중 하나여야 합니다." ;; esac
case "$STATUS" in completed|draft) ;; *) die "--status는 completed | draft 중 하나여야 합니다." ;; esac
if [ -n "$VC" ] && ! [[ "$VC" =~ ^[1-9][0-9]*$ ]]; then die "--version-code는 1 이상의 정수여야 합니다."; fi
if [ -n "$NOTES_FILE" ] && [ ! -f "$NOTES_FILE" ]; then die "출시 노트 파일이 없습니다: $NOTES_FILE"; fi

command -v node  >/dev/null 2>&1 || die "node가 없습니다."
command -v unzip >/dev/null 2>&1 || die "unzip이 없습니다 (Git Bash에 기본 포함)."

# 업로드 도구 패키지 설치 (처음 한 번)
if [ ! -d tools/play-upload/node_modules/@googleapis/androidpublisher ]; then
  say "업로드 도구 패키지 설치 (처음 한 번)"
  (cd tools/play-upload && npm install --no-audit --no-fund >&2)
fi

[ "$DRY_RUN" = 1 ] && say "DRY RUN — 빌드와 검사만 합니다 (Google Play 업로드·APK 복사 안 함)"

# 업로드 키 서명 설정이 없으면 build.gradle이 debug 키로 서명함 → 플레이가 거절
if [ ! -f app/android/keystore.properties ]; then
  if [ "$DRY_RUN" = 1 ]; then
    warn "app/android/keystore.properties가 없어 debug 키로 서명됩니다 (플레이에는 못 올림)."
  else
    die "app/android/keystore.properties가 없습니다. 업로드 키스토어 설정 없이 빌드하면 debug 키로 서명돼 플레이가 거절합니다."
  fi
fi

# ★ v18.69 — 빌드 전에 서버 주소 원본 확인: 주석 아닌 SERVER_BASE_URL·API_BASE_URL 줄이 하나씩, 정확히 실서버 값
#   (번들 검사만으로는 'http://localhost'(포트 없음)·다른 도메인 같은 QA 주소를 다 못 거름)
#   윈도우 git이 CRLF로 체크아웃해도 되도록 \r을 지우고 비교
check_source() {
  [ -f "$AXIOS_SRC" ] || die "$AXIOS_SRC 가 없습니다."
  local src n name
  src="$(tr -d '\r' < "$AXIOS_SRC")"
  for name in SERVER_BASE_URL API_BASE_URL; do
    n="$(printf '%s\n' "$src" | grep -cE "^[[:space:]]*export[[:space:]]+const[[:space:]]+${name}([^A-Za-z0-9_\$]|\$)" || true)"
    [ "$n" = 1 ] || die "$AXIOS_SRC 에 주석이 아닌 'export const $name' 줄이 ${n}개입니다 (1개여야 함)."
  done
  printf '%s\n' "$src" | grep -qxF "$EXPECTED_SERVER_LINE" \
    || die "$AXIOS_SRC 의 서버 주소가 실서버가 아닙니다. 이 줄이어야 합니다:  $EXPECTED_SERVER_LINE"
  printf '%s\n' "$src" | grep -qxF "$EXPECTED_API_LINE" \
    || die "$AXIOS_SRC 의 API 주소 줄이 바뀌었습니다. 이 줄이어야 합니다:  $EXPECTED_API_LINE"
  info "서버 주소 원본 OK ($AXIOS_SRC → $PROD_URL)"
}
say "0) 서버 주소 원본 확인"
check_source
[ "$SKIP_BUILD" = 1 ] && warn "--skip-build: 원본은 지금 파일 기준입니다. 이미 만든 결과물은 아래 번들 검사로 다시 확인합니다."

# json 파일에서 값 하나 읽기 (node로)
json_get() { node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=process.argv[2].split(".").reduce((o,k)=>o==null?undefined:o[k],j);process.stdout.write(v==null?"":String(v));' "$1" "$2"; }

# ───────── 1) versionCode ─────────
say "1) versionCode"
if [ "$SKIP_BUILD" = 1 ]; then
  [ -f "$APK_META" ] || die "기존 빌드 결과가 없습니다 ($APK_META). --skip-build 없이 실행하세요."
  BUILT_VC="$(json_get "$APK_META" 'elements.0.versionCode')"
  if [ -n "$VC" ] && [ "$VC" != "$BUILT_VC" ]; then die "--version-code $VC 와 기존 빌드의 versionCode $BUILT_VC 가 다릅니다."; fi
  VC="$BUILT_VC"
  info "기존 빌드 결과물 사용: versionCode $VC"
elif [ -n "$VC" ]; then
  info "지정한 번호 사용: $VC"
else
  if VC_OUT="$(node tools/play-upload/next-version-code.mjs)"; then
    VC="$(printf '%s' "$VC_OUT" | tr -d '\r\n ')"
    [[ "$VC" =~ ^[1-9][0-9]*$ ]] || die "next-version-code.mjs 결과가 숫자가 아닙니다: $VC_OUT"
  elif [ "$DRY_RUN" = 1 ]; then
    VC=1
    warn "Google Play에서 번호를 못 가져왔습니다(위 안내 참고). DRY RUN이라 임시로 versionCode 1로 빌드합니다."
  else
    die "다음 versionCode를 확인하지 못했습니다 (위 안내 참고). Google Play 연결이 안 되면 --version-code N 으로 직접 지정할 수 있습니다."
  fi
  info "이번 versionCode: $VC"
fi

# ───────── 2) 빌드 ─────────
if [ "$SKIP_BUILD" = 1 ]; then
  say "2) 빌드 — 생략 (--skip-build)"
else
  say "2) 빌드: bundleRelease + assembleRelease (-PversionCode=$VC)"
  # 윈도우(Git Bash)에서는 gradlew 셸 스크립트가 CRLF로 체크아웃돼 있어 gradlew.bat을 씀
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) GRADLEW="./gradlew.bat" ;;
    *) GRADLEW="./gradlew" ;;
  esac
  (cd app/android && "$GRADLEW" bundleRelease assembleRelease -PversionCode="$VC")
fi

# ───────── 3) 검사 ─────────
say "3) 검사"
[ -f "$AAB" ] || die "AAB가 없습니다: $AAB"
[ -f "$APK" ] || die "APK가 없습니다: $APK"
[ -f "$APK_META" ] || die "APK 정보 파일이 없습니다: $APK_META"

BUILT_VC="$(json_get "$APK_META" 'elements.0.versionCode')"
VERSION_NAME="$(json_get "$APK_META" 'elements.0.versionName')"
APP_ID="$(json_get "$APK_META" 'applicationId')"
[ "$APP_ID" = "$PACKAGE_NAME" ] || die "앱 ID가 $PACKAGE_NAME 가 아닙니다: $APP_ID"
if [ "$BUILT_VC" != "$VC" ]; then
  die "빌드된 versionCode($BUILT_VC)가 $VC 가 아닙니다. app/android/app/build.gradle의 versionCode가 -PversionCode 값을 읽도록 되어 있어야 합니다."
fi
info "앱 ID $APP_ID / versionName $VERSION_NAME / versionCode $BUILT_VC"
if ! [[ "$VERSION_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  warn "versionName '$VERSION_NAME' 이 MAJOR.MINOR.PATCH(예: 1.1.0) 형식이 아닙니다. 앱 업데이트 안내는 이 숫자로 비교합니다."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# 자바스크립트 번들(Hermes 바이트코드라도 문자열은 그대로 들어 있음)에서 서버 주소 검사
check_bundle() {
  local archive="$1" entry="$2" label="$3" out="$TMP_DIR/$3.bundle"
  unzip -p "$archive" "$entry" > "$out" 2>/dev/null || die "$label 에서 $entry 를 꺼내지 못했습니다."
  [ -s "$out" ] || die "$label 의 $entry 가 비어 있습니다."
  grep -a -q -F "$PROD_URL" "$out" || die "$label 번들에 $PROD_URL 이 없습니다. app/src/api/axiosInstance.ts의 SERVER_BASE_URL을 확인하세요."
  local bad hit
  for bad in "${FORBIDDEN_URLS[@]}"; do
    if grep -a -q -F "$bad" "$out"; then
      die "$label 번들에 개발/QA 서버 주소 '$bad' 가 들어 있습니다. axiosInstance.ts를 $PROD_URL 로 되돌리고 다시 빌드하세요."
    fi
  done
  hit="$(grep -a -o -m1 -E "${FORBIDDEN_URL_REGEX}[0-9.]*" "$out" | head -n1 || true)"
  if [ -n "$hit" ]; then
    die "$label 번들에 사설 IP 서버 주소 '$hit' 가 들어 있습니다. axiosInstance.ts를 $PROD_URL 로 되돌리고 다시 빌드하세요."
  fi
  info "$label 서버 주소 OK ($PROD_URL 있음, ${FORBIDDEN_URLS[*]}·http:// 사설 IP 없음)"
}
check_bundle "$AAB" "base/assets/index.android.bundle" "AAB"
check_bundle "$APK" "assets/index.android.bundle" "APK"

# AAB 서명 확인 — debug 키면 플레이가 거절 (APK는 v2 서명만이라 keytool로는 못 봄)
KEYTOOL="$(command -v keytool 2>/dev/null || true)"
if [ -z "$KEYTOOL" ] && [ -n "${JAVA_HOME:-}" ]; then
  JH="$(cygpath -u "$JAVA_HOME" 2>/dev/null || printf '%s' "$JAVA_HOME")"
  for k in "$JH/bin/keytool" "$JH/bin/keytool.exe"; do [ -x "$k" ] && KEYTOOL="$k" && break; done
fi
if [ -n "$KEYTOOL" ]; then
  SIGNER="$("$KEYTOOL" -J-Duser.language=en -printcert -jarfile "$AAB" 2>/dev/null | grep -m1 '^Owner:' || true)"
  if [ -z "$SIGNER" ]; then
    warn "AAB 서명 정보를 읽지 못했습니다."
  elif printf '%s' "$SIGNER" | grep -q 'CN=Android Debug'; then
    if [ "$DRY_RUN" = 1 ]; then warn "AAB가 debug 키로 서명돼 있습니다 (플레이에는 못 올림)."; else die "AAB가 debug 키로 서명돼 있습니다. keystore.properties(업로드 키) 설정을 확인하세요."; fi
  else
    info "AAB 서명: ${SIGNER#Owner: }"
  fi
else
  warn "keytool을 찾지 못해 AAB 서명 검사는 건너뜁니다."
fi

APK_NAME="workmate-v${VERSION_NAME}_${VC}.apk"

if [ "$DRY_RUN" = 1 ]; then
  say "DRY RUN 끝 — 업로드·복사 안 함"
  info "AAB: $ROOT/$AAB"
  info "APK: $ROOT/$APK  (출시하면 $APK_NAME 로 복사됨)"
  exit 0
fi

# ───────── 4) Google Play 업로드 ─────────
say "4) Google Play 업로드 → $TRACK ($STATUS)"
NOTES_TMP="$TMP_DIR/notes.txt"
if [ -n "$NOTES_FILE" ]; then
  cp "$NOTES_FILE" "$NOTES_TMP"
else
  printf '%s' "${NOTES:-$DEFAULT_NOTES}" > "$NOTES_TMP"
fi
info "출시 노트: $(head -c 300 "$NOTES_TMP" | tr '\n' ' ')"
node tools/play-upload/upload.mjs \
  --aab "$AAB" \
  --track "$TRACK" \
  --status "$STATUS" \
  --notes-file "$NOTES_TMP" \
  --name "$VERSION_NAME ($VC)" \
  --expect-version-code "$VC"

# ───────── 5) 홈페이지용 APK 복사 ─────────
say "5) 홈페이지용 APK 복사"
mkdir -p "$OUT_DIR"
cp "$APK" "$OUT_DIR/$APK_NAME"
SIZE_MB="$(node -e 'process.stdout.write((require("fs").statSync(process.argv[1]).size/1048576).toFixed(1))' "$OUT_DIR/$APK_NAME")"
SHA="$(sha256sum "$OUT_DIR/$APK_NAME" | cut -d' ' -f1)"
info "$OUT_DIR/$APK_NAME (${SIZE_MB} MB)"
info "sha256 $SHA"
info "서버의 public/download/ 에 올리면 https://workmatekr.com/download/latest 가 이 파일로 연결됩니다."

say "끝: versionName $VERSION_NAME / versionCode $VC → Google Play $TRACK"
