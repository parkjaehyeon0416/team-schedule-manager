*Team Schedule Manager  |  개발 매뉴얼 v11 (현장 사진 구조화)*

**Team Schedule Manager**

**개발 매뉴얼 v11**

**현장 사진 구조화 (시공 전·중·후 카테고리)**

*기획서 v2.3 적용 — 차별화 1순위 기능 구현*

작성일: 2026-04-26

대상 OS: Windows 10/11

*기준: v10.3 완료 / 기획서 v2.3*

| **★ v11 핵심 안내 (2026-04-26)** **• 기획서 v2.3 적용 후 첫 매뉴얼. 기존 v10.3에서 예고했던 ‘근태 자동 집계’가 아닌 ‘현장 사진 구조화’로 주제가 변경되었어요.** **• 변경 이유는 기획서 v2.3 1장(변경 사항 요약)을 참조하세요.** **• v9.0에서 이미 만들어둔 site_files 테이블의 photo_category 컬럼을 실제로 활용하는 단계입니다. DB 작업은 가벼워요.** **• 카메라/갤러리 권한 처리, 카테고리 탭 UI, 비교 보기 모드가 핵심 작업입니다.** |
| --- |

# **0. 전체 매뉴얼 시리즈**

| **버전** | **제목** | **상태** |
| --- | --- | --- |
| v1 | 로컬 개발 환경 세팅 | ✅ 완료 |
| v2 | Laravel 백엔드 설치 | ✅ 완료 |
| v3 | DB 설계 및 마이그레이션 | ✅ 완료 |
| v4 | React 웹 관리자 설치·설정 | ✅ 완료 |
| v5 | React Native 앱 설치·설정 | ✅ 완료 |
| v6 | API 라우팅 + 인증 구현 | ✅ 완료 |
| v7 | 핵심 기능 API + 캘린더 뷰 | ✅ 완료 |
| v9.0 | DB 확장 (공수/급여/사진/보고서) | ✅ 완료 |
| v9.1 | 웹/모바일 역할 분리 + UX 재설계 | ✅ 완료 |
| v10.1.1 | 공수·급여 자동 계산 API | ✅ 완료 |
| v10.1.2 | 백엔드 패치 (SoftDelete + Observer) | ✅ 완료 |
| v10.2 | 모바일 공수/단가 입력 UI | ✅ 완료 |
| v10.2.1 | 모바일 일정 수정/삭제 | ✅ 완료 |
| v10.3 | 모바일 수입 대시보드 + 캘린더 연동 | ✅ 완료 |
| **v11 ◀** | **현장 사진 구조화 (시공 전·중·후)** | **▶ 현재** |
| v12 | 자동 보고서 생성 1단계 (PDF) | ⏳ 예정 |
| v13 | 자동 보고서 2단계 (공유 + 열람 추적) | ⏳ 예정 |
| v14 | 게스트 참여 + 달력 이력 자동 기록 | ⏳ 예정 |
| v15 | 출시 준비 + 안드로이드 빌드 | ⏳ 예정 |
| v16 | 배포 및 운영 자동화 (구 v8) | ⏳ 예정 |

*v8(배포)은 매뉴얼 시리즈 표 마지막에 그대로 두지만, 실제 작업은 모든 핵심 기능 완성 후로 미루는 정책이에요. 매뉴얼 번호는 ‘작업 순서’에 따라 자연 증가합니다.*

# **1. 이 매뉴얼이 다루는 범위**

## **1.1 작업 항목 한눈에 보기**

| **#** | **작업** | **구분** | **예상 시간** |
| --- | --- | --- | --- |
| 1 | site_files 테이블 photo_category 컬럼 점검 (v9.0 완료 사항 확인) | 백엔드 점검 | 5분 |
| 2 | SiteFile 모델 fillable에 photo_category, description, sort_order 추가 | 백엔드 모델 | 5분 |
| 3 | ScheduleController photos() / destroyPhoto() 메서드 확장 (카테고리 지원) | 백엔드 API | 20분 |
| 4 | API 응답 타입 정의 (types/api.ts) — SiteFile 인터페이스 확장 | 공통 타입 | 5분 |
| 5 | schedulesApi.ts 확장 — getPhotos, uploadPhoto, deletePhoto 함수 추가 | 모바일 API 헬퍼 | 10분 |
| 6 | PhotoCategoryTabs 컴포넌트 신규 — 4개 카테고리 탭 UI | 모바일 UI | 20분 |
| 7 | PhotoGrid 컴포넌트 신규 — 카테고리별 사진 격자 표시 | 모바일 UI | 20분 |
| 8 | ScheduleDetailScreen 사진 섹션 교체 — 탭 + 그리드 + 업로드 | 모바일 통합 | 30분 |
| 9 | 비교 보기 모드 (시공 전 ↔ 시공 후 슬라이드) — 신규 화면 | 모바일 UI | 30분 |
| 10 | Thunder Client 백엔드 테스트 + 안드로이드 에뮬 통합 테스트 | 테스트 | 20분 |
| 11 | Git 커밋 + push | 마무리 | 5분 |

## **1.2 작업 후 사용자가 보는 것**

일정 상세 화면에 들어가면 사진 섹션이 다음과 같이 보여야 해요. 이전 v10.2.1까지는 그냥 사진 한 줄로 쌓이는 구조였는데, 이제 카테고리별로 명확히 분류됩니다.

| [일정 상세 화면 — 사진 섹션] ┌───────────────────────────────────────────────┐ │  📸 현장 사진                                  │ │                                               │ │  ┌───────┬───────┬───────┬───────┐            │ │  │시공 전│시공 중│시공 후│ 기타 │  ← 카테고리 탭 │  │  (5)  │  (2)  │  (3)  │ (0)  │            │ │  └───┬───┴───────┴───────┴───────┘            │ │                                               │ │  [사진1] [사진2] [사진3] [사진4]              │  ← 선택된 카테고리의 사진 그리드 │  [사진5] [+추가]                              │ │                                               │ │  [📷 시공 전 사진 추가]  [🔄 비교 보기]       │ └───────────────────────────────────────────────┘ |
| --- |

## **1.3 사용자 시나리오**

| **#** | **행동** | **결과** |
| --- | --- | --- |
| 1 | 도배 기사가 작업 시작 직전 일정 상세 진입 | ‘시공 전’ 탭이 기본 선택됨 |
| 2 | ‘시공 전 사진 추가’ 버튼 → 카메라 또는 갤러리 선택 | 촬영/선택한 사진이 ‘시공 전’ 카테고리에 저장 |
| 3 | 작업 중간에 진행 상황 사진 → ‘시공 중’ 탭 → 추가 | ‘시공 중’ 카테고리에 분류 |
| 4 | 작업 종료 후 ‘시공 후’ 탭 → 사진 추가 | ‘시공 후’ 카테고리에 분류 |
| 5 | ‘비교 보기’ 버튼 탭 | 시공 전 ↔ 시공 후를 좌우 슬라이드로 비교 가능 |
| 6 | (미래의 v12) ‘자동 보고서 생성’ 버튼 | 이 사진들을 재료로 PDF 보고서 자동 생성 |

# **2. 사전 점검 — 백엔드 DB 상태 확인**

v9.0에서 이미 site_files 테이블에 photo_category, description, sort_order 컬럼이 추가되었어요. 다만 실제로 잘 들어갔는지 본격 작업 전 확인합니다.

## **2.1 MySQL Workbench로 컬럼 확인**

- MySQL Workbench 접속 → SCHEMAS → team_schedule → Tables → site_files

- 우클릭 → ‘Table Inspector’ → Columns 탭

- 아래 3개 컬럼이 모두 있어야 해요:

| **컬럼명** | **타입** | **기본값** | **NULL 허용** |
| --- | --- | --- | --- |
| photo_category | ENUM('before','during','after','other') | 'other' | NO |
| description | VARCHAR(255) | NULL | YES |
| sort_order | INT | 0 | NO |

| **⚠️ 만약 컬럼이 없다면** **v9.0 매뉴얼이 누락된 상태일 수 있어요. 아래 마이그레이션을 직접 만들어 추가하세요.** |
| --- |

커맨드 (Laragon Terminal):

| cd C:\project\team-schedule\backend php artisan make:migration add_photo_category_to_site_files_table --table=site_files |
| --- |

생성된 마이그레이션 파일 내용:

| <?php use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema; return new class extends Migration {     public function up(): void {         Schema::table('site_files', function (Blueprint $table) {             $table->enum('photo_category',                 ['before','during','after','other'])                 ->default('other')->after('file_type');             $table->string('description', 255)->nullable()->after('photo_category');             $table->integer('sort_order')->default(0)->after('description');         });     }     public function down(): void {         Schema::table('site_files', function (Blueprint $table) {             $table->dropColumn(['photo_category','description','sort_order']);         });     } }; |
| --- |

적용:

| php artisan migrate |
| --- |

## **2.2 photo_category 4가지 값의 의미**

| **값** | **의미** | **사용 예시** |
| --- | --- | --- |
| **before** | 시공 전 (착수 증빙) | 도배 시작 전 ‘기존 벽지 상태’ 사진 |
| **during** | 시공 중 (진행 경과) | 도배 50% 진행 시점의 작업 사진 |
| **after** | 시공 후 (완료 증빙) | 도배 완료 후 깔끔한 벽 사진 |
| other | 기타 | 도면, 영수증, 자재 사진 등 |

| **💡 ENUM이 뭔가요?** **ENUM(이넘)은 ‘미리 정해둔 값 중 하나만 들어갈 수 있는 타입’이에요. photo_category가 ENUM이라는 건, 이 컬럼에 ‘before’, ‘during’, ‘after’, ‘other’ 4가지 외의 값은 절대 들어갈 수 없다는 뜻이에요. 비유하자면 ‘객관식 문제’ 같은 거예요. 주관식이면 뭐든 답할 수 있지만, 객관식은 보기 중에서만 골라야 하는 것처럼요. 잘못된 값을 누가 실수로 넣어도 DB가 거부해주니까 데이터 일관성에 도움이 됩니다.** |
| --- |

# **3. 백엔드 작업**

## **3.1 SiteFile 모델 fillable 확장**

Laravel의 fillable이 뭔지 먼저 짚을게요. fillable은 ‘이 컬럼들은 사용자 입력으로 저장해도 안전합니다’를 모델에 알려주는 화이트리스트예요. 보안 기능 중 하나로, 의도치 않은 컬럼 변경을 막아줍니다(예: 누군가 user_id를 슬쩍 바꿔서 다른 사람 데이터를 조작하는 공격 차단).

파일 위치: backend/app/Models/SiteFile.php

| <?php namespace App\Models; use Illuminate\Database\Eloquent\Model; use Illuminate\Database\Eloquent\SoftDeletes; class SiteFile extends Model {     use SoftDeletes;     protected $fillable = [         'site_id',         'original_name',         'stored_name',         'mime_type',         'file_size',         'file_path',         'file_type',         'uploaded_by',         // ★ v11 추가 (사진 카테고리)         'photo_category',         'description',         'sort_order',     ];     // ★ v11 추가 — 카테고리별 사진 조회 스코프     public function scopeOfCategory($query, string $category)     {         return $query->where('photo_category', $category);     } } |
| --- |

| **💡 scope (스코프) 함수가 뭔가요?** **Eloquent에서 자주 쓰는 쿼리 조건을 메서드처럼 재사용할 수 있게 해주는 기능이에요. scopeOfCategory를 만들어두면, 다른 곳에서 SiteFile::ofCategory(****'****before****'****)-****>****get() 처럼 깔끔하게 쓸 수 있어요. ‘scope’ 접두사는 Laravel이 자동으로 떼어내고 ofCategory로 인식합니다.** |
| --- |

## **3.2 ScheduleController photos() 메서드 확장**

v10.2.1에서 모바일이 호출하던 POST /api/schedules/{id}/photos 엔드포인트를 카테고리 지원하도록 확장합니다. 기존 메서드가 있는 상태에서 시작한다고 가정해요. 만약 없다면 아래 코드를 그대로 새로 작성하세요.

파일 위치: backend/app/Http/Controllers/Api/ScheduleController.php

### **3.2.1 사진 업로드 (POST)**

| /**  * 일정에 사진 업로드 — 카테고리 지원 (v11 확장)  * POST /api/schedules/{id}/photos  * Body: photo (file), photo_category (string), description (string, optional)  */ public function uploadPhoto(Request $request, int $id) {     // ① 입력값 검증     $validated = $request->validate([         'photo'          => 'required│image│max:10240', // 10MB 제한         'photo_category' => 'required│in:before,during,after,other',         'description'    => 'nullable│string│max:255',     ]);     // ② 일정 존재 확인 + site_id 추출     $schedule = Schedule::findOrFail($id);     if (!$schedule->site_id) {         return ApiResponse::error('이 일정에는 현장이 연결되어 있지 않습니다.',                                   'ERR_SCHED_001', 422);     }     // ③ 파일 저장 (storage/app/public/site-photos/ 에 저장)     $file       = $request->file('photo');     $storedName = uniqid('photo_') . '.' . $file->getClientOriginalExtension();     $filePath   = $file->storeAs('site-photos', $storedName, 'public');     // ④ 같은 카테고리 사진 개수로 sort_order 결정     $sortOrder = SiteFile::where('site_id', $schedule->site_id)         ->ofCategory($validated['photo_category'])         ->count();     // ⑤ DB 저장     $siteFile = SiteFile::create([         'site_id'        => $schedule->site_id,         'original_name'  => $file->getClientOriginalName(),         'stored_name'    => $storedName,         'mime_type'      => $file->getMimeType(),         'file_size'      => $file->getSize(),         'file_path'      => $filePath,         'file_type'      => 'photo',         'uploaded_by'    => $request->user()->id,         'photo_category' => $validated['photo_category'],         'description'    => $validated['description'] ?? null,         'sort_order'     => $sortOrder,     ]);     return ApiResponse::success($siteFile, '사진이 업로드되었습니다.'); } |
| --- |

| **💡 코드 흐름 풀이** **① validate(): 잘못된 입력을 1차 차단. ‘in:before,during,after,other’는 photo_category가 4가지 값 중 하나가 아니면 422 오류 응답.** **② findOrFail: 해당 id의 일정이 없으면 404 자동 반환. site_id가 NULL이면 422 응답(우리 정책).** **③ storeAs: 파일을 저장하고 경로를 반환. ‘public’ 디스크는 storage/app/public/ 폴더에 저장되며, 외부에서 URL로 접근 가능.** **④ sort_order: 같은 카테고리에 이미 있는 사진 개수를 0부터 카운트해서 새 사진은 그 다음 순서가 됨.** **⑤ create(): fillable에 등록된 컬럼만 한 번에 저장. 모델에서 SoftDeletes를 쓰므로 deleted_at은 NULL로 시작.** |
| --- |

### **3.2.2 카테고리별 사진 목록 조회 (GET)**

일정 상세 화면이 ‘이 일정과 연결된 현장의 사진들’을 카테고리별 개수와 함께 가져와야 해요. 한 번의 API 호출로 4개 카테고리를 모두 묶어서 반환하는 게 효율적이에요.

| /**  * 일정의 사진 목록 조회 (카테고리별 그룹) — v11 신규  * GET /api/schedules/{id}/photos  * Returns: { before: [...], during: [...], after: [...], other: [...], counts: {...} }  */ public function listPhotos(int $id) {     $schedule = Schedule::findOrFail($id);     if (!$schedule->site_id) {         // 현장 미연결 일정은 빈 결과 반환         return ApiResponse::success([             'before' => [], 'during' => [], 'after' => [], 'other' => [],             'counts' => ['before' => 0, 'during' => 0, 'after' => 0, 'other' => 0],         ]);     }     // 사진만 + 같은 site_id, sort_order 정순     $photos = SiteFile::where('site_id', $schedule->site_id)         ->where('file_type', 'photo')         ->orderBy('sort_order')         ->orderBy('created_at')         ->get();     // 카테고리별로 그룹핑     $grouped = [         'before' => [], 'during' => [], 'after' => [], 'other' => [],     ];     foreach ($photos as $p) {         $cat = $p->photo_category ?? 'other';         if (isset($grouped[$cat])) {             $grouped[$cat][] = $p;         }     }     return ApiResponse::success([         'before' => $grouped['before'],         'during' => $grouped['during'],         'after'  => $grouped['after'],         'other'  => $grouped['other'],         'counts' => [             'before' => count($grouped['before']),             'during' => count($grouped['during']),             'after'  => count($grouped['after']),             'other'  => count($grouped['other']),         ],     ]); } |
| --- |

### **3.2.3 사진 삭제 (DELETE)**

실수로 잘못된 사진을 올렸을 때 삭제할 수 있어야 해요. SoftDelete가 켜져 있어서 실수해도 DB에 deleted_at만 채워지고 실제 파일은 남으므로 복구 가능.

| /**  * 사진 삭제 — v11 신규  * DELETE /api/schedules/{id}/photos/{photoId}  */ public function deletePhoto(int $id, int $photoId) {     $schedule = Schedule::findOrFail($id);     $photo    = SiteFile::where('id', $photoId)         ->where('site_id', $schedule->site_id)         ->where('file_type', 'photo')         ->firstOrFail();     $photo->delete(); // SoftDelete — deleted_at만 기록, 파일 보존     return ApiResponse::success(null, '사진이 삭제되었습니다.'); } |
| --- |

## **3.3 라우팅 점검 — routes/api.php**

위 3개 메서드가 라우트로 노출되어 있어야 해요. routes/api.php에 아래 라인들이 있는지 확인하고, 없으면 추가합니다.

| Route::middleware('auth:sanctum')->group(function () {     // ... 기존 스케줄 라우트들     // ★ v11 사진 카테고리 라우트     Route::get   ('/schedules/{id}/photos',           [ScheduleController::class, 'listPhotos']);     Route::post  ('/schedules/{id}/photos',           [ScheduleController::class, 'uploadPhoto']);     Route::delete('/schedules/{id}/photos/{photoId}', [ScheduleController::class, 'deletePhoto']); }); |
| --- |

## **3.4 storage 심볼릭 링크 확인 (한 번만 해두면 영구 적용)**

파일을 저장하면 storage/app/public/site-photos/ 에 들어가는데, 브라우저에서 이미지를 보려면 public/storage/ 라는 가짜 경로(심볼릭 링크)를 통해 접근해야 해요. 한 번만 실행하면 됩니다.

| php artisan storage:link |
| --- |

성공 메시지: ‘The [public/storage] link has been connected to [storage/app/public].’

| **💡 심볼릭 링크가 뭔가요?** **한쪽 폴더에 만든 ‘바로가기’ 같은 거예요. public/storage 라는 폴더에 누가 접근하면 자동으로 storage/app/public/ 폴더로 연결되는 식이에요. Laravel이 보안상 storage 폴더를 직접 노출하지 않으려고 만든 우회로입니다. 한 번만 설정해두면 OS 레벨 링크라 계속 유지됩니다.** |
| --- |

# **4. 모바일 작업**

## **4.1 사전 점검 — react-native-image-picker**

v10.2.1에서 launchImageLibrary를 이미 썼으니 라이브러리는 깔려 있을 거예요. 한 번 더 확인:

| cd C:\project\team-schedule\app npm list react-native-image-picker # 출력에 react-native-image-picker@x.x.x가 보이면 OK |
| --- |

없다면 설치:

| npm install react-native-image-picker |
| --- |

### **4.1.1 안드로이드 카메라 권한 추가**

갤러리만이 아니라 카메라 촬영도 지원하려면 안드로이드 권한이 필요해요.

파일 위치: app/android/app/src/main/AndroidManifest.xml

| <manifest ...>     <!-- ★ v11 추가 -->     <uses-permission android:name="android.permission.CAMERA" />     <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />     <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />     <uses-feature android:name="android.hardware.camera" android:required="false" />     ... </manifest> |
| --- |

권한 추가 후 앱을 재빌드해야 반영됩니다.

| npx react-native run-android |
| --- |

## **4.2 API 응답 타입 정의 — types/api.ts**

TypeScript는 ‘이 데이터가 어떤 모양인지’를 타입으로 미리 알려줘야 해요. SiteFile 인터페이스에 v11 컬럼들을 추가합니다.

파일 위치: app/src/types/api.ts

| // 사진 카테고리 타입 (★ v11 신규) export type PhotoCategory = 'before' │ 'during' │ 'after' │ 'other'; // SiteFile 인터페이스 (v11 확장) export interface SiteFile {   id: number;   site_id: number;   original_name: string;   stored_name: string;   mime_type: string;   file_size: number;   file_path: string;          // 'site-photos/photo_xxx.jpg' 형식   file_type: 'photo' │ 'document' │ null;   uploaded_by: number │ null;   // ★ v11 추가   photo_category: PhotoCategory;   description: string │ null;   sort_order: number;   created_at: string;   updated_at: string;   deleted_at: string │ null; } // 사진 목록 응답 타입 (★ v11 신규) export interface PhotoListResponse {   before: SiteFile[];   during: SiteFile[];   after:  SiteFile[];   other:  SiteFile[];   counts: {     before: number;     during: number;     after:  number;     other:  number;   }; } |
| --- |

## **4.3 schedulesApi.ts 함수 추가**

API 호출을 한곳에 모아둔 헬퍼 파일에 사진 관련 함수를 추가합니다. 이렇게 하면 화면 코드는 ‘어떤 URL로 호출하는지’를 신경 쓰지 않아도 돼요.

파일 위치: app/src/api/schedulesApi.ts

| import axiosInstance from './axiosInstance'; import { ApiResponse, PhotoCategory, PhotoListResponse, SiteFile } from '../types/api'; // ★ v11 — 일정의 사진 카테고리별 목록 export async function getSchedulePhotos(   scheduleId: number ): Promise<PhotoListResponse> {   const res = await axiosInstance.get<ApiResponse<PhotoListResponse>>(     `/schedules/${scheduleId}/photos`   );   return res.data.data; } // ★ v11 — 사진 업로드 (카테고리 + 캡션 포함) export async function uploadSchedulePhoto(   scheduleId: number,   photo: { uri: string; name: string; type: string },   category: PhotoCategory,   description?: string ): Promise<SiteFile> {   const formData = new FormData();   formData.append('photo', photo as any);   formData.append('photo_category', category);   if (description) formData.append('description', description);   const res = await axiosInstance.post<ApiResponse<SiteFile>>(     `/schedules/${scheduleId}/photos`,     formData,     { headers: { 'Content-Type': 'multipart/form-data' } }   );   return res.data.data; } // ★ v11 — 사진 삭제 export async function deleteSchedulePhoto(   scheduleId: number,   photoId: number ): Promise<void> {   await axiosInstance.delete(`/schedules/${scheduleId}/photos/${photoId}`); } |
| --- |

| **💡 FormData가 뭔가요?** **보통 API는 JSON 형식으로 데이터를 주고받는데, 파일 업로드는 JSON으로 보낼 수 없어요(JSON은 텍스트만 담을 수 있으니까). FormData는 파일+텍스트를 함께 묶어서 멀티파트 형식으로 보내주는 객체예요. 이메일에 첨부파일을 같이 보내는 것과 비슷한 원리예요. Content-Type을 ‘multipart/form-data’로 지정해야 서버가 파일로 인식해요.** |
| --- |

# **5. 모바일 컴포넌트 — 카테고리 탭 + 사진 그리드**

## **5.1 PhotoCategoryTabs 컴포넌트 신규**

4개 카테고리를 위/아래로 탭으로 보여주고, 각 탭 옆에 사진 개수 뱃지를 표시하는 컴포넌트예요. 사용자가 탭하면 부모에게 알려주는 단순 구조.

파일 위치: app/src/components/PhotoCategoryTabs.tsx (신규)

| import React from 'react'; import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'; import { PhotoCategory } from '../types/api'; interface Props {   current: PhotoCategory;   counts: { before: number; during: number; after: number; other: number };   onChange: (category: PhotoCategory) => void; } const TABS: { key: PhotoCategory; label: string }[] = [   { key: 'before', label: '시공 전' },   { key: 'during', label: '시공 중' },   { key: 'after',  label: '시공 후' },   { key: 'other',  label: '기타' }, ]; export default function PhotoCategoryTabs({ current, counts, onChange }: Props) {   return (     <View style={styles.row}>       {TABS.map(t => {         const active = current === t.key;         return (           <TouchableOpacity             key={t.key}             style={[styles.tab, active && styles.tabActive]}             onPress={() => onChange(t.key)}           >             <Text style={[styles.label, active && styles.labelActive]}>               {t.label}             </Text>             <Text style={[styles.count, active && styles.countActive]}>               {counts[t.key]}             </Text>           </TouchableOpacity>         );       })}     </View>   ); } const styles = StyleSheet.create({   row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },   tab: {     flex: 1, paddingVertical: 12, alignItems: 'center',     borderBottomWidth: 2, borderBottomColor: 'transparent',   },   tabActive: { borderBottomColor: '#1F3864' },   label: { fontSize: 14, color: '#888', fontWeight: '500' },   labelActive: { color: '#1F3864', fontWeight: '700' },   count: { fontSize: 12, color: '#BBB', marginTop: 2 },   countActive: { color: '#1F3864' }, }); |
| --- |

| **💡 useState/useEffect 같은 Hook 사용 안 한 이유** **이 컴포넌트는 ‘현재 어떤 탭이 선택되었는지’를 자기 안에서 관리하지 않고, 부모(ScheduleDetailScreen)가 props로 내려준 current를 그대로 보여주기만 해요. 이런 컴포넌트를 ‘제어 컴포넌트(Controlled Component)’라고 부르고, 단순함과 재사용성이 장점이에요. 만약 자기 안에서 useState로 관리했다면, 부모가 ‘초기값을 변경’하고 싶을 때 동기화가 까다로워졌을 거예요.** |
| --- |

## **5.2 PhotoGrid 컴포넌트 신규**

선택된 카테고리의 사진들을 격자 모양으로 보여주고, 마지막에 ‘+추가’ 버튼이 있는 컴포넌트예요. 사진을 길게 누르면 삭제 메뉴가 뜨도록 구성합니다.

파일 위치: app/src/components/PhotoGrid.tsx (신규)

| import React from 'react'; import {   View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, Alert, } from 'react-native'; import { SiteFile } from '../types/api'; interface Props {   photos: SiteFile[];   baseUrl: string;     // 예: 'http://10.0.2.2:8000/storage/'   onAdd: () => void;   onDelete: (photo: SiteFile) => void;   onPress?: (photo: SiteFile) => void; } const { width } = Dimensions.get('window'); const COL = 3; const GAP = 6; // 그리드 한 칸의 가로 길이 — 화면 너비에서 좌우 여백과 갭 빼고 3등분 const ITEM = Math.floor((width - 32 - GAP * (COL - 1)) / COL); export default function PhotoGrid({   photos, baseUrl, onAdd, onDelete, onPress, }: Props) {   const handleLongPress = (photo: SiteFile) => {     Alert.alert(       '사진 삭제',       '이 사진을 삭제하시겠습니까?',       [         { text: '취소', style: 'cancel' },         { text: '삭제', style: 'destructive', onPress: () => onDelete(photo) },       ],     );   };   return (     <View style={styles.grid}>       {photos.map(p => (         <TouchableOpacity           key={p.id}           style={styles.cell}           onPress={() => onPress?.(p)}           onLongPress={() => handleLongPress(p)}           delayLongPress={400}         >           <Image             source={{ uri: baseUrl + p.file_path }}             style={styles.image}           />         </TouchableOpacity>       ))}       {/* ★ 마지막 칸 — 추가 버튼 */}       <TouchableOpacity style={[styles.cell, styles.addCell]} onPress={onAdd}>         <Text style={styles.addPlus}>+</Text>         <Text style={styles.addLabel}>추가</Text>       </TouchableOpacity>     </View>   ); } const styles = StyleSheet.create({   grid: {     flexDirection: 'row', flexWrap: 'wrap',     paddingHorizontal: 16, paddingVertical: 12,   },   cell: {     width: ITEM, height: ITEM,     marginRight: GAP, marginBottom: GAP,     borderRadius: 8, overflow: 'hidden', backgroundColor: '#F5F5F5',   },   image: { width: '100%', height: '100%' },   addCell: {     borderWidth: 1.5, borderColor: '#1F3864', borderStyle: 'dashed',     backgroundColor: '#FFF',     alignItems: 'center', justifyContent: 'center',   },   addPlus:  { fontSize: 28, color: '#1F3864', fontWeight: '300' },   addLabel: { fontSize: 11, color: '#1F3864', marginTop: 2 }, }); |
| --- |

| **💡 baseUrl이 왜 필요한가요?** **백엔드가 반환하는 file_path는 ‘site-photos/photo_xxx.jpg’ 같은 상대 경로예요. 모바일이 실제 이미지를 가져오려면 ‘http://10.0.2.2:8000/storage/site-photos/photo_xxx.jpg’ 같은 전체 URL이 필요해요. baseUrl(앞부분)을 prop으로 받아서 file_path와 합쳐주는 구조입니다. 안드로이드 에뮬레이터에서 호스트 PC의 localhost를 가리키는 IP가 10.0.2.2예요(아이폰 시뮬레이터에선 localhost를 그대로 씀).** |
| --- |

# **6. ScheduleDetailScreen 사진 섹션 교체**

이제 두 컴포넌트를 일정 상세 화면에 통합합니다. 기존 v10.2.1의 단순 사진 업로드 부분을 카테고리 기반으로 교체해요.

파일 위치: app/src/screens/ScheduleDetailScreen.tsx

## **6.1 import 영역 추가**

| // 기존 import 아래에 추가 import { launchImageLibrary, launchCamera } from 'react-native-image-picker'; import PhotoCategoryTabs from '../components/PhotoCategoryTabs'; import PhotoGrid from '../components/PhotoGrid'; import {   getSchedulePhotos, uploadSchedulePhoto, deleteSchedulePhoto, } from '../api/schedulesApi'; import { PhotoCategory, PhotoListResponse, SiteFile } from '../types/api'; import Config from 'react-native-config'; |
| --- |

## **6.2 state 추가**

화면이 기억해야 할 데이터를 useState로 추가합니다.

| const [photoData, setPhotoData] = useState<PhotoListResponse │ null>(null); const [currentCategory, setCurrentCategory] = useState<PhotoCategory>('before'); const [photoLoading, setPhotoLoading] = useState(false); // 사진 표시용 baseUrl (10.0.2.2 또는 실기기 IP) const PHOTO_BASE = (Config.API_BASE_URL ?? 'http://10.0.2.2:8000') + '/storage/'; |
| --- |

## **6.3 사진 데이터 가져오기 — fetchPhotos 함수**

| const fetchPhotos = async () => {   if (!id) return;   try {     const data = await getSchedulePhotos(id);     setPhotoData(data);   } catch (e) {     console.warn('사진 목록 로드 실패', e);   } }; // useEffect 또는 useFocusEffect 안에서 호출 (기존 fetchDetail 옆에) useEffect(() => {   if (id) fetchPhotos(); }, [id]); |
| --- |

## **6.4 사진 업로드 — handleAddPhoto 함수**

‘+추가’ 버튼을 누르면 ‘카메라/갤러리’ 중 어디서 가져올지 묻고, 선택된 사진을 현재 카테고리로 업로드합니다.

| const handleAddPhoto = () => {   Alert.alert(     '사진 추가',     `${categoryLabel(currentCategory)} 사진을 어디서 가져올까요?`,     [       { text: '취소', style: 'cancel' },       { text: '카메라', onPress: () => pickFromCamera() },       { text: '갤러리', onPress: () => pickFromGallery() },     ],   ); }; // 카테고리 한글 라벨 const categoryLabel = (c: PhotoCategory): string => {   return ({ before:'시공 전', during:'시공 중', after:'시공 후', other:'기타' })[c]; }; const pickFromGallery = async () => {   const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });   if (result.didCancel ││ !result.assets?.[0]) return;   await uploadAndRefresh(result.assets[0]); }; const pickFromCamera = async () => {   const result = await launchCamera({     mediaType: 'photo', quality: 0.8, saveToPhotos: false,   });   if (result.didCancel ││ !result.assets?.[0]) return;   await uploadAndRefresh(result.assets[0]); }; const uploadAndRefresh = async (asset: any) => {   setPhotoLoading(true);   try {     await uploadSchedulePhoto(       id,       {         uri:  asset.uri,         name: asset.fileName ?? `photo_${Date.now()}.jpg`,         type: asset.type     ?? 'image/jpeg',       },       currentCategory,     );     await fetchPhotos(); // 업로드 후 목록 갱신   } catch (e: any) {     Alert.alert('업로드 실패', e?.response?.data?.message ?? '다시 시도해주세요.');   } finally {     setPhotoLoading(false);   } }; |
| --- |

## **6.5 사진 삭제 — handleDeletePhoto 함수**

| const handleDeletePhoto = async (photo: SiteFile) => {   try {     await deleteSchedulePhoto(id, photo.id);     await fetchPhotos();   } catch (e: any) {     Alert.alert('삭제 실패', e?.response?.data?.message ?? '다시 시도해주세요.');   } }; |
| --- |

## **6.6 JSX 렌더 — 사진 섹션 교체**

기존 ScheduleDetailScreen에 있던 단순 사진 업로드 박스를 아래 코드로 교체합니다.

| {/* === 사진 섹션 === */} <View style={styles.section}>   <Text style={styles.sectionTitle}>📸 현장 사진</Text>   <PhotoCategoryTabs     current={currentCategory}     counts={photoData?.counts ?? { before:0, during:0, after:0, other:0 }}     onChange={setCurrentCategory}   />   {photoLoading && (     <ActivityIndicator size="small" color="#1F3864" style={{ marginTop: 12 }} />   )}   <PhotoGrid     photos={photoData?.[currentCategory] ?? []}     baseUrl={PHOTO_BASE}     onAdd={handleAddPhoto}     onDelete={handleDeletePhoto}   />   {/* 비교 보기 버튼 — 시공 전/후 사진이 모두 있을 때만 노출 */}   {(photoData?.counts.before ?? 0) > 0 &&    (photoData?.counts.after ?? 0) > 0 && (     <TouchableOpacity       style={styles.compareBtn}       onPress={() => navigation.navigate('PhotoCompare', { scheduleId: id })}     >       <Text style={styles.compareBtnText}>🔄 시공 전 ↔ 시공 후 비교 보기</Text>     </TouchableOpacity>   )} </View> |
| --- |

스타일 추가:

| // styles 객체에 아래 항목들 추가 compareBtn: {   marginHorizontal: 16, marginTop: 12, marginBottom: 8,   paddingVertical: 12, borderRadius: 8,   backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#F5A623',   alignItems: 'center', }, compareBtnText: { color: '#9C5400', fontWeight: '700', fontSize: 14 }, |
| --- |

# **7. PhotoCompareScreen — 비교 보기 화면**

v11의 차별화 포인트 중 하나예요. ‘시공 전 N장’과 ‘시공 후 M장’을 좌우 슬라이드로 비교할 수 있게 해줍니다. 카톡으로 사진을 따로따로 보내는 것과 비교해 ‘질적으로 다른’ 결과물을 만드는 핵심 기능.

## **7.1 신규 화면 파일**

파일 위치: app/src/screens/PhotoCompareScreen.tsx (신규)

| import React, { useEffect, useState } from 'react'; import {   View, Image, Text, StyleSheet, ScrollView, ActivityIndicator,   Dimensions, TouchableOpacity, } from 'react-native'; import { useRoute, useNavigation } from '@react-navigation/native'; import Config from 'react-native-config'; import { getSchedulePhotos } from '../api/schedulesApi'; import { PhotoListResponse } from '../types/api'; const { width } = Dimensions.get('window'); const PHOTO_BASE = (Config.API_BASE_URL ?? 'http://10.0.2.2:8000') + '/storage/'; export default function PhotoCompareScreen() {   const route = useRoute<any>();   const navigation = useNavigation<any>();   const scheduleId = route.params?.scheduleId as number;   const [data, setData] = useState<PhotoListResponse │ null>(null);   const [loading, setLoading] = useState(true);   const [index, setIndex] = useState(0); // 현재 보고 있는 페어 인덱스   useEffect(() => {     (async () => {       try {         const r = await getSchedulePhotos(scheduleId);         setData(r);       } finally {         setLoading(false);       }     })();   }, [scheduleId]);   if (loading) return (     <View style={styles.center}>       <ActivityIndicator size="large" color="#1F3864" />     </View>   );   const before = data?.before ?? [];   const after  = data?.after  ?? [];   // 페어 개수 = 두 배열 중 짧은 쪽 길이   const pairCount = Math.min(before.length, after.length);   if (pairCount === 0) {     return (       <View style={styles.center}>         <Text style={styles.emptyText}>           비교 가능한 ‘시공 전 / 시공 후’ 사진이 부족해요.         </Text>       </View>     );   }   const safeIdx = Math.min(index, pairCount - 1);   const beforePhoto = before[safeIdx];   const afterPhoto  = after[safeIdx];   return (     <ScrollView style={styles.container}>       <Text style={styles.title}>🔄 시공 전 / 시공 후 비교</Text>       <Text style={styles.counter}>{safeIdx + 1} / {pairCount}</Text>       <View style={styles.imageBox}>         <Text style={styles.label}>시공 전</Text>         <Image source={{ uri: PHOTO_BASE + beforePhoto.file_path }}           style={styles.image} resizeMode="cover" />       </View>       <View style={styles.imageBox}>         <Text style={[styles.label, { color: '#385723' }]}>시공 후</Text>         <Image source={{ uri: PHOTO_BASE + afterPhoto.file_path }}           style={styles.image} resizeMode="cover" />       </View>       {/* 페어 네비게이션 */}       <View style={styles.navRow}>         <TouchableOpacity           style={[styles.navBtn, safeIdx === 0 && styles.navBtnDisabled]}           onPress={() => setIndex(Math.max(0, safeIdx - 1))}           disabled={safeIdx === 0}         >           <Text style={styles.navBtnText}>◀ 이전</Text>         </TouchableOpacity>         <TouchableOpacity           style={[styles.navBtn, safeIdx === pairCount - 1 && styles.navBtnDisabled]}           onPress={() => setIndex(Math.min(pairCount - 1, safeIdx + 1))}           disabled={safeIdx === pairCount - 1}         >           <Text style={styles.navBtnText}>다음 ▶</Text>         </TouchableOpacity>       </View>     </ScrollView>   ); } const styles = StyleSheet.create({   container: { flex: 1, backgroundColor: '#FAFAFA' },   center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },   title:     { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 16, color: '#1F3864' },   counter:   { fontSize: 12, textAlign: 'center', color: '#888', marginTop: 4 },   imageBox:  { marginVertical: 12, paddingHorizontal: 16 },   label:     { fontSize: 13, fontWeight: '600', color: '#C00000', marginBottom: 6 },   image:     { width: width - 32, height: (width - 32) * 0.75, borderRadius: 8 },   navRow:    { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },   navBtn:    {     paddingVertical: 12, paddingHorizontal: 24,     borderRadius: 8, backgroundColor: '#1F3864',   },   navBtnDisabled: { backgroundColor: '#CCC' },   navBtnText:     { color: '#FFF', fontWeight: '700' },   emptyText:      { fontSize: 14, color: '#888', paddingHorizontal: 32, textAlign: 'center' }, }); |
| --- |

## **7.2 AppNavigator에 라우트 등록**

파일 위치: app/src/navigation/AppNavigator.tsx

| import PhotoCompareScreen from '../screens/PhotoCompareScreen'; // Stack.Navigator 내부, ScheduleDetail 다음에 추가 <Stack.Screen   name="PhotoCompare"   component={PhotoCompareScreen}   options={{ title: '사진 비교' }} /> |
| --- |

# **8. 테스트 — 백엔드 + 모바일 통합**

## **8.1 Thunder Client — 백엔드 단독 검증**

VSCode의 Thunder Client(또는 Postman)로 백엔드 API가 정상 동작하는지 먼저 확인합니다. 모바일까지 묶어서 테스트하면 어디서 문제가 생긴 건지 찾기 어렵거든요.

### **8.1.1 사전 준비**

- Laravel 서버 실행: php artisan serve (포트 8000)

- Sanctum 토큰 확보: POST /api/auth/login 으로 manager@test.com 로그인 → 토큰 복사

- 이후 모든 요청 헤더에 Authorization: Bearer {토큰}

### **8.1.2 단계별 검증 시나리오**

| **#** | **요청** | **기대 결과** |
| --- | --- | --- |
| 1 | GET /api/schedules/1/photos | 200 + before/during/after/other 4개 배열 (모두 빈 배열 가능) + counts 객체 |
| 2 | POST /api/schedules/1/photos Form: photo=<파일>, photo_category=before | 200 + photo_category='before', sort_order=0인 SiteFile 반환 |
| 3 | POST /api/schedules/1/photos Form: photo=<파일>, photo_category=before | 200 + sort_order=1 (이전 사진 다음 순서) |
| 4 | POST /api/schedules/1/photos Form: photo=<파일>, photo_category=after | 200 + photo_category='after', sort_order=0 |
| 5 | GET /api/schedules/1/photos | before 배열 길이 2, after 배열 길이 1, counts.before=2, counts.after=1 |
| 6 | POST /api/schedules/1/photos Form: photo_category=invalid | 422 + ‘photo_category 필드 형식이 잘못되었습니다’ |
| 7 | DELETE /api/schedules/1/photos/{photoId} | 200 + 성공. GET 재조회 시 해당 사진 안 보임 |
| 8 | MySQL Workbench로 site_files 테이블 직접 조회 | 삭제한 사진의 deleted_at에 시각이 채워져 있음 (SoftDelete 정상) |

## **8.2 안드로이드 에뮬레이터 통합 테스트**

| **#** | **동작** | **기대 결과** |
| --- | --- | --- |
| 1 | 캘린더에서 일정 탭 → 상세 진입 | 사진 섹션이 보이고 ‘시공 전’ 탭이 기본 선택됨 |
| 2 | ‘+추가’ 탭 → ‘갤러리’ 선택 → 사진 1장 선택 | 업로드 후 시공 전 그리드에 사진 1장 표시, 카운트 1로 갱신 |
| 3 | ‘시공 중’ 탭 클릭 | 그리드가 비어있고 ‘+추가’만 보임 |
| 4 | ‘+추가’ → ‘카메라’ → 촬영 → 저장 | (권한 팝업 1회) 시공 중에 사진 추가됨 |
| 5 | ‘시공 후’ 탭에 사진 1장 추가 | after 카운트 1, 비교 보기 버튼이 화면에 노출됨 |
| 6 | 사진을 길게 누름 → ‘삭제’ 선택 | Alert 확인 → 그리드에서 사라지고 카운트 감소 |
| 7 | ‘🔄 비교 보기’ 버튼 탭 | PhotoCompareScreen으로 이동, ‘시공 전 / 시공 후’ 한 페어가 위아래로 표시 |
| 8 | ‘다음 ▶’ 버튼 탭 (페어가 여러 개일 때) | 다음 페어로 전환됨 |
| 9 | 안드로이드 뒤로가기 → 일정 상세 복귀 | 그리드 상태 유지 |

# **9. 시행착오 / 주의사항 — 미리 알아두면 좋은 함정**

## **9.1 [예상 함정 1] 안드로이드 카메라 권한이 첫 시도에 거부됨**

증상: ‘+추가 → 카메라’ 선택 시 카메라 화면이 안 뜨고 바로 닫힘.

원인: AndroidManifest.xml에 권한을 추가했어도, 안드로이드 6.0 이상은 사용자가 런타임에 허용해야 함.

해결: PermissionsAndroid를 사용해 권한 요청을 직접 처리:

| import { PermissionsAndroid, Platform } from 'react-native'; const requestCameraPermission = async (): Promise<boolean> => {   if (Platform.OS !== 'android') return true;   const result = await PermissionsAndroid.request(     PermissionsAndroid.PERMISSIONS.CAMERA,     {       title: '카메라 권한',       message: '사진을 촬영하려면 카메라 접근 권한이 필요해요.',       buttonPositive: '허용',     },   );   return result === PermissionsAndroid.RESULTS.GRANTED; }; // pickFromCamera 시작 부분에 호출 const pickFromCamera = async () => {   const ok = await requestCameraPermission();   if (!ok) {     Alert.alert('권한 필요', '카메라 권한이 거부되어 사진을 찍을 수 없어요.');     return;   }   const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });   // ... }; |
| --- |

## **9.2 [예상 함정 2] 업로드한 이미지가 안 보임 (404)**

증상: 업로드는 성공했는데 PhotoGrid에서 이미지가 깨져 보임. console에 ‘404 Not Found’.

| **원인 후보** | **확인 방법** | **해결** |
| --- | --- | --- |
| storage:link 미실행 | backend/public/ 안에 storage 폴더가 있는지 | php artisan storage:link 실행 |
| baseUrl 설정 오류 | console.log(PHOTO_BASE) 확인 | 10.0.2.2:8000 (에뮬), 실기기는 PC IP |
| Laravel APP_URL 설정 | .env의 APP_URL 확인 | APP_URL=http://10.0.2.2:8000 (또는 LAN IP) |
| Apache/Laragon 미실행 | 브라우저로 직접 URL 열어보기 | php artisan serve 실행 확인 |

## **9.3 [예상 함정 3] FormData 헤더 충돌**

증상: 업로드 시 422 ‘photo 필드는 이미지여야 합니다.’ 에러. 파일은 정상인데.

원인: axios 인스턴스가 기본으로 ‘Content-Type: application/json’을 헤더에 박아놓아서, FormData가 multipart로 전환되지 않음.

해결: 우리 uploadSchedulePhoto에서 이미 헤더를 명시적으로 multipart/form-data로 덮어쓰고 있으니 OK. 다만 axiosInstance.ts에서 글로벌 헤더를 강제하지 않는지 다시 한 번 확인:

| // ❌ 하지 말 것 — 글로벌 강제 헤더 axiosInstance.defaults.headers.common['Content-Type'] = 'application/json'; // ✅ 권장 — 인터셉터에서 FormData면 건드리지 않기 axiosInstance.interceptors.request.use((config) => {   if (config.data instanceof FormData) {     delete config.headers['Content-Type'];  // FormData가 자동 설정하도록 양보   }   return config; }); |
| --- |

## **9.4 [예상 함정 4] 비교 보기에서 사진 페어가 안 맞음**

증상: ‘시공 전 5장, 시공 후 3장’일 때 비교 보기가 어떻게 동작해야 하나?

우리 정책: 두 배열 중 짧은 쪽 길이만큼만 페어를 만듭니다(min 사용). 기획서 v2.3 기준으로는 ‘1번 시공 전 ↔ 1번 시공 후’ 식으로 단순 인덱스 매칭. 미래에 ‘같은 위치 사진끼리 페어링’ 같은 고급 기능이 필요하면 description 컬럼에 ‘거실 북쪽 벽’ 같은 라벨을 넣고 매칭하는 방식으로 확장 가능.

## **9.5 [예상 함정 5] 사진 용량이 너무 커서 업로드 실패**

증상: 큰 사진(8MB+) 업로드 시 413 Payload Too Large 또는 타임아웃.

| **계층** | **설정** | **권장 값** |
| --- | --- | --- |
| RN 클라이언트 | launchImageLibrary({ quality: 0.8 }) | 0.7~0.8 (자동 압축) |
| Laravel validate | max:10240 (KB 단위) | 10240 = 10MB |
| PHP 설정 (php.ini) | upload_max_filesize, post_max_size | 10M 이상 |
| Apache/Nginx | client_max_body_size | 10M 이상 |

Laragon 사용 시 php.ini 위치: C:\laragon\bin\php\php-8.3.x\php.ini

# **10. 최종 점검 체크리스트**

## **10.1 백엔드**

| **#** | **항목** | **확인 방법** | **완료** |
| --- | --- | --- | --- |
| 1 | site_files 테이블에 photo_category 컬럼 존재 | MySQL Workbench Columns 탭 | ☐ |
| 2 | SiteFile 모델 fillable에 3개 신규 컬럼 | Models/SiteFile.php 직접 확인 | ☐ |
| 3 | SiteFile 모델 scopeOfCategory 메서드 | Models/SiteFile.php 직접 확인 | ☐ |
| 4 | ScheduleController uploadPhoto 카테고리 받음 | Thunder Client 시나리오 #2 통과 | ☐ |
| 5 | ScheduleController listPhotos 그룹핑 응답 | Thunder Client 시나리오 #5 통과 | ☐ |
| 6 | ScheduleController deletePhoto SoftDelete | Thunder Client 시나리오 #8 통과 | ☐ |
| 7 | 라우트 3개 등록 | php artisan route:list | ☐ |
| 8 | storage:link 실행 완료 | public/storage/ 폴더 존재 | ☐ |

## **10.2 모바일**

| **#** | **항목** | **확인 방법** | **완료** |
| --- | --- | --- | --- |
| 1 | AndroidManifest.xml 카메라 권한 추가 | 파일 직접 열어보기 | ☐ |
| 2 | types/api.ts SiteFile 확장 + PhotoListResponse | tsc 빌드 에러 없음 | ☐ |
| 3 | schedulesApi.ts 3개 함수 추가 | import 시 자동완성 작동 | ☐ |
| 4 | PhotoCategoryTabs.tsx 컴포넌트 생성 | 파일 존재 + 4탭 렌더 | ☐ |
| 5 | PhotoGrid.tsx 컴포넌트 생성 | 파일 존재 + 그리드 렌더 | ☐ |
| 6 | PhotoCompareScreen.tsx 화면 생성 | 파일 존재 | ☐ |
| 7 | AppNavigator에 PhotoCompare 라우트 등록 | Navigator 파일 확인 | ☐ |
| 8 | ScheduleDetailScreen 사진 섹션 교체 완료 | 에뮬에서 4탭 + 그리드 보임 | ☐ |
| 9 | 갤러리에서 사진 업로드 성공 | 에뮬 시나리오 #2 통과 | ☐ |
| 10 | 카메라 촬영 후 사진 업로드 성공 | 에뮬 시나리오 #4 통과 | ☐ |
| 11 | 사진 길게 눌러 삭제 | 에뮬 시나리오 #6 통과 | ☐ |
| 12 | 비교 보기 화면 정상 동작 | 에뮬 시나리오 #7~8 통과 | ☐ |

## **10.3 통합**

| **#** | **항목** | **완료** |
| --- | --- | --- |
| 1 | 에뮬에서 사진 업로드 → 다른 일정 상세도 정상 동작 확인 | ☐ |
| 2 | 사진을 5~6장 올린 후 화면이 느려지지 않는지 | ☐ |
| 3 | Wi-Fi 끊기 → 업로드 시 에러 메시지 정상 표시 | ☐ |
| 4 | Git 커밋 + push 완료 | ☐ |

# **11. Git 커밋**

v11 작업 완료 후 한 번에 커밋합니다.

| cd C:\project\team-schedule git add . git status # 커밋 메시지 git commit -m "feat(v11): 현장 사진 구조화 (시공 전/중/후 카테고리) 백엔드: - SiteFile 모델: fillable에 photo_category, description, sort_order 추가 - SiteFile 모델: scopeOfCategory 추가 - ScheduleController: uploadPhoto 카테고리 지원 (validate in:before,during,after,other) - ScheduleController: listPhotos 신규 (4개 카테고리 그룹핑 + counts) - ScheduleController: deletePhoto 신규 (SoftDelete) - routes/api.php: 사진 관련 3개 라우트 등록 모바일: - AndroidManifest.xml: CAMERA + READ_MEDIA_IMAGES 권한 추가 - types/api.ts: PhotoCategory, PhotoListResponse 신규 - schedulesApi.ts: get/upload/delete Photo 3개 함수 추가 - PhotoCategoryTabs.tsx 신규: 4개 카테고리 탭 + 카운트 뱃지 - PhotoGrid.tsx 신규: 사진 그리드 + 길게 눌러 삭제 - ScheduleDetailScreen: 사진 섹션 카테고리 기반으로 교체 - PhotoCompareScreen.tsx 신규: 시공 전/후 페어 비교 화면 - AppNavigator: PhotoCompare 라우트 등록 기획서 v2.3 적용: 현장 사진 구조화 = 1순위 차별화 기능" git push origin main |
| --- |

# **12. 다음 단계 (v12 예고) — 자동 보고서 1단계**

v11에서 카테고리별로 사진을 구조화했으니, v12에서는 이 사진들을 재료로 ‘자동 보고서’를 만듭니다. 기획서 v2.3 로드맵 2순위(출시 직전 필수) 기능이에요.

| **v12 작업** | **목적** |
| --- | --- |
| site_reports 테이블 마이그레이션 점검 (v9.0 완료 사항) | 보고서 메타데이터 저장 |
| DomPDF 라이브러리 설치 (composer require barryvdh/laravel-dompdf) | PHP에서 PDF 생성 |
| 보고서 HTML 템플릿 작성 (resources/views/reports/basic.blade.php) | 표지 + 시공 개요 + 사진 + 인사말 |
| SiteReportController 신규 (CRUD + PDF 생성) | 보고서 데이터 관리 |
| 모바일 — 일정 상세에 ‘보고서 생성’ 버튼 | 사진 + 공수 데이터를 한 번에 묶어 PDF 호출 |
| 보고서 미리보기 화면 (모바일 WebView) | 고객 전송 전 검토 |

| **💡 v12 우선순위 제안** **1순위: 기본 템플릿 1종으로 PDF 생성 — 출시 직전 필수** **2순위: 모바일 미리보기 — 고객 전달 전 검토용** **3순위: PDF 다운로드 + 카카오톡 공유 (RN Share API)** **4순위: 공유 URL + 열람 추적 (v13으로 분리 권장)** |
| --- |

## **12.1 v11 → v12 데이터 흐름 미리보기**

| v10.3까지: 일정 + 공수 + 단가 데이터     + v11에서: 시공 전/중/후 사진 (카테고리별)     ↓ v12에서: 두 데이터를 묶어서 PDF 보고서 자동 생성     ↓ v13에서: 공유 URL로 고객 전달 + 열람 추적     ↓ (출시) → 사용자가 ‘카톡에 사진 보내기’ 대신 ‘보고서 링크 보내기’를 쓰게 됨 |
| --- |

# **변경 이력**

| **버전** | **날짜** | **변경 내용** |
| --- | --- | --- |
| **v11.0** | **2026-04-26** | ★ 최초 작성. 기획서 v2.3 적용 후 첫 매뉴얼. v10.3 예고와 달리 ‘근태 자동 집계’가 아닌 ‘현장 사진 구조화’로 주제 변경. (1) 백엔드: SiteFile 모델 fillable + scopeOfCategory 추가, ScheduleController에 uploadPhoto/listPhotos/deletePhoto 3개 메서드 + 라우트 등록. (2) 모바일: AndroidManifest 카메라 권한, types/api.ts PhotoCategory + PhotoListResponse 신규, schedulesApi.ts 3개 함수, PhotoCategoryTabs/PhotoGrid 컴포넌트 신규, PhotoCompareScreen 신규, ScheduleDetailScreen 사진 섹션 교체. (3) 시행착오 5건 미리 정리: 카메라 권한 런타임 요청, 이미지 404 디버깅, FormData 헤더 충돌, 비교 보기 페어 매칭, 파일 용량 4계층 설정. |

*— v11 매뉴얼 — 현장 사진 구조화 완성 —*

*다음: v12 — 자동 보고서 생성 1단계 (PDF)*

© 2026 Team Schedule Manager

© 2026 Team Schedule Manager  |  Page  /