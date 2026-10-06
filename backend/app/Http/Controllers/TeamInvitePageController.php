<?php

namespace App\Http\Controllers;

use App\Models\Team;

/**
 * ★ v18.43 — 팀 초대 링크 웹페이지 (/join/{코드}).
 *   카톡·문자로 받은 링크를 누르면 열림 → 앱이 있으면 "앱에서 열기"로 바로 참여 화면, 없으면 설치 안내.
 *   앱 설치 없이도 열려야 해서 web.php에 둠(명함 페이지와 같은 방식).
 */
class TeamInvitePageController extends Controller
{
    public function show(string $code)
    {
        $team = Team::where('invite_code', strtoupper($code))->first();

        return response()->view('invite.show', [
            'team'        => $team,
            'code'        => strtoupper($code),
            'memberCount' => $team ? $team->members()->count() : 0,
            'appLink'     => 'workmate://join/' . strtoupper($code),
            'downloadUrl' => url('/download/latest'),
        ], $team ? 200 : 404);
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
}
