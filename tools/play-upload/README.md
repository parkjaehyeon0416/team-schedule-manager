# Google Play 업로드 도구 (★ v18.69)

현장메이트 안드로이드 앱(AAB)을 **이 PC에서 바로** Google Play에 올리는 도구입니다.
업로드 키스토어가 이 PC에만 있어서 GitHub Actions 같은 CI는 쓰지 않습니다.

- `next-version-code.mjs`: Google Play에 지금까지 올린 versionCode 중 가장 큰 값 + 1을 알려 줌
- `upload.mjs`: AAB 하나를 내부 테스트 등 트랙에 올림 (edits.insert → bundles.upload → tracks.update → edits.commit)
- `../../scripts/release-android.sh`: 번호 확인 → 빌드 → 검사 → 업로드 → 홈페이지용 APK 복사를 한 번에

구글 공식 API 클라이언트 `@googleapis/androidpublisher`(googleapis 중 Play 부분만 떼어 낸 공식 패키지, 2.5MB)를 씁니다.
`googleapis` 전체 패키지(245MB)와 사용법은 똑같습니다.

---

## 처음 한 번 설정 (주인이 직접)

### 1. Google Play Android Developer API 켜기
1. https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=blissful-sun-446703-h2 를 엽니다.
2. 위쪽 프로젝트가 **blissful-sun-446703-h2** 인지 확인하고 **사용** 버튼을 누릅니다.

### 2. 서비스 계정 만들기
1. Google Cloud 콘솔 > **IAM 및 관리자 > 서비스 계정** > **서비스 계정 만들기**
2. 이름: `play-uploader` (아무거나 괜찮음) → **만들고 계속하기**
3. "역할"은 **비워 두고** 계속 → **완료** (Google Cloud 역할은 필요 없습니다. 권한은 Play Console에서 줍니다)
4. 목록에 생긴 이메일(`play-uploader@blissful-sun-446703-h2.iam.gserviceaccount.com` 같은 모양)을 복사해 둡니다.

### 3. JSON 키 만들기
1. 방금 만든 서비스 계정 클릭 > **키** 탭 > **키 추가 > 새 키 만들기** > **JSON** > 만들기
2. `.json` 파일이 내려받아집니다. **이 파일은 비밀번호와 같습니다.** 누구에게도 보내지 말고, 저장소(프로젝트 폴더) 안에 두지 마세요.

### 4. 키 파일 저장
- `C:\Users\User\.secrets\` 폴더를 만들고, 받은 파일 이름을 바꿔 **`C:\Users\User\.secrets\play-service-account.json`** 으로 저장합니다.
- 다른 곳에 두고 싶으면 환경 변수 `PLAY_SA_JSON`에 그 경로를 넣으세요.
- 혹시 `tools/` 안에 `.json` 키를 넣어도 `.gitignore`가 막아 두었지만, 원래 자리는 위 경로입니다.

### 5. Play Console에 서비스 계정 초대
1. https://play.google.com/console > 왼쪽 **사용자 및 권한** > **새 사용자 초대**
2. 이메일 주소: 2단계에서 복사한 서비스 계정 이메일
3. **앱 권한** 탭 > **앱 추가** > **현장메이트** 선택 > 아래 두 가지 체크
   - **테스트 트랙에 앱 출시**
   - **테스트 트랙 관리 및 테스터 목록 수정**
4. **사용자 초대** (서비스 계정은 메일 수락이 필요 없습니다. 반영까지 몇 분~몇 시간 걸릴 수 있습니다)

> 이 두 권한으로는 테스트 트랙(내부·비공개)에만 올릴 수 있습니다. 프로덕션은 내부 테스트에서 확인한 뒤
> Play Console에서 직접 승격하는 것을 권장합니다. 스크립트로 프로덕션까지 올리려면 "프로덕션에 앱 출시..." 권한을 추가로 줘야 합니다.

### 6. 연결 확인
Git Bash(또는 PowerShell)에서 저장소 폴더로 가서:
```bash
cd tools/play-upload && npm install && cd ../..
node tools/play-upload/next-version-code.mjs
```
숫자 하나(다음 versionCode)가 나오면 설정 끝입니다. 실패하면 한국어로 원인과 할 일이 나옵니다 (아래 "자주 나는 오류").

> Google Play API는 앱을 새로 만들거나 **맨 처음 AAB를 올리는 것**은 못 합니다. 첫 AAB는 Play Console에서 손으로 올려야 합니다(이미 했으면 넘어가세요).

---

## 출시할 때

### 한 번에 (권장)
```bash
bash scripts/release-android.sh --notes "버전 확인 기능을 추가했습니다."
```
1. 다음 versionCode 확인 (Google Play 기준 최대값 + 1, 최소 2)
2. `app/android`에서 `bundleRelease assembleRelease -PversionCode=번호` 빌드
3. 검사 — 하나라도 실패하면 **올리지 않고 멈춤**
   - 빌드된 versionCode가 1번 번호와 같은지, 앱 ID가 `com.workmatekr.app`인지
   - 자바스크립트 번들에 `https://workmatekr.com`이 있고 `localhost:8000`·`127.0.0.1:8000`·`10.0.2.2:8000`(QA용 주소)이 **없는지** (AAB, APK 둘 다)
   - AAB가 debug 키가 아니라 업로드 키로 서명됐는지
4. Google Play **내부 테스트** 트랙에 업로드 (출시 이름 `1.1.0 (번호)`, 출시 노트 ko-KR)
5. 홈페이지용 APK를 `workmate-v<versionName>_<번호>.apk`(예: `workmate-v1.1.0_3.apk`)로 복사
   → 서버 `public/download/`에 올리면 https://workmatekr.com/download/latest 가 새 파일로 연결됩니다.

| 옵션 | 설명 |
|---|---|
| `--notes "글"` / `--notes-file 파일` | 출시 노트(500자까지). 없으면 `RELEASE_NOTES` 환경 변수, 그것도 없으면 기본 문구 |
| `--dry-run` | 빌드와 검사만. 업로드·APK 복사 안 함 (Play 연결 전이면 임시로 versionCode 1로 빌드) |
| `--skip-build` | 빌드 생략, 이미 있는 빌드 결과로 검사 → 업로드 (업로드만 실패했을 때 다시 올리기) |
| `--track internal\|alpha\|production` | 기본 `internal`(내부 테스트). `alpha` = 비공개 테스트 |
| `--status completed\|draft` | 기본 `completed`. `draft`면 콘솔에서 "검토 및 출시"를 눌러야 배포 |
| `--version-code N` | Google Play에 묻지 않고 이 번호로 빌드 |
| `--out-dir 폴더` | APK 복사 위치 (기본: 환경 변수 `RELEASE_OUT_DIR` 또는 스크립트의 `OUT_DIR_DEFAULT`) |

> 꼭 `bash scripts/release-android.sh`로 실행하세요(Git Bash). 앱 표시 버전(versionName)은
> `app/android/app/build.gradle`의 `appVersionName`에서 바꿉니다 — 아이폰 MARKETING_VERSION과 같은 숫자로.

### 따로 쓰기
```bash
# 다음 versionCode (stdout에 숫자 하나)
node tools/play-upload/next-version-code.mjs

# 이미 빌드한 AAB 올리기
node tools/play-upload/upload.mjs \
  --aab app/android/app/build/outputs/bundle/release/app-release.aab \
  --track internal --notes "이번에 바뀐 점" --name "1.1.0 (3)" --expect-version-code 3
```
`upload.mjs` 옵션: `--status completed|draft`, `--notes-file 파일`, `--changes-not-sent-for-review`(관리형 게시를 켠 경우),
`--expect-version-code N`(AAB 안의 번호가 다르면 커밋하지 않고 멈춤).
환경 변수: `PLAY_SA_JSON`(키 경로), `PLAY_UPLOAD_TIMEOUT_MIN`(업로드 제한 시간, 기본 20분), `PLAY_DEBUG=1`(원본 오류 출력).

5xx·429·연결 끊김 같은 일시적 오류는 자동으로 최대 3번 다시 시도합니다(2초 → 4초 → 8초).
중간에 실패하면 열어 둔 edit은 버려서 Google Play에는 아무것도 반영되지 않습니다.

---

## 자주 나는 오류

| 화면에 나오는 말 | 할 일 |
|---|---|
| 서비스 계정 키 파일이 없습니다 | 처음 설정 3~4단계. 경로가 다르면 `PLAY_SA_JSON` |
| 구글이 서비스 계정 키를 받아 주지 않았습니다 | 키가 삭제됐거나 다른 파일. 새 JSON 키를 만들어 덮어쓰기. "날짜/시간"이 나오면 윈도우 시간 동기화 |
| "Google Play Android Developer API"가 꺼져 있습니다 | 처음 설정 1단계 (사용 누르고 몇 분 기다리기) |
| 서비스 계정에 이 앱을 다룰 권한이 없습니다 (403) | 처음 설정 5단계. 초대 직후면 조금 기다렸다 다시 |
| Google Play에서 앱을 찾지 못했습니다 (404) | 초대 때 앱 권한에 "현장메이트"를 넣었는지, 첫 AAB를 콘솔에서 올렸는지 확인 |
| 이 versionCode는 이미 Google Play에 올린 적이 있어서 다시 쓸 수 없습니다 | `--version-code` 없이 다시 실행(자동으로 다음 번호). `--skip-build`로 옛 빌드를 다시 올린 경우엔 새로 빌드 |
| 아직 한 번도 출시되지 않은 "초안 앱" | `--status draft`로 올린 뒤 콘솔에서 "검토 및 출시" |
| 변경사항을 자동으로 검토에 보낼 수 없습니다 | `--changes-not-sent-for-review`를 붙이고, 콘솔 "게시 개요"에서 검토로 보내기 |
| 번들에 개발/QA 서버 주소가 들어 있습니다 | `app/src/api/axiosInstance.ts`의 `SERVER_BASE_URL`을 `https://workmatekr.com`으로 되돌리고 다시 빌드 |
| 빌드된 versionCode가 ○가 아닙니다 | `build.gradle`의 versionCode가 `-PversionCode`를 읽는지 확인 |

## 키가 새어 나갔다면
Google Cloud 콘솔 > 서비스 계정 > 키 탭에서 그 키를 **삭제**하면 바로 못 쓰게 됩니다. 새 키를 만들어 같은 경로에 저장하세요.
