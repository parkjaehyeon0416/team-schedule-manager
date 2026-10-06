<?php

namespace App\Http\Controllers;

use App\Models\Notice;

/**
 * ★ v18.43 — 문자 속 공지·이벤트 바로가기 (/n/{id}).
 *   앱이 있으면 "앱에서 보기"로 해당 공지·이벤트 화면, 없으면 이 페이지에서 내용을 바로 보여줌.
 */
class NoticePageController extends Controller
{
    public function show(int $id)
    {
        $notice = Notice::published()->find($id);
        if (!$notice) {
            abort(404);
        }

        return view('notice.show', [
            'notice' => $notice,
        ] + TeamInvitePageController::storeLinks('workmate://' . ($notice->type === 'event' ? 'event' : 'notice') . '/' . $notice->id));
    }
}
