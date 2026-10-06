<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Support\Facades\DB;

/**
 * ★ v18.43 — 팀 초대 링크 웹페이지 (/join/{코드}, 디자인 WEB_INVITE).
 *   카톡·문자로 받은 링크를 누르면 열림 → 앱이 있으면 "앱에서 열기"로 바로 참여 화면, 없으면 설치 안내.
 *   앱 설치 없이도 열려야 해서 web.php에 둠(명함 페이지와 같은 방식). 만료된 코드는 만료 안내.
 */
class TeamInvitePageController extends Controller
{
    public function show(string $code)
    {
        $team = Team::findByValidInvite($code);

        $inviter = $team ? DB::table('team_members')
            ->join('users', 'users.id', '=', 'team_members.user_id')
            ->where('team_members.team_id', $team->id)
            ->where('team_members.role_id', '<=', 2)
            ->whereNull('team_members.deleted_at')
            ->orderBy('team_members.joined_at')
            ->value('users.name') : null;

        return response()->view('invite.show', [
            'team'        => $team,
            'code'        => strtoupper($code),
            'inviter'     => $inviter,
            'memberCount' => $team ? $team->members()->count() : 0,
        ] + self::storeLinks('workmate://join/' . strtoupper($code)), $team ? 200 : 404);
    }

    // 가장 최근에 올린 APK로 연결 (파일 이름에 버전이 붙어 있어서 링크가 바뀌지 않게)
    public function latestApk()
    {
        $files = glob(public_path('download/*.apk')) ?: [];
        if (!$files) {
            abort(404);
        }
        usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));

        return redirect('/download/' . basename($files[0]));
    }

    public static function storeLinks(string $appLink): array
    {
        return [
            'appLink'      => $appLink,
            'appStoreUrl'  => config('workmate.app_store_url'),
            'playStoreUrl' => config('workmate.play_store_url'),
            'androidUrl'   => config('workmate.play_store_url') ?: url('/download/latest'),
        ];
    }
}
