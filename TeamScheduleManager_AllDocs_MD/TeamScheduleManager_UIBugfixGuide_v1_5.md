Team Schedule Manager

**UI 버그 수정 가이드**

버그 수정 + 구조 개선 + 원천징수 + 사업자 여부 + 세금 알림 + 사진 다건 업로드

작성일: 2026-04-27     버전: v1.5

# 0. 수정/추가 항목 전체 요약

총 10가지 항목 — UI 버그 3건 / 구조 개선 3건 / 신규 기능 4건

| **#** | **화면** | **내용** | **구분** | **수정 파일** |
| --- | --- | --- | --- | --- |
| **1** | **로그인** | 비밀번호 마스킹 흰색으로 안 보임 | 버그 | LoginScreen.tsx |
| **2** | **내 수입 현황** | 섹션 카드 배경 검정 → 텍스트 안 보임 | 버그 | MySummaryScreen.tsx |
| **3** | **홈 캘린더** | 격자선 흐리고 날짜 텍스트 너무 작음 | 버그 | CalendarScreen.tsx |
| **4** | **일정 등록/상세** | 공종(ENUM)·공정 중복 → 공정으로 통합 | 개선 | ScheduleCreateScreen ScheduleDetailScreen |
| **5** | **내 수입 현황** | "실수령액" → "순수입" 표현 수정 | 개선 | MySummaryScreen.tsx |
| **6** | **내 수입/백엔드** | 3.3% 자동공제 → 참고용으로 분리 | 개선 | MonthlySummaryService MySummaryScreen |
| **7** | **일정 등록/상세 수입 현황** | 원천징수 여부 토글 추가 | 신규 | 마이그레이션 / Schedule.php ScheduleController ScheduleCreateScreen ScheduleDetailScreen MySummaryScreen |
| **8** | **프로필 화면** | 사업자 여부 라디오 버튼 추가 | 신규 | users 마이그레이션 User.php / ProfileScreen |
| **9** | **시스템** | 종합소득세 신고 기간 FCM 푸시 알림 (개인사업자 대상, 5월 3회) | 신규 | NotificationService.php Kernel.php / FCM 설정 |
| **10** | **일정 상세 사진 섹션** | ★ 사진 갤러리 다건 선택 업로드 (1장씩 → 여러 장 한 번에) | 신규 | ScheduleDetailScreen.tsx |

# 1~9. 기존 수정 항목 (v1.4와 동일)

| **💡 항목 1~9의 수정 방법은 v1.4 문서와 동일합니다. v1.5는 항목 10(사진 다건 업로드)이 추가된 버전이에요.** |
| --- |

# 10. 사진 갤러리 다건 선택 업로드 (★ v1.5 신규)

## 10-1. 원인과 변경 방향

현재 사진 추가 버튼을 누르면 갤러리에서 사진을 1장씩만 선택할 수 있어요.

현장에서 시공 전 사진을 여러 장 찍어뒀을 때 하나씩 올리는 게 불편해요.

**"****selectionLimit: 0****"**** 옵션 하나만 추가하면 여러 장 동시 선택이 가능해요.**

| **항목** | **변경 전** | **변경 후** |
| --- | --- | --- |
| **갤러리 선택** | 1장만 선택 가능 | 여러 장 동시 선택 가능 |
| **업로드 방식** | 1장 → 바로 업로드 | 선택한 장 수만큼 순서대로 업로드 |
| **진행 표시** | 로딩 스피너 | "1/3 업로드 중..." 진행 표시 |
| **백엔드 변경** | - | 없음 (기존 API 그대로) |
| **수정 파일** | ScheduleDetailScreen.tsx | ScheduleDetailScreen.tsx 만 |

## 10-2. 완성 후 사용자 경험

| **[ 사용자 동작 흐름 ]** 1. 사진 섹션 [+추가] 버튼 탭    ↓ 2. 카메라 / 갤러리 선택 Alert    ↓  (갤러리 선택 시) 3. 갤러리 열림 → 사진 여러 장 탭해서 선택    (예: 3장 선택 후 확인 버튼)    ↓ 4. "1/3 업로드 중..." 진행 표시    "2/3 업로드 중..."    "3/3 업로드 중..."    ↓ 5. "3장 업로드 완료!" Alert    ↓ 6. 사진 그리드 자동 새로고침 |
| --- |

## 10-3. 수정 위치

| **항목** | **내용** |
| --- | --- |
| **파일 경로** | app/src/screens/ScheduleDetailScreen.tsx |
| **수정 함수 1** | pickFromGallery — selectionLimit 옵션 추가 |
| **수정 함수 2** | uploadAndRefresh → uploadMultipleAndRefresh 로 교체 |
| **추가 state** | uploadProgress: string — "2/5 업로드 중..." 진행 표시용 |
| **백엔드** | 변경 없음 — 기존 POST /schedules/{id}/photos 그대로 사용 |

## 10-4. 핵심 개념 — selectionLimit이 뭔가요?

launchImageLibrary 함수에 넘기는 옵션 중 하나예요.

"갤러리에서 몇 장까지 선택할 수 있게 할지" 제한하는 값이에요.

| **selectionLimit 값** | **의미** |
| --- | --- |
| **1 (현재)** | 1장만 선택 가능 (기본값) |
| **0** | ★ 제한 없음 — 원하는 만큼 선택 가능 |
| **5** | 최대 5장까지만 선택 가능 |

| **💡 selectionLimit: 0 이 ****"****무제한****"****인 이유: 0을 ****"****없음(제한 없음)****"****으로 해석하는 관례예요. 한꺼번에 너무 많이 올리면 서버 부하가 생길 수 있어서 10~20장 정도로 제한하는 것도 좋아요.** |
| --- |

## 10-5. 수정 전 / 후 코드

### ① state 추가

**[ 기존 state 아래에 추가 ]**

// 업로드 진행 표시 ("2/5 업로드 중...")

const [uploadProgress, setUploadProgress] = useState<string>('');

### ② pickFromGallery 함수 수정

**[ 수정 전 — 1장만 선택 ]**

const pickFromGallery = async () => {

  const result = await launchImageLibrary({

    mediaType: 'photo',

    quality: 0.8,

    // selectionLimit 없음 → 기본값 1장

  });

  if (result.didCancel || !result.assets?.[0]) return;

  await uploadAndRefresh(result.assets[0]);  // 1장만

};

**[ 수정 후 — 여러 장 선택 가능 ]**

const pickFromGallery = async () => {

  const result = await launchImageLibrary({

    mediaType: 'photo',

    quality: 0.8,

    selectionLimit: 0,   // ★ 핵심! 0 = 제한 없음

  });

  if (result.didCancel || !result.assets?.length) return;

  await uploadMultipleAndRefresh(result.assets);  // 여러 장

};

### ③ uploadMultipleAndRefresh 함수 신규 추가

기존 uploadAndRefresh 함수는 그대로 두고, 아래 함수를 새로 추가해요.

(카메라로 찍을 때는 1장이니 기존 uploadAndRefresh를 그대로 써요.)

const uploadMultipleAndRefresh = async (assets: any[]) => {

  setPhotoLoading(true);

  const total = assets.length;

  let successCount = 0;

  let failCount = 0;

  try {

    for (let i = 0; i < total; i++) {

      const asset = assets[i];

      // 진행 표시 업데이트 ("1/3 업로드 중...")

      setUploadProgress(`${i + 1}/${total} 업로드 중...`);

      try {

        await uploadSchedulePhoto(

          id,

          {

            uri:  asset.uri,

            name: asset.fileName ?? `photo_${Date.now()}_${i}.jpg`,

            type: asset.type  ?? 'image/jpeg',

          },

          currentCategory,

        );

        successCount++;

      } catch (e) {

        // 1장 실패해도 나머지는 계속 업로드

        failCount++;

        console.warn(`사진 ${i + 1} 업로드 실패`, e);

      }

    }

    // 결과 알림

    if (failCount === 0) {

      Alert.alert('완료', `${successCount}장 업로드 완료!`);

    } else {

      Alert.alert(

        '일부 실패',

        `${successCount}장 성공 / ${failCount}장 실패\n실패한 사진은 다시 시도해주세요.`

      );

    }

    await fetchPhotos();  // 전체 목록 새로고침

  } finally {

    setPhotoLoading(false);

    setUploadProgress('');  // 진행 표시 초기화

  }

};

### ④ 진행 표시 UI 추가

사진 섹션에 업로드 진행 상황을 표시해주는 텍스트를 추가해요.

**[ JSX — PhotoGrid 위쪽에 추가 ]**

{/* 업로드 진행 표시 */}

{uploadProgress !== '' && (

  <View style={styles.progressBox}>

    <ActivityIndicator size="small" color="#2E75B6" />

    <Text style={styles.progressText}>{uploadProgress}</Text>

  </View>

)}

// styles 추가

progressBox: {

  flexDirection: 'row',

  alignItems: 'center',

  justifyContent: 'center',

  paddingVertical: 10,

  gap: 8,

},

progressText: {

  fontSize: 14,

  color: '#2E75B6',

  fontWeight: '600',

},

## 10-6. 주의사항 및 자주 묻는 것들

| **질문** | **답변** |
| --- | --- |
| **카메라는 다건 안 되나요?** | 카메라로 찍을 때는 1장씩만 돼요 (기기 특성상). 갤러리에서만 다건 선택 가능해요. 카메라는 기존 uploadAndRefresh 그대로 쓰면 돼요. |
| **동시에 올리면 더 빠르지 않나요?** | 동시 업로드도 가능하지만 서버에 부하가 몰릴 수 있어요. 순서대로(for 루프) 올리는 게 안전하고, 체감 속도 차이도 크지 않아요. |
| **업로드 중 뒤로 가면?** | 현재 코드는 뒤로 가도 업로드가 계속 진행돼요. 나중에 취소 기능이 필요하면 AbortController를 추가하면 돼요 — 지금은 생략해도 무방해요. |
| **몇 장까지 허용할까요?** | selectionLimit: 0 은 무제한이에요. 현장 사진이 많을 수 있으니 무제한이 자연스러워요. 서버 용량이 걱정되면 selectionLimit: 20 정도로 제한해도 돼요. |
| **백엔드 수정이 진짜 없나요?** | 네, 없어요. 기존 POST /schedules/{id}/photos API를 사진 수만큼 반복 호출하는 거라 백엔드는 그대로예요. |

| **⚠️ 한 번에 너무 많은 사진(20장 이상)을 올리면 시간이 오래 걸릴 수 있어요. 사용자가 기다리다 앱을 꺼버릴 수도 있으니 선택 장수가 많으면 ****"****시간이 걸릴 수 있습니다****"**** 안내 문구를 추가하는 게 좋아요.** |
| --- |

# 11. 집에서 작업할 순서 (전체)

1~9번: v1.4 문서 참고 / 10번: 아래 순서대로

| **순서** | **파일** | **할 일** | **시간** |
| --- | --- | --- | --- |
| **1~9** | (v1.4 참고) | 버그 수정 + 구조 개선 + 원천징수 + 사업자 여부 + 알림 설계 | 약 3시간 |
| **10-1** | **ScheduleDetailScreen.tsx** | uploadProgress state 추가 | 3분 |
| **10-2** | **ScheduleDetailScreen.tsx** | pickFromGallery에 selectionLimit: 0 추가 | 2분 |
| **10-3** | **ScheduleDetailScreen.tsx** | uploadMultipleAndRefresh 함수 신규 추가 | 15분 |
| **10-4** | **ScheduleDetailScreen.tsx** | 진행 표시 UI (progressBox) 추가 | 5분 |
| **10-5** | **에뮬레이터/실기기** | 갤러리에서 3장 선택 → 업로드 진행 확인 → 그리드에 표시 확인 | 10분 |

| **✅ 10번은 수정 범위가 딱 1개 파일(ScheduleDetailScreen.tsx)이에요. 백엔드 건드릴 필요 없어서 부담 없이 할 수 있어요!** |
| --- |

# 변경 이력

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v1.0** | 2026-04-27 | 최초 작성 — UI 버그 3건 |
| **v1.1** | 2026-04-27 | 항목 4 추가 — 공종/공정 통합 |
| **v1.2** | 2026-04-27 | 항목 5·6 추가 — 세금 표현 수정 + 3.3% 분리 |
| **v1.3** | 2026-04-27 | 항목 7 추가 — 원천징수 여부 토글 |
| **v1.4** | 2026-04-27 | 항목 8·9 추가 — 사업자 여부 + 세금 알림 |
| **v1.5** | 2026-04-27 | ★ 항목 10 추가 — 사진 갤러리 다건 선택 업로드. pickFromGallery에 selectionLimit:0 추가 / uploadMultipleAndRefresh 함수 신규 (순차 업로드 + 실패 카운트 + 결과 Alert) / uploadProgress state + progressBox UI / 백엔드 변경 없음 / 주의사항 5가지 Q&A 포함. |

© 2026 Team Schedule Manager