Team Schedule Manager  |  v10.1.2 백엔드 패치

Team Schedule Manager  |  개발 매뉴얼 v10.1.2

**개발 매뉴얼 v10.1.2**

**백엔드 패치 — 모바일 통합 시 발견된 2건의 버그 수정**

작성일: 2026-04-25  |  v10.1.1 후속 패치  |  소요 시간: 10분

| **💡 이 매뉴얼은 누구를 위한 것?** v10.1.1 백엔드(공수·급여 자동 계산 API)를 구현한 후 v10.2 모바일 UI와 통합 테스트를 하다가 발견된 2가지 버그를 수정하는 매뉴얼입니다. v10.1.1만 따라했을 때는 발견되지 않다가, 실제 모바일 앱에서 단가 등록·일정 등록을 하면서 드러난 이슈들이에요. 이미 v10.2까지 진행하셨다면 이 패치는 적용 완료된 상태일 수 있습니다. 새로 시작하는 분이라면 v10.1.1 매뉴얼 따라하신 후 이 매뉴얼로 패치하세요. |
| --- |

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v10.1.1 | 핵심 기능 API — 공수·급여 자동 계산 (실전 검증) | ✅ 완료 |
| v10.1.2 ◀ | 백엔드 패치 — SoftDelete + Observer 타이밍 | ▶ 현재 |
| v10.2 | 모바일 공수/단가 입력 UI | ✅ 완료 |
| v10.2.1 | 모바일 — 일정 수정/삭제 + 상세 v9.0 필드 표시 | ✅ 완료 |
| v10.3 | 모바일 수입 대시보드 실연동 | ⏳ 다음 |

# **1. 이 패치가 다루는 2가지 버그**

v10.2 작업 중 발견되어 즉시 수정 완료된 백엔드 이슈입니다:

| **#** | **버그** | **발견 경로** |
| --- | --- | --- |
| 1 | UserWageSettingController updateOrCreate가 SoftDelete된 레코드와 유니크 인덱스 충돌 | 단가 삭제 후 재등록 시 1062 Duplicate entry 에러 |
| 2 | ScheduleController의 attach() 직후 Observer 미발동 → monthly_summary 자동 갱신 안 됨 | 모바일 일정 등록 후 GET /monthly-summary가 갱신 안 됨 |

# **2. 패치 ① — UserWageSettingController SoftDelete 충돌**

## **2.1 문제 시나리오**

| 1) 사용자 A가 도배 단가 280,000원 등록 (POST)    → user_wage_settings INSERT (id=1, user_id=2, work_type_id=1)  2) 사용자 A가 도배 단가 삭제 (DELETE)    → user_wage_settings UPDATE (deleted_at = '2026-04-25 12:00:00')    → 레코드 자체는 DB에 남아있음! (SoftDelete 특성)  3) 사용자 A가 다시 도배 단가 등록 시도 (POST)    → updateOrCreate가 SoftDelete된 레코드를 무시하고 INSERT 시도    → 유니크 인덱스 user_work_type_unique (user_id, work_type_id) 충돌!    → SQLSTATE[23000]: 1062 Duplicate entry '2-1' 에러 ❌ |
| --- |

## **2.2 원인**

Laravel의 updateOrCreate는 SoftDelete된 레코드를 "이미 삭제된 것"으로 판단하여 새로 INSERT를 시도합니다. 하지만 DB의 유니크 인덱스는 deleted_at을 신경 쓰지 않고 (user_id, work_type_id) 조합만 봅니다. 결과적으로 같은 (user_id, work_type_id) 조합의 레코드가 이미 있어서 INSERT 실패.

| **💡 왜 v10.1.1에서는 발견되지 않았나?** Thunder Client 테스트 시나리오 T7에서는 단가 삭제만 했고, 같은 공정으로 재등록은 안 했어요. 모바일 앱에서 사용자가 자연스럽게 "삭제 → 재등록" 순서로 사용하면서 발견된 이슈입니다. |
| --- |

## **2.3 해결 — withTrashed() + restore() 패턴**

**파일: backend/app/Http/Controllers/Api/UserWageSettingController.php**

store() 메서드의 updateOrCreate 부분을 아래 코드로 교체:

| // ❌ 기존 (SoftDelete 무시) $setting = UserWageSetting::updateOrCreate(     [         'user_id'      => $user->id,         'work_type_id' => $workTypeId,     ],     [         'default_wage'       => $defaultWage,         'default_work_units' => $defaultWorkUnits,         'memo'               => $memo,     ] );  // ✅ 수정 — SoftDelete된 레코드까지 포함해서 찾고 복원 $setting = UserWageSetting::withTrashed()     ->where('user_id', $user->id)     ->where('work_type_id', $workTypeId)     ->first();  if ($setting) {     // 기존 레코드(삭제된 것 포함) 발견 → 복원 + 업데이트     $setting->restore();  // deleted_at = null     $setting->update([         'default_wage'       => $defaultWage,         'default_work_units' => $defaultWorkUnits,         'memo'               => $memo,     ]); } else {     // 진짜 신규 → INSERT     $setting = UserWageSetting::create([         'user_id'            => $user->id,         'work_type_id'       => $workTypeId,         'default_wage'       => $defaultWage,         'default_work_units' => $defaultWorkUnits,         'memo'               => $memo,     ]); } |
| --- |

## **2.4 주요 함수 풀이**

| **함수** | **의미** |
| --- | --- |
| withTrashed() | 기본 동작은 SoftDelete된 레코드 자동 제외. 이 메서드 호출 시 삭제된 것까지 포함하여 조회 |
| onlyTrashed() | 삭제된 것만 조회 (참고) |
| restore() | deleted_at을 NULL로 되돌려 "다시 살아있는 레코드"로 만듦. 단순 update보다 의도가 명확 |
| updateOrCreate()의 한계 | SoftDelete를 인지하지 못함. 삭제된 레코드 있을 시 신규 INSERT 시도 → 유니크 충돌 |

# **3. 패치 ② — ScheduleController Observer 발동 타이밍**

## **3.1 문제 시나리오**

| 1) 모바일에서 일정 등록 (POST /api/schedules)    payload: { date, daily_wage: 280000, work_units: 1.0, user_ids: [2] }  2) ScheduleController::store() 실행    ├─ Schedule::create([...])  ← saved 이벤트 발동    │     ↓    │   ScheduleObserver::saved($schedule) 자동 호출    │     ↓    │   recalculateForAllParticipants($schedule)    │     ↓    │   DB::table('schedule_users')->where('schedule_id', $schedule->id)->pluck('user_id')    │     ↓    │   ❌ 빈 배열! (아직 attach 전이므로!)    │     ↓    │   foreach 안 돌고 종료 → monthly_summary 갱신 안 됨    │    └─ $schedule->users()->attach([2])  ← 여기서 schedule_users INSERT                                           (이때 saved 이벤트 안 발동됨!)  결과: 일정은 등록됐지만 monthly_summary는 갱신 안 됨 ❌ |
| --- |

## **3.2 원인**

Schedule 모델에 ScheduleObserver가 등록되어 saved 이벤트를 듣지만, Schedule이 먼저 INSERT되고 나서 schedule_users는 그 이후에 attach됩니다. Observer가 saved 시점에 schedule_users를 조회해도 아직 비어있어서 재계산할 user_id가 없어 그대로 종료됩니다. attach() 자체는 saved 이벤트를 다시 발생시키지 않습니다.

| **💡 Tinker로 수동 호출하면 잘 됐던 이유** v10.1.1 매뉴얼의 Thunder Client 테스트는 일정 등록 후 monthly-summary 첫 조회 시점에 "캐시 MISS → Service::recalculate() 자동 호출"이 일어나서 정상 결과를 받았어요. 하지만 모바일 앱에서는 등록 직후 monthly-summary를 다시 조회할 때 캐시가 이미 있어서 (이전 값 그대로 보였음) 갱신이 누락된 사실이 드러났습니다. 결국 "캐시는 있지만 Observer가 안 돌아서 캐시가 stale 상태"였던 것. |
| --- |

## **3.3 해결 — attach/sync 직후 $schedule-****>****touch()**

**파일: backend/app/Http/Controllers/Api/ScheduleController.php**

### **3.3.1 store() 메서드 수정**

| // ❌ 기존 if (!empty($data['user_ids'])) {     $schedule->users()->attach($data['user_ids']); }  // ✅ 수정 — attach 후 touch로 saved 재발동 if (!empty($data['user_ids'])) {     $schedule->users()->attach($data['user_ids']);     $schedule->touch();  // ★ Observer 재발동 트리거 } |
| --- |

### **3.3.2 update() 메서드도 동일하게 수정**

| // ❌ 기존 if (isset($data['user_ids'])) {     $schedule->users()->sync($data['user_ids']); }  // ✅ 수정 — sync 후 touch if (isset($data['user_ids'])) {     $schedule->users()->sync($data['user_ids']);     $schedule->touch();  // ★ Observer 재발동 트리거 } |
| --- |

## **3.4 $schedule-****>****touch() 풀이**

Laravel의 Eloquent 모델 메서드. updated_at 컬럼을 현재 시각으로 업데이트하면서 saving / saved 이벤트를 발생시킵니다.

| **단계** | **동작** |
| --- | --- |
| 1 | updated_at 컬럼을 현재 시각으로 변경 |
| 2 | saving 이벤트 발동 |
| 3 | DB UPDATE 실행 |
| 4 | ★ saved 이벤트 발동 → ScheduleObserver::saved() 호출됨 |
| 5 | Observer가 schedule_users 조회 → 이번엔 user_id 있음 → 재계산 |

| **💡 더 깔끔한 대안 (선택)** touch()는 약간 hack 같은 느낌이라, 더 명시적인 방법으로 attach 후 직접 Service를 호출할 수도 있습니다: foreach ($data['user_ids'] as $userId) {     \App\Services\MonthlySummaryService::recalculate((int) $userId, $yearMonth); } 하지만 touch()는 1줄로 끝나고 Observer 의존성도 유지되므로 v10.1.2에서는 touch()를 채택. v15 코드 정리 단계에서 명시적 호출로 전환 가능. |
| --- |

# **4. 패치 적용 후 검증**

## **4.1 자동 반영 — 서버 재시작 불필요**

두 패치 모두 컨트롤러 코드 수정이므로 Laravel이 매 요청마다 새로 로드합니다. 파일 저장만 하면 다음 요청부터 즉시 반영. AppServiceProvider 수정 같이 boot 시점 코드가 아니므로 서버 재시작 불필요.

## **4.2 검증 시나리오**

### **4.2.1 패치 ① 검증 — 단가 삭제 후 재등록**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | Thunder Client: POST /api/wage-settings (work_type_id=1, default_wage=280000) | 200 + id=1 생성 |
| 2 | DELETE /api/wage-settings/1 | 200 + 삭제 (deleted_at 채워짐) |
| 3 | 같은 POST 다시 (work_type_id=1, default_wage=300000) | 200 + 같은 id=1 (restore됨, default_wage=300000) |

**★ 패치 전: 단계 3에서 1062 Duplicate entry 에러 → 패치 후: 정상 처리**

### **4.2.2 패치 ② 검증 — 일정 등록 후 monthly_summary 자동 갱신**

| **단계** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | GET /api/monthly-summary?year=2026&month=4 (현재 값 기록) | last_calculated_at 시각 기록 |
| 2 | POST /api/schedules { daily_wage: 280000, work_units: 1.0, user_ids: [2] } | 201 + 일정 생성 |
| 3 | GET /api/monthly-summary 재조회 | last_calculated_at이 방금 시각으로 갱신됨 ★ + total_income 증가 |

**★ 패치 전: 단계 3에서 last_calculated_at 그대로 → 패치 후: 갱신됨**

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| v10.1.2 | 2026-04-25 | v10.2 모바일 통합 작업 중 발견된 백엔드 패치 2건 정리. 패치①: UserWageSettingController.store()의 updateOrCreate가 SoftDelete된 레코드와 유니크 인덱스 충돌 → withTrashed()+restore() 패턴으로 해결. 패치②: ScheduleController.store()/update()의 attach()/sync() 후 saved 이벤트 미발동으로 ScheduleObserver가 빈 schedule_users 조회 → $schedule->touch() 한 줄로 재발동. 둘 다 모바일 앱에서 자연스러운 사용 흐름(삭제→재등록, 일정등록→집계조회)에서 발견됨. |

# **부록 A. 이 패치들이 가르쳐주는 교훈**

## **A.1 SoftDelete + 유니크 인덱스의 함정**

SoftDelete를 쓰는 모델에 유니크 인덱스가 있으면 항상 withTrashed() 패턴을 고려해야 합니다. updateOrCreate, firstOrCreate 같은 메서드는 SoftDelete를 인지하지 않으므로 안전하게 쓰려면 명시적으로 withTrashed()로 검색하고 restore() 분기 처리하는 게 정석.

## **A.2 Eloquent 이벤트는 명시적 액션에만 발동됨**

attach(), sync(), detach() 같은 belongsToMany 관계 메서드들은 saved 이벤트를 자동 발생시키지 않습니다. 부모 모델의 변경 시점이 아니라 중간 테이블의 변경이기 때문이에요. 이런 변경 후에 saved 이벤트가 필요하다면 touch() 또는 명시적 save() 호출이 필요합니다.

## **A.3 Thunder Client 테스트 시나리오의 한계**

v10.1.1의 Thunder Client 10단계 테스트는 잘 통과했지만, 모바일 앱의 실제 사용 흐름과는 미묘한 차이가 있었어요. 특히 "삭제 → 재등록", "등록 → 즉시 집계 조회" 같은 사용자 경로가 자동 테스트로는 잘 검증되지 않습니다. v15 단계에서 통합 e2e 테스트(Pest 또는 Cypress)를 도입하면 이런 이슈를 사전 감지 가능.

**— v10.1.2 백엔드 패치 매뉴얼 —**

**다음: v10.2.1 모바일 일정 수정·삭제 매뉴얼**

© 2026 Team Schedule Manager

© 2026 Team Schedule Manager  |  Page  /