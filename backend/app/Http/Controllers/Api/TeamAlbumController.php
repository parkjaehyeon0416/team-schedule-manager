<?php

namespace App\Http\Controllers\Api;

use App\Constants\ErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Team;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.47 — 팀 현장 앨범 (팀 요금제, 팀원 누구나 보기)
 *   팀원들이 일정·현장에 올린 사진을 현장별로 모아 보여줌. 사진 자체는 기존 site_files(현장 사진).
 */
class TeamAlbumController extends Controller
{
    // GET /teams/{id}/album — 사진이 있는 팀 현장 목록(최근 사진 순)
    public function index(Request $request, string $id)
    {
        [$team, $err] = $this->authorizeTeam($request, $id);
        if ($err) {
            return $err;
        }

        $sites = DB::table('sites')
            ->join('site_files', 'site_files.site_id', '=', 'sites.id')
            ->where('sites.team_id', $team->id)
            ->whereNull('sites.deleted_at')
            ->whereNull('site_files.deleted_at')
            ->where('site_files.file_type', 'photo')
            ->groupBy('sites.id', 'sites.apt_name', 'sites.address', 'sites.dong', 'sites.ho', 'sites.status')
            ->orderByDesc(DB::raw('MAX(site_files.created_at)'))
            ->get([
                'sites.id', 'sites.apt_name', 'sites.address', 'sites.dong', 'sites.ho', 'sites.status',
                DB::raw('COUNT(site_files.id) as photo_count'),
                DB::raw("SUM(site_files.photo_category = 'before') as before_count"),
                DB::raw("SUM(site_files.photo_category = 'after') as after_count"),
                DB::raw('MAX(site_files.created_at) as last_uploaded_at'),
            ]);

        // 현장마다 미리보기 사진 4장 — ★ v18.48 디자인(TEAM_ALBUM)대로 시공 전 2장 + 시공 후 2장을 우선,
        //   모자라면 다른 사진으로 채움. 사진마다 단계(전/중/후/기타) 표시
        $previews = DB::table('site_files')
            ->whereIn('site_id', $sites->pluck('id'))
            ->whereNull('deleted_at')->where('file_type', 'photo')
            ->orderByDesc('created_at')
            ->get(['id', 'site_id', 'file_path', 'photo_category'])
            ->groupBy('site_id')
            ->map(function ($g) {
                $pick = $g->where('photo_category', 'before')->take(2)->concat($g->where('photo_category', 'after')->take(2));
                $pick = $pick->concat($g->whereNotIn('id', $pick->pluck('id'))->take(4 - $pick->count()));
                $order = ['before' => 0, 'during' => 1, 'after' => 2, 'other' => 3];
                return $pick->sortBy(fn($f) => $order[$f->photo_category] ?? 9)
                    ->map(fn($f) => ['url' => '/storage/' . $f->file_path, 'category' => $f->photo_category])->values();
            });

        return ApiResponse::success([
            'team_id'     => $team->id,
            'team_name'   => $team->name,
            'site_count'  => $sites->count(),
            'photo_count' => (int) $sites->sum('photo_count'),
            'sites'   => $sites->map(fn($s) => [
                'id'               => $s->id,
                'name'             => $s->apt_name ?: $s->address,
                'address'          => trim(implode(' ', array_filter([$s->address, $s->dong ? "{$s->dong}동" : null, $s->ho ? "{$s->ho}호" : null]))),
                'status'           => $s->status,
                'photo_count'      => (int) $s->photo_count,
                'before_count'     => (int) $s->before_count,
                'after_count'      => (int) $s->after_count,
                'last_uploaded_at' => $s->last_uploaded_at,
                'previews'         => $previews->get($s->id, collect()),
            ])->values(),
        ], '팀 현장 앨범 조회 성공');
    }

    // GET /teams/{id}/album/photos?site_id=&category=before|during|after|other&uploader=&page=
    public function photos(Request $request, string $id)
    {
        [$team, $err] = $this->authorizeTeam($request, $id);
        if ($err) {
            return $err;
        }

        $query = DB::table('site_files')
            ->join('sites', 'sites.id', '=', 'site_files.site_id')
            ->leftJoin('users', 'users.id', '=', 'site_files.uploaded_by')
            ->where('sites.team_id', $team->id)
            ->whereNull('sites.deleted_at')
            ->whereNull('site_files.deleted_at')
            ->where('site_files.file_type', 'photo')
            ->when($request->query('site_id'), fn($q, $v) => $q->where('sites.id', (int) $v))
            ->when(in_array($request->query('category'), ['before', 'during', 'after', 'other'], true),
                fn($q) => $q->where('site_files.photo_category', $request->query('category')))
            ->when($request->query('uploader'), fn($q, $v) => $q->where('site_files.uploaded_by', (int) $v))
            ->orderByDesc('site_files.created_at')
            ->select([
                'site_files.id', 'site_files.file_path', 'site_files.photo_category', 'site_files.description', 'site_files.created_at',
                'site_files.paired_with_id', 'sites.id as site_id', 'sites.apt_name', 'sites.address', 'users.id as uploader_id', 'users.name as uploader_name',
                'users.avatar_color as uploader_color', 'users.avatar_image_path as uploader_avatar',
            ]);

        $page = $query->paginate(60);

        // ★ v18.48 — "올린 사람" 필터 칩용: 이 현장(또는 팀 전체)에 사진을 올린 사람 목록
        $uploaders = DB::table('site_files')
            ->join('sites', 'sites.id', '=', 'site_files.site_id')
            ->join('users', 'users.id', '=', 'site_files.uploaded_by')
            ->where('sites.team_id', $team->id)->whereNull('site_files.deleted_at')->where('site_files.file_type', 'photo')
            ->when($request->query('site_id'), fn($q, $v) => $q->where('sites.id', (int) $v))
            ->groupBy('users.id', 'users.name')
            ->orderByRaw('COUNT(*) DESC')
            ->get(['users.id', 'users.name']);

        $site = $request->query('site_id')
            ? DB::table('sites')->where('team_id', $team->id)->find((int) $request->query('site_id'), ['id', 'apt_name', 'address', 'dong', 'ho'])
            : null;

        return ApiResponse::success([
            'site'      => $site ? [
                'id' => $site->id, 'name' => $site->apt_name ?: $site->address,
                'address' => trim(implode(' ', array_filter([$site->address, $site->dong ? "{$site->dong}동" : null, $site->ho ? "{$site->ho}호" : null]))),
                'can_upload' => \App\Models\Site::find($site->id)?->canEditBy($request->user()) ?? false,
            ] : null,
            'uploaders' => $uploaders,
            'items' => collect($page->items())->map(fn($p) => [
                'id'             => $p->id,
                'url'            => '/storage/' . $p->file_path,
                'category'       => $p->photo_category,
                'description'    => $p->description,
                'paired_with_id' => $p->paired_with_id,
                'site'           => ['id' => $p->site_id, 'name' => $p->apt_name ?: $p->address],
                'uploader'       => $p->uploader_id ? ['id' => $p->uploader_id, 'name' => $p->uploader_name,
                    'avatar_color' => $p->uploader_color, 'avatar_image_path' => $p->uploader_avatar] : null,
                'created_at'     => $p->created_at,
            ]),
            'page'  => $page->currentPage(),
            'pages' => $page->lastPage(),
            'total' => $page->total(),
        ], '팀 앨범 사진 조회 성공');
    }

    private function authorizeTeam(Request $request, string $id): array
    {
        $user = $request->user();
        $team = Team::when($user->role_id !== 1, fn($q) => $q->whereIn('id', $user->teamIds()))->find($id);
        if (!$team) {
            return [null, ApiResponse::error('존재하지 않는 팀입니다.', ErrorCode::TEAM_NOT_FOUND, 404)];
        }
        if (!PlanService::teamCan($team->id, 'team_album')) {
            return [null, PlanService::denied('team_album', PlanService::upgradeMessage('team_album'))];
        }
        return [$team, null];
    }
}
